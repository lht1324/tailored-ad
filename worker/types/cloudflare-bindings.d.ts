/**
 * Workflow **바인딩** 타입 (env.BATCH_PIPELINE) — 전역 선언.
 *
 * 왜 필요한가: wrangler가 생성한 `cloudflare-env.d.ts`가 `Workflow<...>`를 참조하는데,
 * `--include-runtime false`로 생성하면 그 타입이 딸려오지 않는다.
 * tsconfig의 `skipLibCheck: true`가 이 누락을 숨기고 있어 컴파일은 통과하지만,
 * 우리 코드에서 `env.BATCH_PIPELINE.create()`를 호출하려면 타입이 필요하다.
 *
 * 이 파일은 모듈이어야 `declare global`이 유효하다(반대인 cloudflare-workers.d.ts는 모듈이면 안 됨).
 */

export {};

declare global {
    interface WorkflowInstance {
        sendEvent(options: { type: string; payload?: unknown }): Promise<void>;
        status(): Promise<{ status: string }>;
    }

    interface Workflow<P = unknown> {
        create(options?: { id?: string; params?: P }): Promise<WorkflowInstance>;
        get(id: string): Promise<WorkflowInstance>;
    }

    /**
     * 정적 자산 바인딩 (`env.ASSETS`) — 최소 선언.
     *
     * 필요한 이유: `run_worker_first`로 페이지 요청을 워커가 받으면, 통과시킬 때
     * 우리가 직접 자산 레이어에 넘겨야 한다(`ASSETS.fetch(request)`).
     * 그때 index.html 폴백(`not_found_handling`)은 자산 레이어가 처리한다.
     */
    interface Fetcher {
        fetch(request: Request): Promise<Response>;
    }
}
