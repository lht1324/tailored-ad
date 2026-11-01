/**
 * 워크플로 바인딩 접근 헬퍼 — env를 **인자로** 받는다 (10-31 Vite+Hono 이관).
 *
 * 이전에는 `getCloudflareContext()`로 env를 꺼냈지만, Hono에서는 `c.env`가 정답이다.
 * 그래서 시그니처가 `(env, ...)`로 바뀌었다. 호출부(문)는 `startBatchPipeline(c.env, batchId)`.
 *
 * 바인딩이 없으면 **조용히 넘어가지 않고 throw** 한다 (이번 사고의 교훈).
 *
 * ## 웹훅 → 워크플로 전달 원리
 * 워크플로 인스턴스는 "돌고 있는 프로세스"가 아니다. `step.waitForEvent`에서 **잠들고 상태만 남는다.**
 * 웹훅 핸들러는 `get(batchId)`로 인스턴스를 찾아 `sendEvent`로 **깨우기만** 한다.
 * 인스턴스 id = batchId 라서 이게 가능하다.
 */

export interface BatchPipelineParams {
    batchId: string;
}

/** Replicate 웹훅이 워크플로로 넘기는 이벤트 종류 */
export const REPLICATE_BASE_EVENT = "replicate-base";
export const REPLICATE_RATIO_EVENT = "replicate-ratio";

/** Replicate prediction payload 중 우리가 쓰는 필드만 */
export interface ReplicateWebhookPayload {
    id: string;
    status: string;
    output?: unknown;
    error?: string | null;
    input?: { aspect_ratio?: string } | null;
}

export interface ReplicateBaseEventPayload {
    batchId: string;
    creativeIndex: number;
    ratioKey: string | null;
    attempt: number;
    payload: ReplicateWebhookPayload;
}

export interface ReplicateRatioEventPayload {
    batchId: string;
    creativeIndex: number;
    ratioKey: string | null;
    attempt: number;
    payload: ReplicateWebhookPayload;
}

type EnvWithPipeline = {
    BATCH_PIPELINE?: Workflow<BatchPipelineParams>;
};

function getBinding(env: unknown): Workflow<BatchPipelineParams> {
    const binding = (env as EnvWithPipeline | null)?.BATCH_PIPELINE;
    if (!binding) {
        throw new Error("BATCH_PIPELINE workflow binding is missing (wrangler.jsonc workflows 확인)");
    }
    return binding;
}

/** 배치 파이프라인 시작 — instance id = batchId (웹훅이 같은 id로 찾는다) */
export async function startBatchPipeline(env: unknown, batchId: string): Promise<void> {
    const binding = getBinding(env);
    await binding.create({ id: batchId, params: { batchId } });
}

/** Replicate base 결과를 대기 중인 인스턴스로 전달 */
export async function sendReplicateBaseEvent(env: unknown, payload: ReplicateBaseEventPayload): Promise<void> {
    const binding = getBinding(env);
    const instance = await binding.get(payload.batchId);
    await instance.sendEvent({ type: REPLICATE_BASE_EVENT, payload });
}

/** Replicate 파생(ratio) 결과를 대기 중인 인스턴스로 전달 */
export async function sendReplicateRatioEvent(env: unknown, payload: ReplicateRatioEventPayload): Promise<void> {
    const binding = getBinding(env);
    const instance = await binding.get(payload.batchId);
    await instance.sendEvent({ type: REPLICATE_RATIO_EVENT, payload });
}
