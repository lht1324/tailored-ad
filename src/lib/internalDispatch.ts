import type { NextRequest } from "next/server";

/**
 * **in-process 내부 디스패처** — 자기 zone fetch 대체.
 *
 * 왜 필요한가 (`PIPELINE_AUDIT.md` §2):
 *  - Cloudflare Workers 한도 문서: "Using global `fetch()` to call another Worker on the
 *    same zone **without service bindings fails**." prod의 `BASE_URL`은 자기 자신이라
 *    기존 `internalFireAndForgetFetch`는 **항상 실패**했다(조용히 삼켜짐).
 *  - 그래서 HTTP를 타지 않고 **같은 isolate 안에서 핸들러 함수를 직접 호출**한다.
 *    네트워크 0, 공개 URL 0, zone 제약 0.
 *
 * 위치: 이 파일은 `client-gateway`가 쓰던 방식(경로 매칭 → lazy import → 직접 호출)을
 * 내부 호출 전용으로 뽑은 것이다. 게이트웨이 리팩터는 별도 과제(W5 이후).
 *
 * ⚠️ 임시 다리(temporary bridge): 이 표에 있는 라우트는 아직 "문"으로 존재하며,
 *    오케스트레이터(W2~W3)가 단계를 직접 함수로 부르면 그때 항목과 라우트를 함께 지운다.
 *    새 내부 호출을 추가할 때는 **표에 1줄**을 반드시 넣어야 한다(누락 시 조용한 실패).
 */

type RouteHandler = (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

interface RouteEntry {
    method: 'POST';
    pattern: string[];
    load: () => Promise<Record<string, unknown>>;
}

const ROUTE_ENTRIES: RouteEntry[] = [
    { method: 'POST', pattern: ['api', 'creative', 'specs'], load: () => import("@/app/api/creative/specs/route") },
    { method: 'POST', pattern: ['api', 'creative', ':creativeIndex', 'prompt'], load: () => import("@/app/api/creative/[creative-index]/prompt/route") },
    { method: 'POST', pattern: ['api', 'creative', ':creativeIndex', 'analysis'], load: () => import("@/app/api/creative/[creative-index]/analysis/route") },
    { method: 'POST', pattern: ['api', 'image', 'generation', 'base'], load: () => import("@/app/api/image/generation/base/route") },
    { method: 'POST', pattern: ['api', 'image', 'generation', 'ratios'], load: () => import("@/app/api/image/generation/ratios/route") },
    { method: 'POST', pattern: ['api', 'image', 'generation', 'persona'], load: () => import("@/app/api/image/generation/persona/route") },
    { method: 'POST', pattern: ['api', 'image', 'process', 'base'], load: () => import("@/app/api/image/process/base/route") },
    { method: 'POST', pattern: ['api', 'image', 'process', 'ratios'], load: () => import("@/app/api/image/process/ratios/route") },
    { method: 'POST', pattern: ['api', 'image', 'process', 'persona'], load: () => import("@/app/api/image/process/persona/route") },
    { method: 'POST', pattern: ['api', 'dodo', 'process'], load: () => import("@/app/api/dodo/process/route") },
];

function matchRoute(targetPath: string): { entry: RouteEntry; params: Record<string, string> } | null {
    const segs = targetPath.split('/').filter((s) => s.length > 0);
    for (const entry of ROUTE_ENTRIES) {
        if (entry.pattern.length !== segs.length) continue;
        const params: Record<string, string> = {};
        let ok = true;
        for (let i = 0; i < segs.length; i++) {
            const p = entry.pattern[i];
            if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segs[i]);
            else if (p !== segs[i]) { ok = false; break; }
        }
        if (ok) return { entry, params };
    }
    return null;
}

/** 표에 있는 경로인지 (없으면 호출부가 fetch 폴백 여부를 판단) */
export function hasInternalRoute(pathname: string): boolean {
    return matchRoute(pathname) !== null;
}

/**
 * 경로로 핸들러를 찾아 직접 호출한다. 응답(Response)을 그대로 돌려준다.
 * 경로 미매칭은 **throw** — 조용히 아무것도 안 하는 것을 막는다.
 */
export async function dispatchInternal(
    pathname: string,
    search: string,
    options: { headers: Record<string, string>; body?: string | null },
): Promise<Response> {
    const matched = matchRoute(pathname);
    if (!matched) {
        throw new Error(`[internalDispatch] no route for POST ${pathname}`);
    }

    const mod = await matched.entry.load();
    const handler = mod['POST'];
    if (typeof handler !== 'function') {
        throw new Error(`[internalDispatch] route has no POST handler: ${pathname}`);
    }

    const req = new Request(`https://internal${pathname}${search}`, {
        method: 'POST',
        headers: options.headers,
        ...(options.body != null ? { body: options.body } : {}),
    }) as unknown as NextRequest;

    return (handler as RouteHandler)(req, { params: Promise.resolve(matched.params) });
}
