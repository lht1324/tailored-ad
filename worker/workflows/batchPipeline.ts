import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { assignSpecs } from "@worker/lib/pipeline/steps/assignSpecs";
import { prepareCreativePrompt } from "@worker/lib/pipeline/steps/prepareCreativePrompt";
import { submitBaseImage } from "@worker/lib/pipeline/steps/submitBaseImage";
import { handleBaseResult } from "@worker/lib/pipeline/steps/handleBaseResult";
import {
    REPLICATE_BASE_EVENT,
    type ReplicateBaseEventPayload,
} from "@worker/lib/workflows/batchPipelineClient";
import { bindEnv } from "@worker/lib/serverEnv";
import type { AppEnv } from "../env";

/**
 * 배치 생성 파이프라인 — **오케스트레이터(공장 라인)**.
 *
 * ## 왜 이 클래스가 있나 (`PIPELINE_ARCHITECTURE.md`)
 * 예전에는 route.ts가 다음 route.ts를 `fetch(BASE_URL/...)`로 불렀다. Cloudflare는 자기 zone
 * fetch를 거부하므로 **prod에서 파이프라인이 한 번도 완주하지 못했다.**
 * 이제 순서는 이 클래스가 소유한다. 각 단계는 `worker/lib/pipeline/steps/*`의 함수이고,
 * 여기서는 `step.do()`로 감싸 호출만 한다 (HTTP 없음).
 *
 * ## 라인에 두는 것 / 두지 않는 것
 * - 여기: **순서와 분기**만. 기계(step) 이름이 줄줄이 보이면 성공이다.
 * - 여기 아님: DB 조회, 입력 검증, `Response` 생성, `fetch`.
 *
 * ## 규칙 (어기면 실제 사고가 난다)
 * - 부수효과(API·DB·결제)는 **반드시 `step.do` 안에**. 밖에 두면 재실행 시 중복된다.
 * - `step.do` 결과는 저장돼 **재실행 시 재사용**된다 → 재실행에서 과금이 두 번 나가지 않는다.
 * - 반환값은 **1MiB 제한**. 이미지 base64 금지 — R2 키/메타만 넘긴다.
 * - 상태 컬럼(`designing`/`completed`)은 **SQL RPC가 쓴다**. 여기서 직접 쓰지 않는다.
 * - `Math.random()`·`Date.now()`를 step 밖에서 쓰지 않는다 (재실행 시 분기가 갈린다).
 *
 * ## 웹훅이 어떻게 여기로 들어오나
 * 인스턴스는 실행 중 프로세스가 아니다. `step.waitForEvent`에서 **잠들고 상태만 남는다.**
 * Replicate가 `/api/webhook/replicate/*`를 부르면 그 핸들러가 `instance.sendEvent()`로
 * 깨운다. 인스턴스 id = batchId (`worker/lib/workflows/batchPipelineClient.ts`).
 *
 * ## 범위
 * W1: assign → creative별 prompt·base 제출 → base 결과 대기·후처리.
 * W2에서 ratios/analysis 연결. W3에서 persona·크레딧.
 */
export interface BatchPipelineParams {
    batchId: string;
}

export class BatchPipeline extends WorkflowEntrypoint<AppEnv, BatchPipelineParams> {
    async run(event: WorkflowEvent<BatchPipelineParams>, step: WorkflowStep): Promise<void> {
        // 요청이 없는 컨텍스트라 미들웨어가 안 돈다 — 여기서 직접 바인딩한다.
        bindEnv(this.env);

        const { batchId } = event.payload;

        // 1) 조합 배정 (queued → generating)
        const assigned = await step.do("assign-specs", () => assignSpecs({ batchId }));

        // 2) creative별 프롬프트 생성 + base 제출
        const pending = new Set<number>();
        for (let creativeIndex = 0; creativeIndex < assigned.creativeCount; creativeIndex++) {
            await step.do(`prompt-${creativeIndex}`, () =>
                prepareCreativePrompt({ batchId, creativeIndex }),
            );

            const submitted = await step.do(`submit-base-${creativeIndex}`, () =>
                submitBaseImage({ batchId, creativeIndex, attempt: 1 }),
            );

            if (submitted.submitted) {
                pending.add(creativeIndex);
            } else {
                // fail-soft — 제출 실패한 creative는 웹훅이 오지 않으므로 대기 대상에서 제외
                console.error(
                    `[BatchPipeline] base submit failed (batch=${batchId}, creative=${creativeIndex}): ${submitted.error}`,
                );
            }
        }

        // 3) base 결과를 기다리며 후처리 (재시도·폴백 포함)
        let seq = 0;
        while (pending.size > 0) {
            const workflowEvent = await step.waitForEvent<ReplicateBaseEventPayload>(`base-event-${seq}`, {
                type: REPLICATE_BASE_EVENT,
                timeout: "20 minutes",
            });
            const payload = workflowEvent.payload;

            const handled = await step.do(`handle-base-${seq}`, () =>
                handleBaseResult({
                    batchId,
                    creativeIndex: payload.creativeIndex,
                    ratioKey: payload.ratioKey,
                    attempt: payload.attempt,
                    payload: payload.payload,
                }),
            );

            const action = handled.action;
            if (action.kind === "retry-base") {
                await step.do(`retry-base-${seq}`, () =>
                    submitBaseImage({
                        batchId,
                        creativeIndex: payload.creativeIndex,
                        attempt: action.attempt,
                        baseRatio: action.baseRatio,
                    }),
                );
            } else if (action.kind === "fallback-base") {
                await step.do(`fallback-base-${seq}`, () =>
                    submitBaseImage({
                        batchId,
                        creativeIndex: payload.creativeIndex,
                        attempt: 1,
                        baseRatio: action.baseRatio,
                    }),
                );
            } else {
                pending.delete(payload.creativeIndex);
                // TODO(W2): ratios(다중 비율) / analysis(단일 비율) 연결
                console.log(
                    `[BatchPipeline] creative ${payload.creativeIndex} base done → ${action.kind} (W2 pending)`,
                );
            }
            seq += 1;
        }
    }
}
