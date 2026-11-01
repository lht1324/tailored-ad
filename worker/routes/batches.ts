import { Hono } from "hono";
import { adGenerationBatchServerAPI } from "@worker/lib/api/server/ad/adGenerationBatchServerAPI";
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

export default batchRoutes;
