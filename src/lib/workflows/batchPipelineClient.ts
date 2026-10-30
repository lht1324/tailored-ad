import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { BatchPipelineParams } from "@/workflows/batchPipeline";

/**
 * 워크플로 바인딩 접근 헬퍼 — 문(route)들이 쓰는 유일한 진입점.
 *
 * 문은 여기서 "시작" 또는 "이벤트 전달"만 하고, 실제 순서는 워크플로가 소유한다.
 * 바인딩이 없으면(로컬 Node 등) **조용히 넘어가지 않고 throw** 한다 — 이번 사고의 교훈.
 */

/** Replicate 웹훅이 워크플로로 넘기는 이벤트 종류 */
export const REPLICATE_BASE_EVENT = 'replicate-base';

export interface ReplicateBaseEventPayload {
    batchId: string;
    creativeIndex: number;
    ratioKey: string | null;
    attempt: number;
    payload: {
        id: string;
        status: string;
        output?: unknown;
        error?: string | null;
        input?: { aspect_ratio?: string } | null;
    };
}

async function getBinding(): Promise<Workflow<BatchPipelineParams>> {
    const { env } = await getCloudflareContext();
    const binding = (env as unknown as CloudflareEnv).BATCH_PIPELINE;
    if (!binding) {
        throw new Error('BATCH_PIPELINE workflow binding is missing (wrangler.jsonc workflows 확인)');
    }
    return binding;
}

/** 배치 파이프라인 시작 — instance id = batchId (웹훅이 같은 id로 찾는다) */
export async function startBatchPipeline(batchId: string): Promise<void> {
    const binding = await getBinding();
    await binding.create({ id: batchId, params: { batchId } });
}

/** Replicate base 결과를 대기 중인 인스턴스로 전달 */
export async function sendReplicateBaseEvent(payload: ReplicateBaseEventPayload): Promise<void> {
    const binding = await getBinding();
    const instance = await binding.get(payload.batchId);
    await instance.sendEvent({ type: REPLICATE_BASE_EVENT, payload });
}
