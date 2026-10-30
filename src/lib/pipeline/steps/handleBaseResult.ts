import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";
import { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { StepError } from "@/lib/pipeline/types";

const MAX_SAME_RATIO_ATTEMPTS = 2; // 1회 재시도 → 총 2회 시도

/**
 * 단계: 기준(base) 이미지 후처리 (원래 `api/image/process/base/route.ts`).
 *
 * **바뀐 점**: 원래는 마지막에 다음 라우트를 `internalFireAndForgetFetch`로 호출했다(자기 zone fetch).
 * 이제는 **다음에 무엇을 할지 반환**하고, 순서는 오케스트레이터(워크플로)가 결정한다.
 *
 * 반환 액션
 *  - `retry-base`       같은 비율 재시도 (attempt < 2)
 *  - `fallback-base`    차순위 base로 폴백
 *  - `proceed-ratios`   파생 비율 단계로 (W2에서 연결)
 *  - `proceed-analysis` 분석 단계로 (비율이 1개뿐일 때, W2에서 연결)
 */

export type BaseResultAction =
    | { kind: 'retry-base'; baseRatio: AdRatioKey; attempt: number }
    | { kind: 'fallback-base'; baseRatio: AdRatioKey }
    | { kind: 'proceed-ratios' }
    | { kind: 'proceed-analysis' };

export interface HandleBaseResultInput {
    batchId: string;
    creativeIndex: number;
    /** webhook query에서 온 값 (없으면 payload.input.aspect_ratio에서 유도) */
    ratioKey?: string | null;
    attempt?: number;
    payload: {
        id: string;
        status: string;
        output?: unknown;
        error?: string | null;
        input?: { aspect_ratio?: string } | null;
    };
}

export interface HandleBaseResultOutput {
    action: BaseResultAction;
    /** 로그·관측용 요약 */
    note: string;
}

function resolveRatioKey(ratioKey: string | null | undefined, payload: HandleBaseResultInput['payload']): string | null {
    if (ratioKey) return ratioKey;
    const fromInput = payload.input?.aspect_ratio;
    if (typeof fromInput === 'string' && fromInput.length > 0) {
        return fromInput.replace(':', '_');
    }
    return null;
}

export async function handleBaseResult(input: HandleBaseResultInput): Promise<HandleBaseResultOutput> {
    const { batchId, creativeIndex, payload } = input;
    const attempt = input.attempt && input.attempt > 0 ? input.attempt : 1;

    if (!payload || typeof payload.id !== 'string' || typeof payload.status !== 'string') {
        throw new StepError('STEP_INTERNAL_ERROR', 'Invalid replicatePayload: missing id or status.');
    }

    // ── 실패 경로 ──────────────────────────────────────────────
    if (payload.status !== 'succeeded') {
        const errorMessage = payload.error ?? `Replicate status ${payload.status}`;
        const effectiveRatioKey = resolveRatioKey(input.ratioKey, payload);

        console.error(`[handleBaseResult] prediction failed (batch=${batchId}, creative=${creativeIndex}, ratio=${effectiveRatioKey}, attempt=${attempt}, status=${payload.status}, error=${errorMessage})`);

        if (effectiveRatioKey && attempt < MAX_SAME_RATIO_ATTEMPTS) {
            return {
                action: { kind: 'retry-base', baseRatio: effectiveRatioKey as AdRatioKey, attempt: attempt + 1 },
                note: `base ${effectiveRatioKey} attempt ${attempt} failed, retrying (n=${MAX_SAME_RATIO_ATTEMPTS})`,
            };
        }

        if (effectiveRatioKey) {
            await adGenerationBatchServerAPI.updateCreativeImageByRatioGenerationCompleted(
                batchId,
                creativeIndex,
                effectiveRatioKey,
                null,
                { code: 'REPLICATE_' + payload.status.toUpperCase(), message: errorMessage },
            ).catch(() => {});
        }

        // 차순위 base 찾기 (실패한 비율도 done으로 간주되므로 제외)
        try {
            const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
            if (batch) {
                const doneKeys = new Set(Object.keys(batch.ad_creative_results?.[creativeIndex]?.imageResults ?? {}));
                const remaining = (batch.aspect_ratios as AdRatioKey[]).filter((key) => !doneKeys.has(key));
                if (remaining.length > 0) {
                    const nextBase = selectBaseRatio(remaining);
                    return {
                        action: { kind: 'fallback-base', baseRatio: nextBase },
                        note: `base ${effectiveRatioKey} exhausted, fallback to ${nextBase}`,
                    };
                }
            }
        } catch { /* 폴백 판정 실패는 무시하고 ratios로 진행 */ }

        return {
            action: { kind: 'proceed-ratios' },
            note: `base ${effectiveRatioKey} failed after n=${MAX_SAME_RATIO_ATTEMPTS}, original-only fallback`,
        };
    }

    // ── 성공 경로 ──────────────────────────────────────────────
    const effectiveRatioKey = resolveRatioKey(input.ratioKey, payload);
    if (!effectiveRatioKey) {
        throw new StepError('STEP_INTERNAL_ERROR', 'ratioKey is missing (query and payload.input.aspect_ratio both absent).');
    }

    const outputUrl = adImageServerAPI.extractFirstOutputUrl(payload.output);
    if (!outputUrl || typeof outputUrl !== 'string') {
        throw new StepError('STEP_INTERNAL_ERROR', 'No output URL found in replicate payload.');
    }

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError('BATCH_NOT_FOUND', `Batch not found: ${batchId}`);
    }

    const { user_id: userId, aspect_ratios: aspectRatios } = batch;

    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
        throw new StepError('STEP_INTERNAL_ERROR', `Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const contentType = imageResponse.headers.get('content-type');
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const fileExtension = adImageServerAPI.inferFileExtension(contentType, outputUrl);

    const filePath = adImageServerAPI.getAdResultImagePath(
        userId,
        batchId,
        creativeIndex,
        effectiveRatioKey as AdRatioKey,
        fileExtension,
    );

    const uploadContentType = fileExtension === 'jpeg'
        ? 'image/jpeg'
        : fileExtension === 'png'
            ? 'image/png'
            : fileExtension === 'webp'
                ? 'image/webp'
                : `image/${fileExtension}`;

    try {
        await adImageServerAPI.uploadObject(filePath, imageBuffer, uploadContentType);
    } catch (uploadError) {
        throw new StepError(
            'STEP_INTERNAL_ERROR',
            `Storage upload failed (${filePath}): ${uploadError instanceof Error ? uploadError.message : 'unknown'}`,
        );
    }

    // 과금 원장 — 저장 확정분만 1줄. 중복 무시, 실패는 로그 후 계속 (유저 플로우 보호)
    try {
        await usageServerAPI.recordImageUsage({ userId, batchId, creativeIndex, ratioKey: effectiveRatioKey });
    } catch (ledgerError) {
        console.error(`[usage] ledger record failed (batch=${batchId}, creative=${creativeIndex}):`, ledgerError);
    }

    await adGenerationBatchServerAPI.updateCreativeImageByRatioGenerationCompleted(
        batchId,
        creativeIndex,
        effectiveRatioKey,
        fileExtension,
    );

    const action: BaseResultAction = aspectRatios.length === 1
        ? { kind: 'proceed-analysis' }
        : { kind: 'proceed-ratios' };

    return { action, note: `base ${effectiveRatioKey} stored (${fileExtension})` };
}
