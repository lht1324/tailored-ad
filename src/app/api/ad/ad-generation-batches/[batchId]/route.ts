import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ batchId: string }> },
) {
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

    const { batchId } = await context.params;

    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing batchId.",
        });
    }

    try {
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchByIdForUser(batchId, userId);

        if (!batch) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Batch not found.",
            });
        }

        // 결과 이미지 signed URL 맵 생성: key = `${creativeIndex}_${ratioKey}`
        const signedUrls: Record<string, string> = {};

        for (const creativeResult of batch.ad_creative_results ?? []) {
            const creativeIndex = creativeResult.creativeIndex;
            const imageResults = creativeResult.imageResults as Record<string, { imageFileExtension?: string | null }>;

            if (!imageResults) continue;

            for (const [ratioKey, imageResult] of Object.entries(imageResults)) {
                const typedRatioKey = ratioKey as AdRatioKey;
                const ext = (imageResult as { imageFileExtension?: string | null })?.imageFileExtension;
                // error인 경우 storage에 파일이 없으므로 skip (AdImageResult.error 존재 시 imageFileExtension null)
                if (!ext) continue;

                try {
                    const signedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
                        batch.user_id,
                        batch.id,
                        creativeIndex,
                        typedRatioKey,
                        ext,
                    );
                    signedUrls[`${creativeIndex}_${typedRatioKey}`] = signedUrl;
                } catch {
                    // 개별 이미지 signed URL 실패는 전체를 실패로 만들지 않음
                    continue;
                }
            }
        }

        // 브랜드 로고 signed URL — 배치 로고 있으면 1개, 없으면 null
        let brandLogoSignedUrl: string | null = null;
        const brandLogo = (batch as unknown as { brand_logo?: { imageFileExtension?: string | null } | null }).brand_logo;
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

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                batch,
                signedUrls,
                brandLogoSignedUrl,
            },
        });
    } catch (error) {
        console.error("Error in GET /api/ad/ad-generation-batches/[batchId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get batch",
        });
    }
}
