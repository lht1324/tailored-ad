/**
 * 배치 이벤트 **타입** — 서버(발행)와 클라(SSE 수신)가 공유한다.
 *
 * 왜 `worker/lib/batchEvents.ts`에서 분리했나:
 * 그 파일은 Upstash Redis로 **발행**하는 서버 코드다. 클라는 타입만 필요한데,
 * 그대로 import하면 경계(클라가 워커 코드를 못 봄)에 걸린다.
 *
 * 발행 쪽: `worker/lib/batchEvents.ts`
 * 수신 쪽: `src/components/public/useBatchEvents.ts` (SSE)
 */

/** SSE 이벤트 종류 */
export type BatchEventType = "grants" | "batches" | "batch" | "user";

export interface BatchEventMessage {
    type: BatchEventType;
    batchId?: string;
}
