import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { assignSpecs } from "@/lib/pipeline/steps/assignSpecs";
import { prepareCreativePrompt } from "@/lib/pipeline/steps/prepareCreativePrompt";
import { submitBaseImage } from "@/lib/pipeline/steps/submitBaseImage";
import { handleBaseResult } from "@/lib/pipeline/steps/handleBaseResult";
import { REPLICATE_BASE_EVENT, type ReplicateBaseEventPayload } from "@/lib/workflows/batchPipelineClient";

/**
 * 배치 생성 파이프라인 — **오케스트레이터**.
 *
 * 왜 이 클래스가 존재하나 (`PIPELINE_ARCHITECTURE.md`):
 * - 기존에는 route.ts가 다음 route.ts를 `fetch(BASE_URL/...)`로 불렀다. Cloudflare는
 *   자기 zone fetch를 거부하므로 **prod에서 파이프라인이 한 번도 완주하지 못했다**.
 * - 이제 순서는 이 클래스가 소유한다. 각 단계는 `src/lib/pipeline/steps/*`의 순수 함수이고,
 *   여기서는 `step.do()`로 감싸 호출만 한다 (HTTP 없음).
 *
 * W1 범위: assign → creative별 prompt·submit → base 결과 대기·후처리.
 *   ratios/analysis 는 W2에서 연결한다(지금은 로그만 남기고 종료).
 *
 * 규칙:
 * - 부수효과(API·DB·결제)는 **반드시 step.do 안에**. 밖에 두면 재실행 시 중복된다.
 * - step 반환값은 **1MiB 제한**. 이미지 base64를 반환하지 않고 R2 키/메타만 넘긴다.
 * - 상태 컬럼(`designing`/`completed`)은 **SQL RPC가 쓴다**. 여기서 직접 쓰지 않는다.
 */

export interface BatchPipelineParams {
    batchId: string;
}

export class BatchPipeline extends WorkflowEntrypoint<CloudflareEnv, BatchPipelineParams> {
    async run(event: WorkflowEvent<BatchPipelineParams>, step: WorkflowStep): Promise<void> {
        const { batchId } = event.payload;

        // 1) 조합 배정 (queued → generating)
        const assigned = await step.do('assign-specs', () => assignSpecs({ batchId }));

        // 2) creative별 프롬프트 생성 + base 제출
        const pending = new Set<number>();
        for (let creativeIndex = 0; creativeIndex < assigned.creativeCount; creativeIndex++) {
            await step.do(`prompt-${creativeIndex}`, () =>
                prepareCreativePrompt({ batchId, creativeIndex }));

            const submitted = await step.do(`submit-base-${creativeIndex}`, () =>
                submitBaseImage({ batchId, creativeIndex, attempt: 1 }));

            if (submitted.submitted) {
                pending.add(creativeIndex);
            } else {
                // fail-soft — 제출 실패한 creative는 웹훅이 오지 않으므로 대기 대상에서 제외
                console.error(`[BatchPipeline] base submit failed (batch=${batchId}, creative=${creativeIndex}): ${submitted.error}`);
            }
        }

        // 3) base 결과를 기다리며 후처리 (재시도·폴백 포함)
        let seq = 0;
        while (pending.size > 0) {
            const ev = await step.waitForEvent<ReplicateBaseEventPayload>(`base-event-${seq}`, {
                type: REPLICATE_BASE_EVENT,
                timeout: '20 minutes',
            });
            const p = ev.payload;

            const handled = await step.do(`handle-base-${seq}`, () => handleBaseResult({
                batchId,
                creativeIndex: p.creativeIndex,
                ratioKey: p.ratioKey,
                attempt: p.attempt,
                payload: p.payload,
            }));

            const action = handled.action;
            if (action.kind === 'retry-base') {
                await step.do(`retry-base-${seq}`, () => submitBaseImage({
                    batchId,
                    creativeIndex: p.creativeIndex,
                    attempt: action.attempt,
                    baseRatio: action.baseRatio,
                }));
            } else if (action.kind === 'fallback-base') {
                await step.do(`fallback-base-${seq}`, () => submitBaseImage({
                    batchId,
                    creativeIndex: p.creativeIndex,
                    attempt: 1,
                    baseRatio: action.baseRatio,
                }));
            } else {
                pending.delete(p.creativeIndex);
                // W2에서 연결: ratios(다중 비율) / analysis(단일 비율)
                console.log(`[BatchPipeline] creative ${p.creativeIndex} base done → ${action.kind} (W2 pending)`);
            }
            seq += 1;
        }
    }
}
