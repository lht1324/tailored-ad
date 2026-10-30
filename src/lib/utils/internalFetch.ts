import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireServerEnv } from "@/lib/serverEnv";
import { dispatchInternal, hasInternalRoute } from "@/lib/internalDispatch";

async function getWaitUntil(): Promise<((promise: Promise<unknown>) => void) | null> {
    try {
        const { ctx } = await getCloudflareContext();
        return (promise: Promise<unknown>) => ctx.waitUntil(promise);
    } catch {
        // Local dev or non-Cloudflare runtime: no lifetime extension available.
        // The work below still runs; only the guarantee is skipped.
        return null;
    }
}

/**
 * 내부 단계 호출 (fire-and-forget).
 *
 * **10-31 변경 — 자기 zone fetch 제거.** 기존 구현은 `fetch(BASE_URL/...)`였는데,
 * prod의 BASE_URL은 워커 자신이라 Cloudflare가 same-zone subrequest를 거부한다
 * (공식 한도 문서). 그래서 파이프라인이 prod에서 **한 번도 완주하지 못했다**(`PIPELINE_AUDIT.md`).
 *
 * 새 동작:
 *  1. `internalDispatch` 표에 있는 경로 → **HTTP 없이 핸들러 직접 호출** (in-process)
 *  2. 표에 없는 경로 → 기존처럼 실제 fetch (외부 도메인 호출용 여지)
 *
 * 시그니처는 그대로다 (호출부 19곳 무수정).
 */
export async function internalFireAndForgetFetch(url: string, options: RequestInit = {}, body?: unknown) {
    const work = (async () => {
        const secret = (await requireServerEnv('INTERNAL_FIRE_AND_FORGET_API_SECRET')) ?? '';
        const target = new URL(url, 'https://internal.local');
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'x-internal-secret': secret,
            ...(options.headers as Record<string, string> | undefined ?? {}),
        };
        const serializedBody = body === undefined ? null : JSON.stringify(body ?? {}, null, 2);

        try {
            if (hasInternalRoute(target.pathname)) {
                const response = await dispatchInternal(target.pathname, target.search, {
                    headers,
                    body: serializedBody,
                });
                if (!response.ok) {
                    // 조용한 실패 금지 — 이번 사고의 핵심 교훈
                    console.error(`[Internal Dispatch] ${target.pathname} responded ${response.status}`);
                }
                return;
            }

            const response = await fetch(url, {
                ...options,
                headers,
                ...(serializedBody != null ? { body: serializedBody } : {}),
            });
            if (!response.ok) {
                console.error(`[Internal Fetch] ${target.pathname} responded ${response.status}`);
            }
        } catch (error) {
            console.error(`[Internal Dispatch Error] ${target.pathname}:`, error);
        }
    })();

    void getWaitUntil()
        .then((waitUntil) => waitUntil?.(work))
        .catch(() => {});
}
