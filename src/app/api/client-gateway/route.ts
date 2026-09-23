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
async function loadHandlers(): Promise<Array<{ method: string; pattern: string[]; handler: RouteHandler }>> {
    const [
        adBatches,
        adBatchById,
        userById,
        image,
        imageGenBase,
        imageGenRatios,
        imageProcessBase,
        imageProcessRatios,
        creativeSpecs,
        creativePrompt,
        creativeAnalysis,
        creativeDesign,
        polarCheckouts,
        polarProcess,
    ] = await Promise.all([
        import("@/app/api/ad-generation-batches/route"),
        import("@/app/api/ad-generation-batches/[batchId]/route"),
        import("@/app/api/user/[userId]/route"),
        import("@/app/api/image/route"),
        import("@/app/api/image/generation/base/route"),
        import("@/app/api/image/generation/ratios/route"),
        import("@/app/api/image/process/base/route"),
        import("@/app/api/image/process/ratios/route"),
        import("@/app/api/creative/specs/route"),
        import("@/app/api/creative/[creative-index]/prompt/route"),
        import("@/app/api/creative/[creative-index]/analysis/route"),
        import("@/app/api/creative/[creative-index]/design/route"),
        import("@/app/api/polar/checkouts/route"),
        import("@/app/api/polar/process/route"),
    ]);
    const at = (mod: Record<string, unknown>, key: string): RouteHandler | undefined =>
        typeof mod[key] === 'function' ? (mod[key] as RouteHandler) : undefined;
    const entries: Array<{ method: string; pattern: string[]; mod: Record<string, unknown> }> = [
        { method: 'GET', pattern: ['api', 'ad-generation-batches'], mod: adBatches as unknown as Record<string, unknown> },
        { method: 'GET', pattern: ['api', 'ad-generation-batches', ':batchId'], mod: adBatchById as unknown as Record<string, unknown> },
        { method: 'GET', pattern: ['api', 'user', ':userId'], mod: userById as unknown as Record<string, unknown> },
        { method: 'PATCH', pattern: ['api', 'user', ':userId'], mod: userById as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'image'], mod: image as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'image', 'generation', 'base'], mod: imageGenBase as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'image', 'generation', 'ratios'], mod: imageGenRatios as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'image', 'process', 'base'], mod: imageProcessBase as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'image', 'process', 'ratios'], mod: imageProcessRatios as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'creative', 'specs'], mod: creativeSpecs as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'creative', ':creative-index', 'prompt'], mod: creativePrompt as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'creative', ':creative-index', 'analysis'], mod: creativeAnalysis as unknown as Record<string, unknown> },
        { method: 'PATCH', pattern: ['api', 'creative', ':creative-index', 'design'], mod: creativeDesign as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'polar', 'checkouts'], mod: polarCheckouts as unknown as Record<string, unknown> },
        { method: 'POST', pattern: ['api', 'polar', 'process'], mod: polarProcess as unknown as Record<string, unknown> },
    ];
    const out: Array<{ method: string; pattern: string[]; handler: RouteHandler }> = [];
    for (const e of entries) {
        const handler = at(e.mod, e.method);
        if (handler) out.push({ method: e.method, pattern: e.pattern, handler });
    }
    return out;
}

function matchRoute(
    routes: Array<{ method: string; pattern: string[]; handler: RouteHandler }>,
    method: string,
    targetPath: string,
): { handler: RouteHandler; params: Record<string, string> } | null {
    const segs = targetPath.split('/').filter((s) => s.length > 0);
    for (const r of routes) {
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
        if (ok) return { handler: r.handler, params };
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
    // 워커 안에서 자기 도메인으로 fetch하면 edge에서 non-JSON으로 죽는다. inner invocation 0건 실측)
    const routes = await loadHandlers();
    const matched = matchRoute(routes, method, targetPath);

    if (!matched) {
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
        return await matched.handler(internalReq, { params: Promise.resolve(matched.params) });
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
