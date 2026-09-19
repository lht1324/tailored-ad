import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";
import { replicateClient } from "@/lib/ReplicateClient";
import { selectImageModel, type ImageInputTag } from "@/lib/replicateInputMapper";
import { AdRatioKey, type AdGenerationBatch } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/** 원본 전용 태그 순서 = [product?, person?] (getAdOriginalImageSignedUrls와 동일) */
function buildOriginalTagOrder(batch: AdGenerationBatch): ImageInputTag[] {
    return [
        ...(batch.product_image ? ["PRODUCT_IMAGE" as const] : []),
        ...(batch.person_image ? ["PERSON_IMAGE" as const] : []),
    ];
}

/**
 * 제출 실패 가시화 — prediction이 없으면 웹훅이 안 와 영구 pending 유령이 되므로
 * 해당 비율 타일을 error로 마킹한다 (호출자는 그대로 500 또는 다음 비율 계속).
 */
async function markSubmissionFailed(batchId: string, creativeIndex: number, ratioKey: AdRatioKey, error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit ratio image generation";
    await adGenerationBatchServerAPI.updateCreativeImageByRatioGenerationCompleted(
        batchId,
        creativeIndex,
        ratioKey,
        null,
        { code: 'SUBMISSION_FAILED', message },
    ).catch(() => {});
}

/**
 * 파생(ratios) 이미지 제출 단계 — base 성공 후 파생 전부 제출, 또는 실패 타일 1장 재제출.
 * 모드 2개 (`ratioKey` 쿼리로 판별):
 *   - 재시도: 실패한 ratio 1장만 고정 문구로 재제출 (base 재시도면 원본 참조, 아니면 base 1장 참조)
 *   - 뒤따름: base 1장만 참조해 남은 비율 전부 제출. base 실패 시 파생 전부 스킵 (원본 폴백 없음)
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
        const adGenerationBatch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!adGenerationBatch) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch not found."
            });
        }

        const adCreativeSpec = adGenerationBatch.ad_creative_specs[creativeIndex];

        if (!adCreativeSpec || adCreativeSpec.creativeIndex !== creativeIndex) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Creative spec #${creativeIndex} not found in batch.`
            });
        }

        const aspectRatios = adGenerationBatch.aspect_ratios;

        if (!Array.isArray(aspectRatios) || aspectRatios.length === 0) {
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
            if (!(aspectRatios as string[]).includes(retryRatioKey)) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `Retry ratioKey ${retryRatioKey} is not in batch aspect_ratios.`
                });
            }
            // 고정 문구라 캡션 검증 불필요 — ratioKey 소속 확인만으로 충분
            // base 재시도 예외 고려해 참조 구성
            const baseRatioForRetry = selectBaseRatio(aspectRatios as AdRatioKey[]);
            const baseImageResultForRetry = adGenerationBatch.ad_creative_results?.[creativeIndex]?.imageResults?.[baseRatioForRetry] as { imageFileExtension?: string | null; error?: unknown } | undefined;
            const baseFileExtensionForRetry = baseImageResultForRetry?.imageFileExtension;
            const baseHasErrorForRetry = !!(baseImageResultForRetry as { error?: unknown } | undefined)?.error;
            let referenceUrlsForRetry: string[];
            let retryTags: ImageInputTag[];
            let originalUrlsForRetry: string[] = [];
            try {
                originalUrlsForRetry = await adImageServerAPI.getAdOriginalImageSignedUrls(adGenerationBatch);
            } catch {
                originalUrlsForRetry = [];
            }
            if (!baseFileExtensionForRetry || typeof baseFileExtensionForRetry !== 'string' || baseFileExtensionForRetry.trim().length === 0 || baseHasErrorForRetry || baseRatioForRetry === retryRatioKey) {
                // base 없음(실패) 또는 재시도 대상이 base 자체 → 원본으로 base를 다시 뽑음
                referenceUrlsForRetry = [...originalUrlsForRetry];
                retryTags = buildOriginalTagOrder(adGenerationBatch);
            } else {
                // 그 외 재시도는 base 1장만 참조 (원본 보조 없음)
                const baseSignedUrlForRetry = await adImageServerAPI.getAdResultImageSignedUrl(adGenerationBatch.user_id, adGenerationBatch.id, creativeIndex, baseRatioForRetry, baseFileExtensionForRetry);
                referenceUrlsForRetry = [baseSignedUrlForRetry];
                retryTags = ["BASE_IMAGE"];
            }
            const webhookUrl = `${baseUrl}/webhook/replicate/image/ratios?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&ratioKey=${encodeURIComponent(retryRatioKey)}&attempt=${encodeURIComponent(String(attempt))}`;
            const prompt = `Reframe image_input[0] into a ${retryRatioKey.replace('_', ':')} still-advertisement composition. Preserve its identity, palette, and lighting exactly. Rearrange framing and negative space for the new canvas, keeping clean room for headline text.`
            try {
                await replicateClient.postAdImageEditPrediction({
                    prompt: prompt,
                    imageUrls: referenceUrlsForRetry,
                    aspectRatio: retryRatioKey,
                    model: selectImageModel(aspectRatios as string[]),
                    imageTags: retryTags,
                    webhookUrl,
                });
            } catch (submitError) {
                await markSubmissionFailed(batchId, creativeIndex, retryRatioKey, submitError);
                throw submitError;
            }
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: `Retry ratio ${retryRatioKey} prediction submitted (attempt ${attempt}).`,
            });
        }

        // 뒤따름 모드: 기준 이미지 + 남은 비율 전부 제출
        const baseRatio = selectBaseRatio(aspectRatios);
        const baseImageResult = adGenerationBatch.ad_creative_results?.[creativeIndex]?.imageResults?.[baseRatio] as
            | { imageFileExtension?: string | null; error?: unknown }
            | undefined;
        const baseFileExtension = baseImageResult?.imageFileExtension;
        const baseHasError = !!(baseImageResult as { error?: unknown } | undefined)?.error;

        // base 실패 시 파생 전부 스킵 — base가 곧 제품이라 원본 폴백은 모순.
        // 스킵된 타일은 error 마킹해서 기존 에러 UI로 보여준다
        if (!baseFileExtension || typeof baseFileExtension !== 'string' || baseFileExtension.trim().length === 0 || baseHasError) {
            console.warn(`[generation/ratios] base ${baseRatio} failed for creative ${creativeIndex}, skipping ratio generation`);
            const skippedRatios = (aspectRatios as AdRatioKey[]).filter((ratio) => ratio !== baseRatio);
            for (const skippedRatio of skippedRatios) {
                await markSubmissionFailed(batchId, creativeIndex, skippedRatio, new Error(`Base ${baseRatio} failed, skipping ratio generation.`));
            }
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Base failed, ratio generation skipped.",
            });
        }

        // 참조는 base 1장만 (원본 보조 없음)
        const baseImageSignedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
            adGenerationBatch.user_id,
            adGenerationBatch.id,
            creativeIndex,
            baseRatio,
            baseFileExtension,
        );
        const referenceUrlsWithBase = [baseImageSignedUrl];
        const remainingRatios = (aspectRatios as AdRatioKey[]).filter((ratio) => ratio !== baseRatio);

        if (remainingRatios.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "No remaining ratios to generate.",
            });
        }

        for (const ratioKey of remainingRatios) {
            const prompt = `Reframe image_input[0] into a ${ratioKey.replace('_', ':')} still-advertisement composition. Preserve its identity, palette, and lighting exactly. Rearrange framing and negative space for the new canvas, keeping clean room for headline text.`

            const webhookUrl = `${baseUrl}/webhook/replicate/image/ratios?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&ratioKey=${encodeURIComponent(ratioKey)}&attempt=${encodeURIComponent(String(attempt))}`;
            try {
                await replicateClient.postAdImageEditPrediction({
                    prompt: prompt,
                    imageUrls: referenceUrlsWithBase,
                    aspectRatio: ratioKey,
                    model: selectImageModel(aspectRatios as string[]),
                    imageTags: ["BASE_IMAGE"],
                    webhookUrl,
                });
            } catch (submitError) {
                // 해당 비율만 error 마킹하고 나머지 비율은 계속 제출 (fail-soft)
                console.error(`[generation/ratios] submit failed (batch=${batchId}, creative=${creativeIndex}, ratio=${ratioKey}):`, submitError);
                await markSubmissionFailed(batchId, creativeIndex, ratioKey, submitError);
            }
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Ratio image predictions submitted.",
        });
    } catch (error) {
        console.error(`Error in POST /api/image/generation/ratios (batch=${batchId}, creative=${creativeIndex}):`, error);

        // fail-soft: generation 제출 실패도 배치 전체 failed로 전이하지 않음
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to submit ratio image generations"
        });
    }
}
