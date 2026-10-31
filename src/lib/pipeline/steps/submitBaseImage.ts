import { getServerEnv } from "@/lib/serverEnv";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";
import { replicateClient } from "@/lib/ReplicateClient";
import { selectImageModel, type ImageInputTag } from "@/lib/replicateInputMapper";
import { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { StepError } from "@/lib/pipeline/types";

/**
 * 단계: 기준(base) 이미지 Replicate 제출 (원래 `api/image/generation/base/route.ts`).
 *
 * base 비율을 정해(1:1 우선, 없으면 캐노니컬 첫째) prediction을 제출하고 **즉시 반환**한다.
 * 완료는 Replicate 웹훅으로 도착하며, 워크플로가 `waitForEvent`로 기다린 뒤
 * `handleBaseResult`가 후처리를 맡는다.
 *
 * ⚠️ 여기서 `BASE_URL`은 **외부 콜백 주소**로만 쓴다(Replicate가 우리를 부르는 URL).
 *    내부 단계 호출에는 절대 쓰지 않는다 — 그게 이번 사고의 원인이었다.
 */

export interface SubmitBaseImageInput {
    batchId: string;
    creativeIndex: number;
    /** 1부터. 같은 비율 재시도 회차 */
    attempt: number;
    /** 지정 시 이 비율 우선 (차순위 폴백용) */
    baseRatio?: AdRatioKey;
}

export interface SubmitBaseImageOutput {
    submitted: boolean;
    baseRatio: AdRatioKey;
    /** 제출 실패 시 사유 (fail-soft: 배치를 죽이지 않는다) */
    error?: string;
}

export async function submitBaseImage(input: SubmitBaseImageInput): Promise<SubmitBaseImageOutput> {
    const { batchId, creativeIndex, attempt } = input;

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError('BATCH_NOT_FOUND', 'Batch not found.');
    }

    const creativeSpec = batch.ad_creative_specs[creativeIndex];
    if (!creativeSpec || creativeSpec.creativeIndex !== creativeIndex) {
        throw new StepError('SPEC_NOT_FOUND', `Creative spec #${creativeIndex} not found in batch.`);
    }

    const baseRatio = input.baseRatio && (batch.aspect_ratios as string[]).includes(input.baseRatio)
        ? input.baseRatio
        : selectBaseRatio(batch.aspect_ratios as AdRatioKey[]);

    const caption = creativeSpec.creativePrompt;
    if (!caption || typeof caption !== 'string' || caption.trim().length === 0) {
        throw new StepError(
            'PROMPT_MISSING',
            `Caption for base ratio ${baseRatio} is missing. Prompt step must be completed before generation.`,
        );
    }

    // 원본 업로드가 아직이면 text-only로 폴백 — 파이프라인 전체를 블록하지 않음
    let originalImageUrls: string[] = [];
    try {
        originalImageUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);
    } catch (signedUrlError) {
        console.warn(`[submitBaseImage] signedUrl fallback to empty (batch=${batchId}):`, signedUrlError);
        originalImageUrls = [];
    }

    const baseUrl = await getServerEnv('BASE_URL');
    if (!baseUrl) {
        throw new StepError('STEP_INTERNAL_ERROR', 'BASE_URL is not configured.');
    }

    const webhookUrl = `${baseUrl}/webhook/replicate/image/base?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&ratioKey=${encodeURIComponent(baseRatio)}&attempt=${encodeURIComponent(String(attempt))}`;

    const wrappedCaption = `INSTRUCTION: Use the input image ONLY to preserve the product/person identity (shape, color, material, lace, perforations, stitching). Do NOT copy its background, floor, shadows or wall — recreate the product with pixel-perfect edges on the new scene described below.\n\nSCENE: ${caption}`;

    const tagOrder: ImageInputTag[] = [
        ...(batch.product_image ? ["PRODUCT_IMAGE" as const] : []),
        ...(batch.person_image ? ["PERSON_IMAGE" as const] : []),
    ];

    try {
        await replicateClient.postAdImageEditPrediction({
            prompt: wrappedCaption,
            imageUrls: originalImageUrls,
            aspectRatio: baseRatio,
            model: selectImageModel(batch.aspect_ratios as string[]),
            imageTags: tagOrder,
            webhookUrl,
        });

        return { submitted: true, baseRatio };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit base image generation';
        console.error(`[submitBaseImage] submit failed (batch=${batchId}, creative=${creativeIndex}, ratio=${baseRatio}):`, error);

        // 제출 실패 가시화 — prediction이 없으면 웹훅이 안 와 영구 pending 유령이 된다
        await adGenerationBatchServerAPI.updateCreativeImageByRatioGenerationCompleted(
            batchId,
            creativeIndex,
            baseRatio,
            null,
            { code: 'SUBMISSION_FAILED', message },
        ).catch(() => {});

        // fail-soft: 배치 전체 failed로 전이하지 않는다
        return { submitted: false, baseRatio, error: message };
    }
}
