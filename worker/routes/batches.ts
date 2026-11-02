import { Hono } from "hono";
import { adGenerationBatchServerAPI } from "@worker/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@worker/lib/api/server/ad/imageServerAPI";
import { getBaseResponse } from "@worker/lib/utils/getBaseResponse";
import type { AdRatioKey } from "@shared/types/supabase/ad/AdGenerationBatch";
import type { AppEnv } from "../env";
import type { AuthVariables } from "../middleware/auth";

/**
 * 배치 목록 — `GET /api/ad-generation-batches?limit=&offset=`
 *
 * 기존 구현과 차이:
 *  - `userId`를 **쿼리에서 받지 않는다**. 세션(`context.get("user")`)에서만 온다.
 *  - S2S 시크릿 검사 없음 (게이트웨이 경유가 사라졌으므로).
 *
 * 썸네일은 "현재 점수 최고 1장"의 위치만 내려준다. 클라가 예쁜 경로로 URL을 조립하므로
 * 응답에 토큰이 실리지 않는다.
 */
const batchRoutes = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

batchRoutes.get("/ad-generation-batches", async (context) => {
    const user = context.get("user");

    try {
        const limitParam = context.req.query("limit");
        const offsetParam = context.req.query("offset");

        const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50) : 20;
        const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

        const batches = await adGenerationBatchServerAPI.listAdGenerationBatchesByUserId(user.id, {
            limit,
            offset,
        });

        const thumbnailCreativeIndexes: Record<string, number> = {};
        const thumbnailRatioKeys: Record<string, AdRatioKey> = {};

        await Promise.all(
            batches.map(async (batch) => {
                let best: { creativeIndex: number; ratioKey: AdRatioKey; score: number } | null = null;
                let firstCompleted: { creativeIndex: number; ratioKey: AdRatioKey } | null = null;

                for (const creativeResult of batch.ad_creative_results ?? []) {
                    for (const ratioKey of batch.aspect_ratios) {
                        const imageResult = (
                            creativeResult.imageResults as Record<
                                string,
                                { score?: number | null; imageFileExtension?: string | null; error?: unknown }
                            >
                        )[ratioKey as string];
                        if (!imageResult || imageResult.error) continue;

                        const extension = imageResult.imageFileExtension;
                        if (!extension) continue;

                        if (!firstCompleted) {
                            firstCompleted = { creativeIndex: creativeResult.creativeIndex, ratioKey: ratioKey as AdRatioKey };
                        }
                        if (imageResult.score != null) {
                            if (!best || imageResult.score > best.score) {
                                best = {
                                    creativeIndex: creativeResult.creativeIndex,
                                    ratioKey: ratioKey as AdRatioKey,
                                    score: imageResult.score,
                                };
                            }
                        }
                    }
                }

                const target = best ?? firstCompleted;
                if (!target) return;

                thumbnailCreativeIndexes[batch.id] = target.creativeIndex;
                thumbnailRatioKeys[batch.id] = target.ratioKey;
            }),
        );

        return getBaseResponse({
            success: true,
            status: 200,
            data: {
                batches,
                pagination: { limit, offset, count: batches.length },
                thumbnailCreativeIndexes,
                thumbnailRatioKeys,
            },
        });
    } catch (error) {
        console.error("Error in GET /api/ad-generation-batches:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to list batches",
        });
    }
});



/**
 * 배치 상세 — `GET /api/ad-generation-batches/:batchId`
 *
 * 목록과 달리 **원본 다운로드용 signed URL**까지 함께 내려준다.
 * 표시용 썸네일은 클라가 예쁜 경로(`/projects/:id/image`)로 조립하므로 여기서 발급하지 않는다.
 * (서명 URL에 토큰이 실리므로 목록 응답에는 넣지 않고 상세에서만 준다)
 */
batchRoutes.get("/ad-generation-batches/:batchId", async (context) => {
    const userId = context.get("user").id;
    const batchId = context.req.param("batchId");

    if (!batchId) {
        return getBaseResponse({ success: false, status: 400, error: "Missing batchId." });
    }

    try {
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchByIdForUser(batchId, userId);
        if (!batch) {
            return getBaseResponse({ success: false, status: 404, error: "Batch not found." });
        }

        const signedUrls: Record<string, string> = {};

        for (const creativeResult of batch.ad_creative_results ?? []) {
            const creativeIndex = creativeResult.creativeIndex;
            const imageResults = creativeResult.imageResults as Record<
                string,
                { imageFileExtension?: string | null }
            >;
            if (!imageResults) continue;

            for (const [ratioKey, imageResult] of Object.entries(imageResults)) {
                const typedRatioKey = ratioKey as AdRatioKey;
                const extension = imageResult?.imageFileExtension;
                // error 타일은 저장 파일이 없다 (imageFileExtension null)
                if (!extension) continue;

                try {
                    const signedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
                        batch.user_id,
                        batch.id,
                        creativeIndex,
                        typedRatioKey,
                        extension,
                    );
                    signedUrls[`${creativeIndex}_${typedRatioKey}`] = signedUrl;
                } catch {
                    // 개별 실패로 전체를 실패시키지 않는다
                    continue;
                }
            }
        }

        let brandLogoSignedUrl: string | null = null;
        const brandLogo = (batch as unknown as { brand_logo?: { imageFileExtension?: string | null } | null })
            .brand_logo;
        if (brandLogo?.imageFileExtension) {
            try {
                brandLogoSignedUrl = await adImageServerAPI.getBatchBrandLogoSignedUrl(
                    batch.user_id,
                    batch.id,
                    brandLogo.imageFileExtension,
                );
            } catch {
                brandLogoSignedUrl = null;
            }
        }

        return getBaseResponse({
            success: true,
            status: 200,
            data: { batch, signedUrls, brandLogoSignedUrl },
        });
    } catch (error) {
        console.error("Error in GET /api/ad-generation-batches/:batchId:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get batch",
        });
    }
});

export default batchRoutes;
