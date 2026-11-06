import { adGenerationBatchServerAPI } from "@server/api/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@server/storage/imageStorage";
import { selectBaseRatio } from "@server/api/ad/creativeCombinationSampler";
import { replicateClient } from "@server/ReplicateClient";
import { ReplicateModelId, selectImageModel, type ImageInputTag } from "@server/replicateInputMapper";
import { requireServerEnv } from "@server/serverEnv";
import { buildSignedWebhookUrl } from "@server/webhooks/signature";
import { StepError } from "@server/pipeline/types";
import { buildCaptionWrapper } from "@server/pipeline/steps/buildCaptionWrapper";
import type { AdGenerationBatch, AdRatioKey } from "@shared/types/supabase/ad/AdGenerationBatch";

/**
 * 파생(ratios) 이미지 **제출** 단계 — 원래 `api/image/generation/ratios` 라우트.
 *
 * ## 두 모드
 * - **재시도**(`retryRatioKey` 있음): 그 비율 1장만 다시 낸다.
 *   대상이 base 자신이면 Seedream(프롬프트+원본), 파생이면 BRIA(확장).
 * - **뒤따름**(없음): base 1장을 참조해 **남은 비율 전부** BRIA 확장으로 낸다.
 *   base가 실패했으면 파생 전부 스킵 — base가 곧 제품이라 원본 폴백은 모순이다.
 *
 * ## 왜 Response가 아니라 값을 반환하나
 * 이건 파이프라인 step이다. 워크플로가 직접 부르므로 HTTP 타입(`Response`)을 돌려주면
 * 재시도 판단도, 결과 사용도 불가능해진다.
 *
 * ## 왜 throw하지 않고 fail-soft인가
 * 제출 실패로 throw하면 워크플로가 step을 재시도하고, 그때 **Replicate에 중복 제출(과금)**된다.
 * 그래서 개별 실패는 타일을 error로 마킹하고 결과에 담아 반환한다.
 * throw는 설정 오류·데이터 오류(배치 없음 등)에만 쓴다.
 */

export interface SubmitRatiosInput {
    batchId: string;
    creativeIndex: number;
    /** 있으면 재시도 모드 (그 비율 1장만) */
    retryRatioKey?: AdRatioKey | null;
    /** 재시도 횟수 (기본 1) */
    attempt?: number;
}

export interface SubmitRatiosOutput {
    mode: "retry" | "follow";
    /** 제출에 성공한 비율 */
    submitted: AdRatioKey[];
    /** 제출 실패했거나(스킵 포함) error로 마킹된 비율 */
    failed: AdRatioKey[];
}

/** 원본 전용 태그 순서 = [product?, person?] (`getAdOriginalImageSignedUrls`와 동일) */
function buildOriginalTagOrder(batch: AdGenerationBatch): ImageInputTag[] {
    return [
        ...(batch.product_image ? ["PRODUCT_IMAGE" as const] : []),
        ...(batch.person_image ? ["PERSON_IMAGE" as const] : []),
    ];
}

/**
 * 제출 실패 가시화 — prediction이 없으면 웹훅이 오지 않아 **영구 pending 유령**이 된다.
 * 해당 비율 타일을 error로 마킹해 에러 UI로 보이게 한다.
 */
async function markSubmissionFailed(
    batchId: string,
    creativeIndex: number,
    ratioKey: AdRatioKey,
    error: unknown,
): Promise<void> {
    const message = error instanceof Error ? error.message : "Failed to submit ratio image generation";
    await adGenerationBatchServerAPI
        .updateCreativeImageByRatioGenerationCompleted(batchId, creativeIndex, ratioKey, null, {
            code: "SUBMISSION_FAILED",
            message,
        })
        .catch(() => {});
}

/** 결과 타일에서 확장자/에러를 꺼낸다 (base가 실제로 성공했는지 판정용) */
function readBaseTile(
    batch: AdGenerationBatch,
    creativeIndex: number,
    baseRatio: AdRatioKey,
): { fileExtension: string | null; hasError: boolean } {
    const tile = batch.ad_creative_results?.[creativeIndex]?.imageResults?.[baseRatio] as
        | { imageFileExtension?: string | null; error?: unknown }
        | undefined;
    const extension = tile?.imageFileExtension;
    const valid = typeof extension === "string" && extension.trim().length > 0;
    return { fileExtension: valid ? extension : null, hasError: Boolean(tile?.error) };
}

export async function submitRatios(input: SubmitRatiosInput): Promise<SubmitRatiosOutput> {
    const { batchId, creativeIndex } = input;
    const attempt = input.attempt && input.attempt > 0 ? input.attempt : 1;

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError("BATCH_NOT_FOUND", `Batch not found: ${batchId}`);
    }

    const creativeSpec = batch.ad_creative_specs[creativeIndex];
    if (!creativeSpec || creativeSpec.creativeIndex !== creativeIndex) {
        throw new StepError("SPEC_NOT_FOUND", `Creative spec #${creativeIndex} not found in batch.`);
    }

    const aspectRatios = batch.aspect_ratios as AdRatioKey[];
    if (!Array.isArray(aspectRatios) || aspectRatios.length === 0) {
        throw new StepError("STEP_INTERNAL_ERROR", "Batch has no aspect ratios.");
    }

    const baseUrl = await requireServerEnv("BASE_URL");

    /** 웹훅 주소 — 외부(Replicate)→우리. 인스턴스 id(batchId)를 쿼리로 실어 보낸다. */
    const buildWebhookUrl = (ratioKey: AdRatioKey) =>
        buildSignedWebhookUrl(baseUrl, "/api/webhook/replicate/image/ratios", {
            batchId,
            creativeIndex: String(creativeIndex),
            ratioKey,
            attempt: String(attempt),
        });

    // ── 재시도 모드 ────────────────────────────────────────────
    const retryRatioKey = input.retryRatioKey ?? null;
    if (retryRatioKey) {
        if (!(aspectRatios as string[]).includes(retryRatioKey)) {
            throw new StepError(
                "STEP_INTERNAL_ERROR",
                `Retry ratioKey ${retryRatioKey} is not in batch aspect_ratios.`,
            );
        }

        const baseRatio = selectBaseRatio(aspectRatios);
        const baseTile = readBaseTile(batch, creativeIndex, baseRatio);
        // base가 아직 정상이 아니면(base 자신이거나, 파일/에러 문제) base 생성 규칙으로 다시 낸다.
        const isBaseRetry = baseRatio === retryRatioKey || !baseTile.fileExtension || baseTile.hasError;

        try {
            if (isBaseRetry) {
                const caption = creativeSpec.creativePrompt;
                if (!caption || typeof caption !== "string" || caption.trim().length === 0) {
                    throw new StepError(
                        "PROMPT_MISSING",
                        `Caption for base ratio ${retryRatioKey} is missing.`,
                    );
                }

                let originalUrls: string[] = [];
                try {
                    originalUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);
                } catch {
                    originalUrls = [];
                }

                const wrappedCaption = buildCaptionWrapper(batch, caption);

                await replicateClient.postAdImageEditPrediction({
                    prompt: wrappedCaption,
                    imageUrls: originalUrls,
                    aspectRatio: retryRatioKey,
                    model: selectImageModel(aspectRatios as string[]),
                    imageTags: buildOriginalTagOrder(batch),
                    webhookUrl: await buildWebhookUrl(retryRatioKey),
                });
            } else {
                // 파생 재시도 → BRIA 확장 (base 1장 참조)
                const baseSignedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
                    batch.user_id,
                    batch.id,
                    creativeIndex,
                    baseRatio,
                    baseTile.fileExtension as string,
                );

                await replicateClient.postAdImageEditPrediction({
                    prompt: "",
                    imageUrls: [baseSignedUrl],
                    aspectRatio: retryRatioKey,
                    model: ReplicateModelId.BRIA_EXPAND,
                    webhookUrl: await buildWebhookUrl(retryRatioKey),
                });
            }
        } catch (submitError) {
            console.error(
                `[submitRatios] retry submit failed (batch=${batchId}, creative=${creativeIndex}, ratio=${retryRatioKey}):`,
                submitError,
            );
            await markSubmissionFailed(batchId, creativeIndex, retryRatioKey, submitError);
            return { mode: "retry", submitted: [], failed: [retryRatioKey] };
        }

        return { mode: "retry", submitted: [retryRatioKey], failed: [] };
    }

    // ── 뒤따름 모드: base 1장 참조로 남은 비율 전부 ────────────────
    const baseRatio = selectBaseRatio(aspectRatios);
    const baseTile = readBaseTile(batch, creativeIndex, baseRatio);

    // base 실패 → 파생 전부 스킵. 스킵된 타일도 error로 마킹해 기존 에러 UI로 보이게 한다.
    if (!baseTile.fileExtension || baseTile.hasError) {
        console.warn(
            `[submitRatios] base ${baseRatio} failed for creative ${creativeIndex}, skipping ratio generation`,
        );
        const skippedRatios = aspectRatios.filter((ratio) => ratio !== baseRatio);
        for (const skippedRatio of skippedRatios) {
            await markSubmissionFailed(
                batchId,
                creativeIndex,
                skippedRatio,
                new Error(`Base ${baseRatio} failed, skipping ratio generation.`),
            );
        }
        return { mode: "follow", submitted: [], failed: skippedRatios };
    }

    // 참조는 base 1장만 (원본 보조 없음)
    const baseImageSignedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
        batch.user_id,
        batch.id,
        creativeIndex,
        baseRatio,
        baseTile.fileExtension,
    );

    const remainingRatios = aspectRatios.filter((ratio) => ratio !== baseRatio);
    if (remainingRatios.length === 0) {
        return { mode: "follow", submitted: [], failed: [] };
    }

    const submitted: AdRatioKey[] = [];
    const failed: AdRatioKey[] = [];

    for (const ratioKey of remainingRatios) {
        try {
            // BRIA 전문 확장 — 원본 앵커 고정 + 주변만 생성. 프롬프트는 매퍼가 고정한다.
            await replicateClient.postAdImageEditPrediction({
                prompt: "",
                imageUrls: [baseImageSignedUrl],
                aspectRatio: ratioKey,
                model: ReplicateModelId.BRIA_EXPAND,
                webhookUrl: await buildWebhookUrl(ratioKey),
            });
            submitted.push(ratioKey);
        } catch (submitError) {
            // 해당 비율만 error 마킹하고 나머지는 계속 제출 (fail-soft)
            console.error(
                `[submitRatios] submit failed (batch=${batchId}, creative=${creativeIndex}, ratio=${ratioKey}):`,
                submitError,
            );
            await markSubmissionFailed(batchId, creativeIndex, ratioKey, submitError);
            failed.push(ratioKey);
        }
    }

    return { mode: "follow", submitted, failed };
}
