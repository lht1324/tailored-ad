import {
    createAuthServer,
    DEFAULT_AUTH_SKIP_ROUTES,
    extractNeonAuthCookies,
    handleAuthProxyRequest,
    processAuthMiddleware,
    serializeSetCookie,
} from "@neondatabase/auth/server";
import { requireServerEnv } from "@worker/lib/serverEnv";

/**
 * Neon Auth 서버 — **Hono 어댑터** (10-31 이관).
 *
 * 기존에는 `@neondatabase/auth/next/server`의 `createNeonAuth()`를 썼는데,
 * 그 어댑터는 `next/headers`의 쿠키 스토어에 의존해서 Vite+Hono에서 못 쓴다.
 * 대신 `@neondatabase/auth/server`의 **프레임워크 비의존 API**를 직접 배선한다.
 *
 * ## 두 가지 역할
 * 1. `proxyAuthRequest`  — `/api/auth/*` → Neon Auth 프록시 (로그인·OAuth·세션 갱신)
 * 2. `getAuthForRequest` — 미들웨어에서 세션 **읽기** (`getSession()`)
 *
 * ## 왜 요청마다 인스턴스를 만드나
 * 라이브러리는 `context` 팩토리를 **메서드 호출마다** 부른다. 그 팩토리가
 * "지금 이 요청"의 쿠키/헤더를 읽어야 하는데, Workers는 한 isolate가 여러 요청을
 * 동시에 처리하므로 **모듈 전역에 요청을 담으면 섞인다**.
 * 그래서 요청을 클로저로 잡은 인스턴스를 요청마다 만든다 (생성 자체는 가볍다).
 *
 * ## Set-Cookie
 * 라이브러리는 쿠키를 직접 못 심는다(프레임워크마다 API가 다르므로).
 * `setCookie` 콜백으로 알려주므로, 여기서 직렬화해 배열에 모은다.
 * 호출부(미들웨어)가 그 배열을 응답 헤더에 붙인다.
 */

export interface AuthRequestInput {
    /** 원본 요청 — 쿠키·헤더를 읽는다 */
    request: Request;
    /** 라이브러리가 심으려는 Set-Cookie 문자열을 모아둘 배열 (호출부가 소유) */
    setCookies: string[];
}

async function readAuthEnv(): Promise<{ baseUrl: string; cookieSecret: string }> {
    return {
        baseUrl: await requireServerEnv("NEON_AUTH_BASE_URL"),
        cookieSecret: await requireServerEnv("NEON_AUTH_COOKIE_SECRET"),
    };
}

/** `Origin` 헤더, 없으면 `Referer`의 앞 3조각 (Neon Auth가 CORS/신뢰 오리진 검사에 쓴다) */
function resolveOrigin(headers: Headers): string {
    const origin = headers.get("origin");
    if (origin) return origin;
    const referer = headers.get("referer");
    if (!referer) return "";
    return referer.split("/").slice(0, 3).join("/");
}

/** 세션 읽기용 인스턴스. 응답에 쿠키를 심지 않는다 — `setCookies`를 호출부가 처리. */
export async function getAuthForRequest({ request, setCookies }: AuthRequestInput) {
    const { baseUrl, cookieSecret } = await readAuthEnv();

    return createAuthServer({
        baseUrl,
        cookieSecret,
        context: () => {
            const headers = request.headers;
            return {
                getCookies: () => extractNeonAuthCookies(headers),
                setCookie: (name: string, value: string, options: Record<string, unknown>) => {
                    setCookies.push(
                        serializeSetCookie({ name, value, ...options } as Parameters<typeof serializeSetCookie>[0]),
                    );
                },
                getHeader: (name: string) => headers.get(name) ?? null,
                getOrigin: () => resolveOrigin(headers),
                getFramework: () => "hono",
            };
        },
    });
}

/**
 * `/api/auth/*` 프록시 — 로그인·회원가입·OAuth 콜백·세션 갱신을 Neon Auth로 중계한다.
 * 반환된 Response의 `Set-Cookie`가 브라우저로 그대로 전달된다.
 */
export async function proxyAuthRequest(request: Request, path: string): Promise<Response> {
    const { baseUrl, cookieSecret } = await readAuthEnv();
    return handleAuthProxyRequest({ request, path, baseUrl, cookieSecret });
}

/**
 * OAuth 귀환 처리 — `GET /api/auth/callback?neon_auth_session_verifier=...`
 *
 * ## 왜 필요한가
 * 소셜 로그인은 세션 쿠키를 **Neon Auth 도메인**에 심는다. 우리 오리진에는 안 온다.
 * 그 간극을 메우는 게 `neon_auth_session_verifier`이고, 이걸 세션으로 **교환**해야 한다.
 *
 * ## 왜 워커에서 하나
 * 교환은 **서버 코드**에서 해야 한다(쿠키 서명·Set-Cookie 발급). SDK는 보통 "페이지 요청"에
 * 붙는 프레임워크 미들웨어에서 처리하지만, 우리 워커는 `run_worker_first: ["/api/*"]`라
 * 페이지 요청을 받지 못한다. 그래서 `callbackURL`을 **API 경로**로 두고 여기서 교환한다.
 *
 * 반환값의 `setCookies`를 호출부가 응답 헤더에 붙이고 `/`로 리다이렉트하면 끝이다.
 * (구 프로젝트의 `/callback/auth` + `/callback/session` 2단 구성이 이 한 곳으로 합쳐졌다.)
 */
export async function exchangeOAuthCallback(request: Request): Promise<{ setCookies: string[] }> {
    const { baseUrl, cookieSecret } = await readAuthEnv();

    const result = await processAuthMiddleware({
        request,
        pathname: new URL(request.url).pathname,
        // /api/auth 는 인증 대상이 아니므로 "allow"로 떨어지고, 그 전에 verifier 교환이 수행된다.
        skipRoutes: DEFAULT_AUTH_SKIP_ROUTES,
        loginUrl: "/",
        baseUrl,
        cookieSecret,
    });

    return { setCookies: result.cookies ?? [] };
}
