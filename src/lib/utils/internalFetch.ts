/**
 * 내부 단계 호출 — **폐기 예정 (파이프라인 이관 시 삭제)**
 *
 * 이전 구현은 `fetch(BASE_URL/api/...)`로 자기 자신을 불렀다. Cloudflare Workers는
 * same-zone subrequest를 거부하므로 prod에서 항상 실패했다(`PIPELINE_AUDIT.md`).
 *
 * 새 구조의 원칙:
 *  - 파이프라인 순서는 **워크플로**(`src/workflows/batchPipeline.ts`)가 소유한다
 *  - 단계 간 호출은 **함수 직접 호출**(`src/lib/pipeline/steps/*`)이지 HTTP가 아니다
 *
 * 그래서 이 헬퍼는 더 이상 필요 없다. 남아 있는 호출부(아직 이관 안 된 라우트)가
 * 조용히 깨지지 않도록 **명시적으로 실패**시킨다.
 */

export class InternalFetchRetiredError extends Error {
    constructor(url: string) {
        super(`internalFireAndForgetFetch is retired — call the pipeline step function directly instead (was: ${url})`);
        this.name = 'InternalFetchRetiredError';
    }
}

export function internalFireAndForgetFetch(url: string, _options?: RequestInit, _body?: unknown): never {
    throw new InternalFetchRetiredError(url);
}
