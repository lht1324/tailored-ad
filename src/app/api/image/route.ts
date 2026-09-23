import { getServerEnv } from "@/lib/serverEnv";
// ad 하위 기준
//
// 1. image/route.ts — multipart 1요청으로 주문+원본을 함께 받는다:
//    검증 → batch 생성 → Storage 업로드 → specs 체이닝. 한 함수 안에서 순서대로라
//    prompt가 Storage를 읽는 시점에 파일 존재가 보장된다 (경합 원천 제거).
//    (구: batch 생성(/image)과 업로드(.../batches/{id}/images)가 별도 요청이라 역전 가능했음)
// 2. creative/specs/route.ts (전체 Creative 조합 뽑아서 한 번에 ad_creative_specs 저장)
// 3. creative/[creative-index]/prompt/route.ts (POST, OpenRouter로 LLM 호출), 비율이 하나면 4-2-1, 비율이 두 개 이상이면 4-1-1.
// 4-1-1. image/generation/base/route.ts (POST, I2I 호출)
// 4-1-2. app/webhook/replicate/image/base/route.ts (받고 바로 image/process/base/route.ts로 넘기기)
// 4-1-3. image/process/base/route.ts (POST, payload 검사, 이미지 Supabase 저장 및 RPC 처리), 성공 시 4-2-1로 이동
// 4-2-1. image/generation/ratios/route.ts (POST, I2I 호출, AdGenerationBatch의 aspect_ratios length 보고 3과 4-1 중 어디서 온 건지 판별)
// 4-2-2. app/webhook/replicate/image/ratios/route.ts (받고 바로 image/process/ratios/route.ts로 넘기기)
// 4-2-3. image/process/ratios/route.ts (POST, payload 검사, 이미지 Supabase 저장 및 RPC 처리), isLastCreative=true일 때 5로 이동
// 5. RPC 검사 후 특정 Creative 완료 시 creative/[creative-index]/analysis/route.ts 호출, 개별 Creative 데이터 DB 업데이트 (RPC 필요한가?)

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { AD_IMAGE_STORAGE_BUCKET } from "@/lib/api/server/ad/imageServerAPI";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import {
    AdPipelineStartRequest,
    AdRatioKey,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/** 클라이언트 표기('1:1') → 저장 키('1_1') 정규화 맵 */
const CLIENT_RATIO_TO_KEY: Record<string, AdRatioKey> = {
    '1:1': '1_1',
    '4:5': '4_5',
    '9:16': '9_16',
    '16:9': '16_9',
    '2:3': '2_3',
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

export async function POST(request: NextRequest) {
    // client-gateway가 주입한 userId만 통과시킨다 (C2S 진입은 gateway 경유가 원칙)
    const userId = request.nextUrl.searchParams.get('userId');

    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId."
        });
    }

    // 잔액 가드 — 남은 장수 없으면 진입 차단 (402)
    // 유료(부여 이력 있음)는 누적 잔액제, 그 외는 KST 달력월제
    try {
        const owner = await usersServerAPI.getUserByUserId(userId);
        if (owner) {
            const usage = await usageServerAPI.getUsageStatus(owner);
            if (usage.remaining <= 0) {
                return getNextBaseResponse({
                    success: false,
                    status: 402,
                    error: "Image balance exhausted.",
                });
            }
        }
    } catch (quotaError) {
        console.error(`[quota] check failed (user=${userId}) — fail-open:`, quotaError);
    }

    try {
        // multipart 1요청: payload(JSON 문자열) + 원본 파일들
        const formData = await request.formData();
        const rawPayload = formData.get("payload");
        if (typeof rawPayload !== "string") {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Missing multipart field: payload (JSON string)."
            });
        }
        let body: AdPipelineStartRequest;
        try {
            body = JSON.parse(rawPayload) as AdPipelineStartRequest;
        } catch {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Invalid payload JSON."
            });
        }

        // 원본 파일 수집 + 검증 (batch 생성 전에 — 실패 시 고아 batch 방지)
        const files: Partial<Record<"product" | "person" | "brand_logo", File>> = {};
        for (const key of ["product", "person", "brand_logo"] as const) {
            const file = formData.get(key);
            if (!file || !(file instanceof File) || file.size === 0) continue;
            if (!ALLOWED_TYPES.has(file.type)) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `${key} must be JPG, PNG, or WebP.`
                });
            }
            if (file.size > MAX_FILE_SIZE) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `${key} must be under 10 MB.`
                });
            }
            files[key] = file;
        }

        // 비율 검증 + 정규화
        const rawAspectRatios = body.aspectRatios;
        if (!Array.isArray(rawAspectRatios) || rawAspectRatios.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "aspectRatios must be a non-empty array."
            });
        }

        const aspectRatioKeys: AdRatioKey[] = [];
        for (const rawRatio of rawAspectRatios) {
            const ratioKey = CLIENT_RATIO_TO_KEY[rawRatio];
            if (!ratioKey) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `Unsupported aspect ratio: ${rawRatio}`
                });
            }
            if (!aspectRatioKeys.includes(ratioKey)) {
                aspectRatioKeys.push(ratioKey);
            }
        }

        // conceptCount 검증
        const conceptCount = body.conceptCount;
        if (!Number.isInteger(conceptCount) || conceptCount < 1 || conceptCount > 10) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "conceptCount must be an integer between 1 and 10."
            });
        }

        // 업로드 컴포넌트 검증 — 존재하면 확장자 필수
        for (const component of [body.productImage, body.personImage, body.brandLogo]) {
            if (component && !component.imageFileExtension) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "Uploaded component requires imageFileExtension."
                });
            }
        }

        // brandPalette 검증 — nullable, 3-5 hex
        let brandPalette: string[] | null = null;
        if (body.brandPalette != null) {
            if (!Array.isArray(body.brandPalette) || body.brandPalette.length < 3 || body.brandPalette.length > 5) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "brandPalette must be null or an array of 3-5 hex colors."
                });
            }
            const hexRegex = /^#([0-9A-Fa-f]{6})$/;
            for (const hex of body.brandPalette) {
                if (typeof hex !== 'string' || !hexRegex.test(hex)) {
                    return getNextBaseResponse({
                        success: false,
                        status: 400,
                        error: `Invalid brandPalette hex: ${hex}`
                    });
                }
            }
            brandPalette = body.brandPalette.map((h) => h.toUpperCase());
        }

        // 배치 생성 — specs·results는 각 단계가 채운다
        const createdAdGenerationBatch = await adGenerationBatchServerAPI.postAdGenerationBatch({
            user_id: userId,
            status: 'queued',
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

        // 원본 이미지 업로드 — batch 생성과 같은 요청 안에서, specs 출발 전에.
        // 실제 저장 확장자(MIME 기준)로 DB 기록을 정정해 조회 경로 일치를 보장한다.
        const supabase = await createSupabaseServiceRoleClient();
        const recordKey: Record<"product" | "person" | "brand_logo", "product_image" | "person_image" | "brand_logo"> = {
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
            const ext = getExtensionFromFile(file);
            const filePath = `${userId}/${createdAdGenerationBatch.id}/${key}_image.${ext}`;
            const arrayBuffer = await file.arrayBuffer();
            const { error: uploadError } = await supabase.storage
                .from(AD_IMAGE_STORAGE_BUCKET)
                .upload(filePath, arrayBuffer, {
                    contentType: file.type,
                    upsert: true,
                });
            if (uploadError) {
                throw new Error(`Failed to upload ${key} image: ${uploadError.message}`);
            }
            const declared = key === "brand_logo"
                ? body.brandLogo?.imageFileExtension
                : key === "product"
                    ? body.productImage?.imageFileExtension
                    : body.personImage?.imageFileExtension;
            if (declared !== ext) {
                const column = recordKey[key];
                if (column === "brand_logo") {
                    recordPatch.brand_logo = { imageFileExtension: ext };
                } else if (column === "product_image") {
                    recordPatch.product_image = { imageFileExtension: ext, note: body.productImage?.note };
                } else {
                    recordPatch.person_image = { imageFileExtension: ext, note: body.personImage?.note };
                }
            }
        }
        if (Object.keys(recordPatch).length > 0) {
            await adGenerationBatchServerAPI.patchAdGenerationBatch(createdAdGenerationBatch.id, recordPatch);
        }

        // 다음 단계 체이닝 — 이 시점에 Storage 파일 존재 보장됨.
        // 3분기: 실사 인물 업로드 → specs 직행 (Enterprise 부활 경로, 현행 유지).
        // personaBrief → persona 1회 (슬롯 저장 후 specs 체인). 그 외 → specs 직행.
        const hasPersonFile = Boolean(files.person);
        const personaBriefRaw = body.personaBrief;
        // 문자열 존재 자체가 persona 경로 신호 (빈 문자열=seed 기본값 생성)
        const personaRequested = typeof personaBriefRaw === 'string';
        const personaBrief = personaRequested && personaBriefRaw.trim().length > 0
            ? personaBriefRaw.trim()
            : null;
        if (!hasPersonFile && personaRequested) {
            internalFireAndForgetFetch(
                `${await getServerEnv('BASE_URL')}/api/image/generation/persona?batchId=${createdAdGenerationBatch.id}`,
                { method: "POST" },
                { personaBrief },
            );
        } else {
            internalFireAndForgetFetch(
                `${await getServerEnv('BASE_URL')}/api/creative/specs?batchId=${createdAdGenerationBatch.id}`,
                { method: "POST" },
            );
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                batchId: createdAdGenerationBatch.id,
            },
            message: "Ad generation batch created and pipeline started.",
        });
    } catch (error) {
        console.error("Error in POST /api/image:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to start ad generation pipeline"
        });
    }
}
