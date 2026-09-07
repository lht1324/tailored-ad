import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId.",
        });
    }

    try {
        const limitParam = request.nextUrl.searchParams.get('limit');
        const offsetParam = request.nextUrl.searchParams.get('offset');

        const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50) : 20;
        const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

        const batches = await adGenerationBatchServerAPI.listAdGenerationBatchesByUserId(userId, {
            limit,
            offset,
        });

        // 썸네일: 현재 점수 최고 1장의 signedUrl + 비율(크롭 위치 결정용) — 최고점 갱신 시 리스트 커버도 갱신
        const thumbnailSignedUrls: Record<string, string> = {};
        const thumbnailRatioKeys: Record<string, AdRatioKey> = {};

        await Promise.all(
            batches.map(async (batch) => {
                let best: { creativeIndex: number; ratioKey: AdRatioKey; ext: string; score: number } | null = null;
                let firstCompleted: { creativeIndex: number; ratioKey: AdRatioKey; ext: string } | null = null;

                for (const cr of batch.ad_creative_results ?? []) {
                    for (const rk of batch.aspect_ratios) {
                        const ir = (cr.imageResults as Record<string, { score?: number | null; imageFileExtension?: string | null; error?: unknown }>)[rk as string];
                        if (!ir || (ir as { error?: unknown }).error) continue;
                        const ext = ir.imageFileExtension;
                        if (!ext) continue;
                        if (!firstCompleted) {
                            firstCompleted = { creativeIndex: cr.creativeIndex, ratioKey: rk as AdRatioKey, ext };
                        }
                        if (ir.score != null) {
                            if (!best || ir.score > best.score) {
                                best = { creativeIndex: cr.creativeIndex, ratioKey: rk as AdRatioKey, ext, score: ir.score };
                            }
                        }
                    }
                }

                const target = best ?? firstCompleted;
                if (!target) return;

                try {
                    const signedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
                        batch.user_id,
                        batch.id,
                        target.creativeIndex,
                        target.ratioKey,
                        target.ext,
                    );
                    thumbnailSignedUrls[batch.id] = signedUrl;
                    thumbnailRatioKeys[batch.id] = target.ratioKey;
                } catch {
                    // 개별 썸네일 실패는 전체를 실패로 만들지 않음
                }
            }),
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                batches,
                pagination: {
                    limit,
                    offset,
                    count: batches.length,
                },
                thumbnailSignedUrls,
                thumbnailRatioKeys,
            },
        });
    } catch (error) {
        console.error("Error in GET /api/ad/ad-generation-batches:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to list batches",
        });
    }
}
