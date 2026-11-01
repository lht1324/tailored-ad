import { Hono } from "hono";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { getBaseResponse } from "@/lib/utils/getBaseResponse";
import { startBatchPipeline } from "@/lib/workflows/batchPipelineClient";
import type { AdPipelineStartRequest, AdRatioKey } from "@shared/types/supabase/ad/AdGenerationBatch";
import type { AppEnv } from "../env";
import type { AuthVariables } from "../middleware/auth";

/**
 * 생성 시작 — `POST /api/image`
 *
 * ## 이 라우트의 역할 (10-31 이후)
 * **문**이다. 검증 → 배치 생성 → 원본 업로드 → **워크플로 시작** → 즉시 응답.
 * 예전에는 마지막에 `internalFireAndForgetFetch`로 다음 라우트를 HTTP로 불렀지만,
 * 이제 순서는 `BatchPipeline`(워크플로)이 소유한다. 여기서 끝난다.
 *
 * multipart 1요청으로 주문(payload)과 원본을 함께 받는다 — 그래야 prompt 단계가
 * Storage를 읽을 때 파일 존재가 보장된다(경합 원천 제거).
 */
const imageRoutes = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

/** 클라이언트 표기('1:1') → 저장 키('1_1') 정규화 맵 */
const CLIENT_RATIO_TO_KEY: Record<string, AdRatioKey> = {
    "1:1": "1_1",
    "4:5": "4_5",
    "9:16": "9_16",
    "16:9": "16_9",
    "2:3": "2_3",
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getExtensionFromFile(file: File): string {
    const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpeg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const fromMime = mimeToExt[file.type];
    if (fromMime) return fromMime;

    const fromName = file.name.split(".").pop()?.toLowerCase();
    if (fromName === "jpg") return "jpeg";
    if (fromName && ["jpeg", "png", "webp"].includes(fromName)) return fromName;
    return "png";
}

imageRoutes.post("/image", async (context) => {
    const userId = context.get("user").id;

    // 잔액 가드 — 남은 장수가 없으면 진입 차단 (402)
    // 유료(부여 이력 있음)는 누적 잔액제, 그 외는 KST 달력월제.
    try {
        const owner = await usersServerAPI.getUserByUserId(userId);
        if (owner) {
            const usage = await usageServerAPI.getUsageStatus(owner);
            if (usage.remaining <= 0) {
                return getBaseResponse({ success: false, status: 402, error: "Image balance exhausted." });
            }
        }
    } catch (quotaError) {
        console.error(`[quota] check failed (user=${userId}) — fail-open:`, quotaError);
    }

    try {
        const formData = await context.req.formData();
        const rawPayload = formData.get("payload");
        if (typeof rawPayload !== "string") {
            return getBaseResponse({
                success: false,
                status: 400,
                error: "Missing multipart field: payload (JSON string).",
            });
        }

        let body: AdPipelineStartRequest;
        try {
            body = JSON.parse(rawPayload) as AdPipelineStartRequest;
        } catch {
            return getBaseResponse({ success: false, status: 400, error: "Invalid payload JSON." });
        }

        // 원본 파일 수집 + 검증 (batch 생성 전에 — 실패 시 고아 batch 방지)
        const files: Partial<Record<"product" | "person" | "brand_logo", File>> = {};
        for (const key of ["product", "person", "brand_logo"] as const) {
            const file = formData.get(key);
            if (!file || !(file instanceof File) || file.size === 0) continue;
            if (!ALLOWED_TYPES.has(file.type)) {
                return getBaseResponse({ success: false, status: 400, error: `${key} must be JPG, PNG, or WebP.` });
            }
            if (file.size > MAX_FILE_SIZE) {
                return getBaseResponse({ success: false, status: 400, error: `${key} must be under 10 MB.` });
            }
            files[key] = file;
        }

        // 비율 검증 + 정규화
        const rawAspectRatios = body.aspectRatios;
        if (!Array.isArray(rawAspectRatios) || rawAspectRatios.length === 0) {
            return getBaseResponse({ success: false, status: 400, error: "aspectRatios must be a non-empty array." });
        }
        const aspectRatioKeys: AdRatioKey[] = [];
        for (const rawRatio of rawAspectRatios) {
            const ratioKey = CLIENT_RATIO_TO_KEY[rawRatio];
            if (!ratioKey) {
                return getBaseResponse({ success: false, status: 400, error: `Unsupported aspect ratio: ${rawRatio}` });
            }
            if (!aspectRatioKeys.includes(ratioKey)) {
                aspectRatioKeys.push(ratioKey);
            }
        }

        // conceptCount 검증
        const conceptCount = body.conceptCount;
        if (!Number.isInteger(conceptCount) || conceptCount < 1 || conceptCount > 10) {
            return getBaseResponse({
                success: false,
                status: 400,
                error: "conceptCount must be an integer between 1 and 10.",
            });
        }

        // 업로드 컴포넌트 검증 — 존재하면 확장자 필수
        for (const component of [body.productImage, body.personImage, body.brandLogo]) {
            if (component && !component.imageFileExtension) {
                return getBaseResponse({
                    success: false,
                    status: 400,
                    error: "Uploaded component requires imageFileExtension.",
                });
            }
        }

        // brandPalette 검증 — nullable, 3~5개 hex
        let brandPalette: string[] | null = null;
        if (body.brandPalette != null) {
            if (!Array.isArray(body.brandPalette) || body.brandPalette.length < 3 || body.brandPalette.length > 5) {
                return getBaseResponse({
                    success: false,
                    status: 400,
                    error: "brandPalette must be null or an array of 3-5 hex colors.",
                });
            }
            const hexRegex = /^#([0-9A-Fa-f]{6})$/;
            for (const hex of body.brandPalette) {
                if (typeof hex !== "string" || !hexRegex.test(hex)) {
                    return getBaseResponse({ success: false, status: 400, error: `Invalid brandPalette hex: ${hex}` });
                }
            }
            brandPalette = body.brandPalette.map((hex) => hex.toUpperCase());
        }

        // 배치 생성 — specs·results는 각 단계가 채운다
        const createdBatch = await adGenerationBatchServerAPI.postAdGenerationBatch({
            user_id: userId,
            status: "queued",
            product_image: body.productImage ?? null,
            person_image: body.personImage ?? null,
            brand_logo: body.brandLogo ?? null,
            aspect_ratios: aspectRatioKeys,
            concept_count: conceptCount,
            cta_enabled: body.ctaEnabled ?? false,
            brand_palette: brandPalette,
            ad_creative_specs: [],
            ad_creative_results: [],
        });

        // 원본 업로드 — batch 생성과 같은 요청 안에서, specs 출발 전에.
        // 실제 저장 확장자(MIME 기준)로 DB 기록을 정정해 조회 경로를 일치시킨다.
        const recordKey: Record<
            "product" | "person" | "brand_logo",
            "product_image" | "person_image" | "brand_logo"
        > = {
            product: "product_image",
            person: "person_image",
            brand_logo: "brand_logo",
        };
        const recordPatch: {
            product_image?: { imageFileExtension: string; note?: string };
            person_image?: { imageFileExtension: string; note?: string };
            brand_logo?: { imageFileExtension: string };
        } = {};

        for (const [key, file] of Object.entries(files) as Array<["product" | "person" | "brand_logo", File]>) {
            const extension = getExtensionFromFile(file);
            const filePath = `${userId}/${createdBatch.id}/${key}_image.${extension}`;
            try {
                await adImageServerAPI.uploadObject(filePath, await file.arrayBuffer(), file.type);
            } catch (uploadError) {
                throw new Error(
                    `Failed to upload ${key} image: ${uploadError instanceof Error ? uploadError.message : "unknown"}`,
                );
            }

            const declared =
                key === "brand_logo"
                    ? body.brandLogo?.imageFileExtension
                    : key === "product"
                      ? body.productImage?.imageFileExtension
                      : body.personImage?.imageFileExtension;

            if (declared !== extension) {
                const column = recordKey[key];
                if (column === "brand_logo") {
                    recordPatch.brand_logo = { imageFileExtension: extension };
                } else if (column === "product_image") {
                    recordPatch.product_image = { imageFileExtension: extension, note: body.productImage?.note };
                } else {
                    recordPatch.person_image = { imageFileExtension: extension, note: body.personImage?.note };
                }
            }
        }
        if (Object.keys(recordPatch).length > 0) {
            await adGenerationBatchServerAPI.patchAdGenerationBatch(createdBatch.id, recordPatch);
        }

        // 분기: 실사 인물 업로드 → specs 직행 / personaBrief → persona 경로 / 그 외 → specs 직행.
        const hasPersonFile = Boolean(files.person);
        const personaBriefRaw = body.personaBrief;
        const personaRequested = typeof personaBriefRaw === "string";

        if (!hasPersonFile && personaRequested) {
            // TODO(W3): persona 경로는 아직 워크플로로 이관되지 않았다.
            // 예전에는 internalFireAndForgetFetch로 /api/image/generation/persona를 불렀지만,
            // 그것이 prod에서 죽었던 원인이다. W3에서 워크플로 step으로 붙인다.
            console.error(`[api/image] persona path not ported yet (batch=${createdBatch.id})`);
            return getBaseResponse({
                success: false,
                status: 501,
                error: "Persona generation is temporarily unavailable during migration.",
            });
        }

        // 파이프라인 시작 = 워크플로 인스턴스 생성 (instance id = batchId)
        await startBatchPipeline(context.env, createdBatch.id);

        return getBaseResponse({
            success: true,
            status: 200,
            data: { batchId: createdBatch.id },
            message: "Ad generation batch created and pipeline started.",
        });
    } catch (error) {
        console.error("Error in POST /api/image:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to start ad generation pipeline",
        });
    }
});

export default imageRoutes;
