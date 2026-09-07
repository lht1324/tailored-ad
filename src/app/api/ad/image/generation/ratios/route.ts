import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";
import {
    ReplicateImageModelId,
    replicateClient,
} from "@/lib/ReplicateClient";
import { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * 파생(ratios) 이미지 제출 단계 — 중립 실행자.
 * 호출처가 두 곳이지만(프롬프트 직통 / process-base 뒤따름) 이 라우트는 그 차이를 모른다.
 * 배치의 aspect_ratios length만으로 모드를 판별한다:
 *   - length === 1 → 직통 모드: 그 한 장 제출 (곧 마지막 조각)
 *   - length >= 2  → 뒤따름 모드: (aspect_ratios − selectBaseRatio) 전부 제출,
 *                    기준 이미지는 규칙 경로로 signed URL 재조립해 참조 입력에 포함
 */
export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const creativeIndexParam = searchParams.get('creativeIndex');
    const retryRatioKey = searchParams.get('ratioKey') as AdRatioKey | null;
    const attemptParam = searchParams.get('attempt');
    const attempt = attemptParam ? Number.parseInt(attemptParam, 10) : 1;

    if (!batchId || creativeIndexParam === null) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query params: batchId, creativeIndex"
        });
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);

    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid creativeIndex query param.",
        });
    }

    try {
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!batch) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch not found."
            });
        }

        const creativeSpec = batch.ad_creative_specs[creativeIndex];

        if (!creativeSpec || creativeSpec.creativeIndex !== creativeIndex) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Creative spec #${creativeIndex} not found in batch.`
            });
        }

        if (!Array.isArray(batch.aspect_ratios) || batch.aspect_ratios.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch has no aspect ratios."
            });
        }

        const baseUrl = process.env.BASE_URL;

        if (!baseUrl) {
            throw new Error("BASE_URL is not configured.");
        }

        // 재시도 모드: 특정 ratio 1장만 재제출 (process/ratios 실패 시 1회 재시도)
        if (retryRatioKey) {
            if (!(batch.aspect_ratios as string[]).includes(retryRatioKey)) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `Retry ratioKey ${retryRatioKey} is not in batch aspect_ratios.`
                });
            }
            const caption = creativeSpec.imagePromptRecord[retryRatioKey];
            if (!caption || typeof caption !== 'string' || caption.trim().length === 0) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `Caption for ratio ${retryRatioKey} is missing.`
                });
            }
            // base 실패 폴백 고려해 참조 구성
            const baseRatioForRetry = selectBaseRatio(batch.aspect_ratios as AdRatioKey[]);
            const baseImageResultForRetry = batch.ad_creative_results?.[creativeIndex]?.imageResults?.[baseRatioForRetry] as { imageFileExtension?: string | null; error?: unknown } | undefined;
            const baseFileExtensionForRetry = baseImageResultForRetry?.imageFileExtension;
            const baseHasErrorForRetry = !!(baseImageResultForRetry as { error?: unknown } | undefined)?.error;
            let referenceUrlsForRetry: string[];
            let originalUrlsForRetry: string[] = [];
            try {
                originalUrlsForRetry = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);
            } catch {
                originalUrlsForRetry = [];
            }
            if (!baseFileExtensionForRetry || typeof baseFileExtensionForRetry !== 'string' || baseFileExtensionForRetry.trim().length === 0 || baseHasErrorForRetry || baseRatioForRetry === retryRatioKey) {
                referenceUrlsForRetry = [...originalUrlsForRetry];
            } else {
                const baseSignedUrlForRetry = await adImageServerAPI.getAdResultImageSignedUrl(batch.user_id, batch.id, creativeIndex, baseRatioForRetry, baseFileExtensionForRetry);
                referenceUrlsForRetry = [baseSignedUrlForRetry, ...originalUrlsForRetry];
            }
            const webhookUrl = `${baseUrl}/webhook/ad/replicate/image/ratios?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&ratioKey=${encodeURIComponent(retryRatioKey)}&attempt=${encodeURIComponent(String(attempt))}`;
            const wrappedCaptionForRetry = `INSTRUCTION: Use the input image ONLY to preserve the product/person identity (shape, color, material, lace, perforations, stitching). Do NOT copy its background, floor, shadows or wall — recreate the product with pixel-perfect edges on the new scene described below.\n\nSCENE: ${caption}`;
            await replicateClient.postAdImageEditPrediction({
                model: ReplicateImageModelId.NANO_BANANA,
                prompt: wrappedCaptionForRetry,
                imageUrls: referenceUrlsForRetry,
                aspectRatio: retryRatioKey,
                webhookUrl,
            });
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: `Retry ratio ${retryRatioKey} prediction submitted (attempt ${attempt}).`,
            });
        }

        // 직통 모드: 비율 1개 — 원본 참조로 1장만 제출
        if (batch.aspect_ratios.length === 1) {
            const singleRatio = batch.aspect_ratios[0] as AdRatioKey;
            const caption = creativeSpec.imagePromptRecord[singleRatio];

            if (!caption || typeof caption !== 'string' || caption.trim().length === 0) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `Caption for ratio ${singleRatio} is missing. Prompt step must be completed before generation.`
                });
            }

            let originalImageUrls: string[] = [];
            try {
                originalImageUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);
            } catch {
                originalImageUrls = [];
            }
            const webhookUrl = `${baseUrl}/webhook/ad/replicate/image/ratios?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&ratioKey=${encodeURIComponent(singleRatio)}&attempt=${encodeURIComponent(String(attempt))}`;
            const wrappedCaptionForSingle = `INSTRUCTION: Use the input image ONLY to preserve the product/person identity (shape, color, material, lace, perforations, stitching). Do NOT copy its background, floor, shadows or wall — recreate the product with pixel-perfect edges on the new scene described below.\n\nSCENE: ${caption}`;
            await replicateClient.postAdImageEditPrediction({
                model: ReplicateImageModelId.NANO_BANANA,
                prompt: wrappedCaptionForSingle,
                imageUrls: originalImageUrls,
                aspectRatio: singleRatio,
                webhookUrl,
            });

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Ratio image prediction submitted.",
            });
        }

        // 뒤따름 모드: 기준 이미지 + 남은 비율 전부 제출 — fail-soft: base 실패 시 원본만으로 폴백
        const baseRatio = selectBaseRatio(batch.aspect_ratios as AdRatioKey[]);
        const baseImageResult = batch.ad_creative_results?.[creativeIndex]?.imageResults?.[baseRatio] as
            | { imageFileExtension?: string | null; error?: unknown }
            | undefined;
        const baseFileExtension = baseImageResult?.imageFileExtension;
        const baseHasError = !!(baseImageResult as { error?: unknown } | undefined)?.error;

        let referenceUrlsWithBase: string[];
        let originalImageUrls: string[] = [];
        try {
            originalImageUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);
        } catch {
            originalImageUrls = [];
        }

        if (!baseFileExtension || typeof baseFileExtension !== 'string' || baseFileExtension.trim().length === 0 || baseHasError) {
            console.warn(`[generation/ratios] base ${baseRatio} not ready or errored for creative ${creativeIndex}, falling back to originals only (fail-soft)`);
            referenceUrlsWithBase = [...originalImageUrls];
        } else {
            const baseImageSignedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
                batch.user_id,
                batch.id,
                creativeIndex,
                baseRatio,
                baseFileExtension,
            );
            referenceUrlsWithBase = [baseImageSignedUrl, ...originalImageUrls];
        }
        const remainingRatios = (batch.aspect_ratios as AdRatioKey[]).filter((ratio) => ratio !== baseRatio);

        if (remainingRatios.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "No remaining ratios to generate.",
            });
        }

        for (const ratioKey of remainingRatios) {
            const caption = creativeSpec.imagePromptRecord[ratioKey];

            if (!caption || typeof caption !== 'string' || caption.trim().length === 0) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `Caption for ratio ${ratioKey} is missing. Prompt step must be completed before generation.`
                });
            }

            const webhookUrl = `${baseUrl}/webhook/ad/replicate/image/ratios?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&ratioKey=${encodeURIComponent(ratioKey)}&attempt=${encodeURIComponent(String(attempt))}`;
            const wrappedCaptionForRatio = `INSTRUCTION: Use the input image ONLY to preserve the product/person identity (shape, color, material, lace, perforations, stitching). Do NOT copy its background, floor, shadows or wall — recreate the product with pixel-perfect edges on the new scene described below.\n\nSCENE: ${caption}`;
            await replicateClient.postAdImageEditPrediction({
                model: ReplicateImageModelId.NANO_BANANA,
                prompt: wrappedCaptionForRatio,
                imageUrls: referenceUrlsWithBase,
                aspectRatio: ratioKey,
                webhookUrl,
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Ratio image predictions submitted.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/image/generation/ratios (batch=${batchId}, creative=${creativeIndex}):`, error);

        // fail-soft: generation 제출 실패도 배치 전체 failed로 전이하지 않음
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to submit ratio image generations"
        });
    }
}
