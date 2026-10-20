import { getServerEnv } from "@/lib/serverEnv";
import { NextRequest, NextResponse } from "next/server";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";

type RouteHandler = (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

// self-fetch 금지: 워커 안에서 자기 도메인으로 fetch하면 edge에서 non-JSON으로 죽는다
// (inner invocation 0건 실측). 같은 프로세스 핸들러를 직접 호출한다.
// cold isolate에서 필요한 route 1개만 파싱한다 (Free 10ms 대응).
// 예전엔 Promise.all로 20개를 전부 올렸고, openai·drizzle 파싱 폭풍에 cold 스타트가 죽었다.
// self-fetch 금지는 그대로라 핸들러 직접 호출은 유지, 로드 시점만 매칭 뒤로 미룬다.
type RouteModule = Record<string, unknown>;
interface RouteEntry {
    method: string;
    pattern: string[];
    load: () => Promise<RouteModule>;
}

const ROUTE_ENTRIES: RouteEntry[] = [
    { method: 'GET', pattern: ['api', 'ad-generation-batches'], load: () => import("@/app/api/ad-generation-batches/route") },
    { method: 'GET', pattern: ['api', 'ad-generation-batches', ':batchId'], load: () => import("@/app/api/ad-generation-batches/[batchId]/route") },
    // 고정 경로는 파라미터(:userId)보다 먼저 — 먼저 매칭된 쪽이 이긴다
    { method: 'GET', pattern: ['api', 'user', 'by-email'], load: () => import("@/app/api/user/by-email/route") },
    { method: 'GET', pattern: ['api', 'user', ':userId'], load: () => import("@/app/api/user/[userId]/route") },
    { method: 'PATCH', pattern: ['api', 'user', ':userId'], load: () => import("@/app/api/user/[userId]/route") },
    { method: 'GET', pattern: ['api', 'profile', 'logo'], load: () => import("@/app/api/profile/logo/route") },
    { method: 'POST', pattern: ['api', 'profile', 'logo'], load: () => import("@/app/api/profile/logo/route") },
    { method: 'DELETE', pattern: ['api', 'profile', 'logo'], load: () => import("@/app/api/profile/logo/route") },
    { method: 'POST', pattern: ['api', 'image'], load: () => import("@/app/api/image/route") },
    { method: 'POST', pattern: ['api', 'image', 'generation', 'base'], load: () => import("@/app/api/image/generation/base/route") },
    { method: 'POST', pattern: ['api', 'image', 'generation', 'ratios'], load: () => import("@/app/api/image/generation/ratios/route") },
    { method: 'POST', pattern: ['api', 'image', 'process', 'base'], load: () => import("@/app/api/image/process/base/route") },
    { method: 'POST', pattern: ['api', 'image', 'process', 'ratios'], load: () => import("@/app/api/image/process/ratios/route") },
    { method: 'POST', pattern: ['api', 'creative', 'specs'], load: () => import("@/app/api/creative/specs/route") },
    { method: 'POST', pattern: ['api', 'creative', ':creative-index', 'prompt'], load: () => import("@/app/api/creative/[creative-index]/prompt/route") },
    { method: 'POST', pattern: ['api', 'creative', ':creative-index', 'analysis'], load: () => import("@/app/api/creative/[creative-index]/analysis/route") },
    { method: 'PATCH', pattern: ['api', 'creative', ':creative-index', 'design'], load: () => import("@/app/api/creative/[creative-index]/design/route") },
    { method: 'POST', pattern: ['api', 'dodo', 'checkouts'], load: () => import("@/app/api/dodo/checkouts/route") },
    { method: 'GET', pattern: ['api', 'dodo', 'products'], load: () => import("@/app/api/dodo/products/route") },
    { method: 'GET', pattern: ['api', 'dodo', 'orders'], load: () => import("@/app/api/dodo/orders/route") },
    { method: 'GET', pattern: ['api', 'dodo', 'subscriptions'], load: () => import("@/app/api/dodo/subscriptions/route") },
    { method: 'POST', pattern: ['api', 'dodo', 'subscriptions', 'change'], load: () => import("@/app/api/dodo/subscriptions/change/route") },
    { method: 'DELETE', pattern: ['api', 'dodo', 'subscriptions', 'cancel'], load: () => import("@/app/api/dodo/subscriptions/cancel/route") },
    { method: 'POST', pattern: ['api', 'dodo', 'subscriptions', 'revert'], load: () => import("@/app/api/dodo/subscriptions/revert/route") },
];

function matchRoute(
    method: string,
    targetPath: string,
): { entry: RouteEntry; params: Record<string, string> } | null {
    const segs = targetPath.split('/').filter((s) => s.length > 0);
    for (const r of ROUTE_ENTRIES) {
        if (r.method !== method || r.pattern.length !== segs.length) continue;
        const params: Record<string, string> = {};
        let ok = true;
        for (let i = 0; i < segs.length; i++) {
            const p = r.pattern[i];
            if (p.startsWith(':')) {
                params[p.slice(1)] = decodeURIComponent(segs[i]);
            } else if (p !== segs[i]) {
                ok = false;
                break;
            }
        }
        if (ok) return { entry: r, params };
    }
    return null;
}

/**
 * Client Gateway Handler
 * Centralized, transparent entry point for Client-to-Server (C2S) requests.
 * Authenticates the session, injects 'userId', and forwards everything else 'as-is'.
 */

// Whitelist for public routes (No authentication required)
// TailoredAd에는 아직 비로그인 공개 API가 없음 — 필요해지면 여기에 추가.
const PUBLIC_ROUTES: { method: string; path: string }[] = [
    // 상품 카탈로그 (가격·이름 공개 마케팅 정보 — 비로그인 랜딩 표시용)
    { method: 'GET', path: '/api/dodo/products' },
];

async function handleGatewayRequest(request: NextRequest) {
    const method = request.method;
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path'); // e.g., "/test"

    if (!targetPath) {
        return getNextBaseResponse({ success: false, status: 400, error: "Missing 'path' param." });
    }

    // 1. Check if the route is public
    // Matches if the whitelist path is either exactly 'targetPath' or '/api' + 'targetPath'
    const isPublic = PUBLIC_ROUTES.some(route =>
        route.method === method && (route.path === targetPath || route.path === `${targetPath}`)
    );

    // 2. Authenticate Session (Always attempt, but enforce only if not public)
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!(isPublic || (isValidRequest && user))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Sign-in required."
        });
    }

    // 3. Inject userId (provide empty string if anonymous but public)
    const userId = user?.id || "";

    // 4. Construct Internal URL & Params (Inject userId into Query)
    const internalParams = new URLSearchParams(searchParams);
    internalParams.delete('path');

    if (!isPublic) {
        internalParams.set('userId', userId); // Always provide userId for internal consumption
    }

    const queryString = internalParams.toString();

    // 4. 내부 디스패치 — userId 주입된 쿼리 그대로 같은 프로세스 핸들러 호출 (self-fetch 금지:
    // 워커 안에서 자기 도메인으로 fetch하면 edge에서 non-JSON으로 죽는다. inner invocation 0건 실측).
    // 매칭된 1개만 로드한다 (cold isolate CPU 절약 — 전부 올리면 Free 10ms 초과로 503).
    const matched = matchRoute(method, targetPath);

    if (!matched) {
        return getNextBaseResponse({
            success: false,
            status: 404,
            error: `No internal route for ${method} ${targetPath}.`,
        });
    }

    const at = (mod: RouteModule, key: string): RouteHandler | undefined =>
        typeof mod[key] === 'function' ? (mod[key] as RouteHandler) : undefined;
    const handler = at(await matched.entry.load(), method);
    if (!handler) {
        return getNextBaseResponse({
            success: false,
            status: 404,
            error: `No internal route for ${method} ${targetPath}.`,
        });
    }

    try {
        const headers = new Headers(request.headers);
        headers.set(
            "x-internal-secret",
            (await getServerEnv('INTERNAL_FIRE_AND_FORGET_API_SECRET')) ?? '',
        );
        headers.delete("content-length");
        const hasBody = method !== 'GET' && method !== 'HEAD';
        const internalReq = new NextRequest(
            `http://internal${targetPath}${queryString ? `?${queryString}` : ""}`,
            {
                method,
                headers,
                body: hasBody ? await request.arrayBuffer() : undefined,
            },
        );
        // 핸들러 응답(기존 success/status envelope 그대로)을 바로 반환
        return await handler(internalReq, { params: Promise.resolve(matched.params) });
    } catch (error) {
        console.error(`[Gateway Error] ${method} ${targetPath}:`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Gateway failed to dispatch the request."
        });
    }
}

export const GET = handleGatewayRequest;
export const POST = handleGatewayRequest;
export const PATCH = handleGatewayRequest;
export const PUT = handleGatewayRequest;
export const DELETE = handleGatewayRequest;
