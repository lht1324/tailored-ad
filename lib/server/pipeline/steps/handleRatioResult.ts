import { adGenerationBatchServerAPI } from "@server/api/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@server/api/ad/imageServerAPI";
import { usageServerAPI } from "@server/api/usageServerAPI";
import { StepError } from "@server/pipeline/types";
import type { ReplicateWebhookPayload } from "@server/workflows/batchPipelineClient";
import type { AdRatioKey } from "@shared/types/supabase/ad/AdGenerationBatch";

/**
 * 파생(ratios) 이미지 **후처리** 단계 — 원래 `api/image/process/ratios` 라우트.
 *
 * payload 검사 → 이미지 다운로드 → R2 저장 → 과금 원장 1줄 → RPC로 완료 마커.
 * RPC가 `isLastCreative`를 돌려주면 그 creative의 모든 비율이 끝난 것 → 분석 단계로 넘긴다.
 *
 * ## 반환값은 "다음에 뭘 할지"다
 * Response를 만들지 않는다. 재시도·분석 진행 여부를 **액션으로 돌려주고** 순서는
 * 오케스트레이터가 결정한다 (`handleBaseResult`와 같은 패턴).
 *
 * ## fail-soft
 * 개별 실패가 배치 전체를 죽이지 않는다. 실패는 타일을 error로 마킹하고 액션으로 알린다.
 */

const MAX_SAME_RATIO_ATTEMPTS = 2; // 1회 재시도 → 총 2회 시도

export type RatioResultAction =
    /** 같은 비율을 다시 제출하라 (오케스트레이터가 submitRatios를 재호출) */
    | { kind: "retry-ratio"; ratioKey: AdRatioKey; attempt: number }
    /** 이 creative의 모든 비율이 끝났다 → 분석(analyzeCreative)으로 */
    | { kind: "proceed-analysis" }
    /** 이 이벤트 처리 완료. 다음 이벤트를 기다린다 */
    | { kind: "handled" };

export interface HandleRatioResultInput {
    batchId: string;
    creativeIndex: number;
    /** 웹훅 query에서 온 값 (없으면 payload.input.aspect_ratio에서 유도) */
    ratioKey?: string | null;
    attempt?: number;
    payload: ReplicateWebhookPayload;
}

export interface HandleRatioResultOutput {
    action: RatioResultAction;
    note: string;
}

/** query 우선, 없으면 payload의 `aspect_ratio`("4:5") → 저장 키("4_5") */
function resolveRatioKey(
    ratioKey: string | null | undefined,
    payload: ReplicateWebhookPayload,
): AdRatioKey | null {
    if (ratioKey) return ratioKey as AdRatioKey;

    const aspectRatio = payload.input?.aspect_ratio;
    if (typeof aspectRatio === "string" && aspectRatio.length > 0) {
        return aspectRatio.replace(":", "_") as AdRatioKey;
    }
    return null;
}

/** RPC가 실패해도 배치를 죽이지 않는다 (원본 동작 유지) */
async function markRatioCompleted(
    batchId: string,
    creativeIndex: number,
    ratioKey: AdRatioKey,
    fileExtension: string | null,
    imageError?: { code: string; message: string } | null,
): Promise<boolean> {
    try {
        const { isLastCreative } = await adGenerationBatchServerAPI.updateCreativeImageByRatioGenerationCompleted(
            batchId,
            creativeIndex,
            ratioKey,
            fileExtension,
            imageError ?? null,
        );
        return isLastCreative;
    } catch (error) {
        console.error(
            `[handleRatioResult] completion RPC failed (batch=${batchId}, creative=${creativeIndex}, ratio=${ratioKey}):`,
            error,
        );
        return false;
    }
}

export async function handleRatioResult(
    input: HandleRatioResultInput,
): Promise<HandleRatioResultOutput> {
    const { batchId, creativeIndex, payload } = input;
    const attempt = input.attempt && input.attempt > 0 ? input.attempt : 1;

    if (!payload || typeof payload.id !== "string" || typeof payload.status !== "string") {
        throw new StepError("STEP_INTERNAL_ERROR", "Invalid replicatePayload: missing id or status.");
    }

    const effectiveRatioKey = resolveRatioKey(input.ratioKey, payload);

    // ── 실패 경로 ──────────────────────────────────────────────
    if (payload.status !== "succeeded") {
        const errorMessage = payload.error ?? `Replicate status ${payload.status}`;
        console.error(
            `[handleRatioResult] prediction failed (batch=${batchId}, creative=${creativeIndex}, ratio=${effectiveRatioKey}, attempt=${attempt}, status=${payload.status}): ${errorMessage}`,
        );

        if (effectiveRatioKey && attempt < MAX_SAME_RATIO_ATTEMPTS) {
            return {
                action: { kind: "retry-ratio", ratioKey: effectiveRatioKey, attempt: attempt + 1 },
                note: `ratio ${effectiveRatioKey} attempt ${attempt} failed, retrying (n=${MAX_SAME_RATIO_ATTEMPTS})`,
            };
        }

        if (!effectiveRatioKey) {
            return { action: { kind: "handled" }, note: "failed but ratioKey unknown" };
        }

        const isLastCreative = await markRatioCompleted(batchId, creativeIndex, effectiveRatioKey, null, {
            code: `REPLICATE_${payload.status.toUpperCase()}`,
            message: errorMessage,
        });

        return {
            action: isLastCreative ? { kind: "proceed-analysis" } : { kind: "handled" },
            note: `ratio ${effectiveRatioKey} marked as error after n=${MAX_SAME_RATIO_ATTEMPTS} attempts`,
        };
    }

    // ── 성공 경로 ──────────────────────────────────────────────
    if (!effectiveRatioKey) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            "ratioKey is missing (query and payload.input.aspect_ratio both absent).",
        );
    }

    const outputUrl = adImageServerAPI.extractFirstOutputUrl(payload.output);
    if (!outputUrl || typeof outputUrl !== "string") {
        throw new StepError("STEP_INTERNAL_ERROR", "No output URL found in replicate payload.");
    }

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError("BATCH_NOT_FOUND", `Batch not found: ${batchId}`);
    }

    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            `Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`,
        );
    }

    const contentType = imageResponse.headers.get("content-type");
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const fileExtension = adImageServerAPI.inferFileExtension(contentType, outputUrl);

    const filePath = adImageServerAPI.getAdResultImagePath(
        batch.user_id,
        batch.id,
        creativeIndex,
        effectiveRatioKey,
        fileExtension,
    );

    const uploadContentType =
        fileExtension === "jpeg"
            ? "image/jpeg"
            : fileExtension === "png"
              ? "image/png"
              : fileExtension === "webp"
                ? "image/webp"
                : `image/${fileExtension}`;

    try {
        await adImageServerAPI.uploadObject(filePath, imageBuffer, uploadContentType);
    } catch (uploadError) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            `Storage upload failed (${filePath}): ${uploadError instanceof Error ? uploadError.message : "unknown"}`,
        );
    }

    // 과금 원장 — 저장 확정분만 1줄. 중복은 무시, 실패는 로그 후 계속 (유저 플로우 보호)
    try {
        await usageServerAPI.recordImageUsage({
            userId: batch.user_id,
            batchId,
            creativeIndex,
            ratioKey: effectiveRatioKey,
        });
    } catch (ledgerError) {
        console.error(
            `[usage] ledger record failed (batch=${batchId}, creative=${creativeIndex}):`,
            ledgerError,
        );
    }

    const isLastCreative = await markRatioCompleted(batchId, creativeIndex, effectiveRatioKey, fileExtension);

    return {
        action: isLastCreative ? { kind: "proceed-analysis" } : { kind: "handled" },
        note: `ratio ${effectiveRatioKey} stored (${fileExtension})`,
    };
}
