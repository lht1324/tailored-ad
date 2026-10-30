import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

/**
 * 배치 생성 파이프라인 — **오케스트레이터**.
 *
 * 왜 이 클래스가 존재하나 (`PIPELINE_ARCHITECTURE.md` 참조):
 * - 지금은 route.ts가 다음 route.ts를 `fetch(BASE_URL/...)`로 부른다. Cloudflare Workers는
 *   자기 zone fetch를 금지하므로 prod에서 파이프라인이 한 번도 완주하지 못했다.
 * - 이 클래스가 **순서를 소유**한다. 각 단계는 `src/lib/pipeline/steps/*`의 순수 함수이고,
 *   여기서는 `step.do()`로 감싸 호출만 한다 (HTTP 없음).
 *
 * W0(현재): **골격만**. run()은 아무 일도 하지 않는다. 배포·바인딩·타입이 실제로 붙는지만 확인.
 * W1부터 단계가 하나씩 들어온다:
 *   assignSpecs → prepareCreativePrompt → submitBaseImage → waitForEvent(replicate) → handleBaseResult
 *
 * 규칙 (중요):
 * - 부수효과(API 호출·DB 쓰기·결제)는 **반드시 step.do 안에**. step 밖에 두면 재실행 시 중복된다.
 * - step 반환값은 **1MiB 제한**. 이미지 base64를 반환하지 말고 R2 키만 넘긴다.
 * - 상태 컬럼(designing/completed)은 **SQL RPC가 쓴다**. 여기서 직접 쓰지 않는다.
 */

export interface BatchPipelineParams {
    batchId: string;
}

export class BatchPipeline extends WorkflowEntrypoint<CloudflareEnv, BatchPipelineParams> {
    async run(event: WorkflowEvent<BatchPipelineParams>, step: WorkflowStep): Promise<void> {
        const { batchId } = event.payload;

        // W0 골격 — 실제 단계는 W1에서 연결한다.
        await step.do("w0-skeleton", async () => {
            console.log(`[BatchPipeline] skeleton run for batch ${batchId} (instance ${event.instanceId})`);
            return { batchId, phase: "skeleton" };
        });
    }
}
