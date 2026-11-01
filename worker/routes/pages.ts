import { Hono, type Context } from "hono";
import { loadSessionUser } from "../middleware/auth";
import type { AppEnv } from "../env";

/**
 * 페이지 가드 — Next의 `src/proxy.ts`를 대체한다 (10-31).
 *
 * ## 왜 워커에서 하나
 * 예전 `proxy.ts`는 Next 미들웨어가 페이지 요청을 가로채 비로그인을 `/sign-in`으로 보냈다.
 * 지금 페이지는 정적 `index.html`이라 **서버가 개입할 지점이 없다.** 클라 가드만 쓰면
 * 보호 화면 HTML이 먼저 보였다가 튕긴다(깜빡임).
 *
 * Cloudflare 문서: 최상위 내비게이션(`Sec-Fetch-Mode: navigate`)은 정적 자산과 매칭되지 않으면
 * **워커가 아니라 `not_found_handling`이 실행된다.** 그래서 보호 경로를 `run_worker_first`에
 * 명시해야 워커가 먼저 받는다 (`wrangler.jsonc`).
 *
 * ## 통과시키는 방법
 * 워커가 받은 요청을 자산 레이어로 되돌린다: `ASSETS.fetch(request)`.
 * index.html 폴백은 자산 레이어가 처리하므로 우리가 라우팅을 흉내내지 않는다.
 */
const pageRoutes = new Hono<{ Bindings: AppEnv }>();

type PageContext = Context<{ Bindings: AppEnv }>;

const SIGN_IN_PATH = "/sign-in";
/** 로그인 후 기본 목적지 (플랜 유무에 따른 분기는 화면 이전에서 붙인다) */
const DEFAULT_AFTER_SIGN_IN = "/projects";

/** 로그인 필요 경로 — `proxy.ts`의 matcher와 동일하게 유지한다 */
const GUARDED_PATHS = ["/create", "/projects", "/profile", "/checkout/success"];

function redirectWithCookies(location: string, setCookies: string[]): Response {
    const headers = new Headers({ Location: location });
    for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie);
    }
    return new Response(null, { status: 302, headers });
}

/**
 * 자산 응답에 Set-Cookie를 덧붙인다.
 * fetch가 돌려준 Response의 헤더는 **immutable**이라 복사본을 만들어야 한다.
 */
function withCookies(response: Response, setCookies: string[]): Response {
    if (setCookies.length === 0) return response;

    const headers = new Headers(response.headers);
    for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/** 정적 자산(index.html 폴백 포함)으로 넘긴다 */
async function serveSpa(context: PageContext): Promise<Response> {
    return context.env.ASSETS.fetch(context.req.raw);
}

/**
 * `/sign-in` — 로그인 상태면 `/projects`로 보낸다 (`proxy.ts`와 동일 동작).
 * 비로그인이면 그대로 로그인 화면.
 */
pageRoutes.get(SIGN_IN_PATH, async (context) => {
    const { user, setCookies } = await loadSessionUser(context.req.raw);

    if (user) {
        return redirectWithCookies(DEFAULT_AFTER_SIGN_IN, setCookies);
    }
    return withCookies(await serveSpa(context), setCookies);
});

/**
 * 보호 경로 — 비로그인이면 원래 경로를 `redirectTo`에 담아 `/sign-in`으로.
 * `/checkout/success`도 포함한다: 결제 후 세션이 끊긴 채 돌아오면 로그인 후 복귀시켜야 한다.
 */
async function handleGuardedPage(context: PageContext): Promise<Response> {
    const { user, setCookies } = await loadSessionUser(context.req.raw);

    if (!user) {
        const url = new URL(context.req.url);
        const signInUrl = new URL(SIGN_IN_PATH, url);
        signInUrl.searchParams.set("redirectTo", `${url.pathname}${url.search}`);
        return redirectWithCookies(`${signInUrl.pathname}${signInUrl.search}`, setCookies);
    }

    return withCookies(await serveSpa(context), setCookies);
}

for (const basePath of GUARDED_PATHS) {
    // Hono의 `/*`는 하위 경로만 잡으므로 루트 경로도 따로 등록한다.
    pageRoutes.get(basePath, handleGuardedPage);
    pageRoutes.get(`${basePath}/*`, handleGuardedPage);
}

export default pageRoutes;
