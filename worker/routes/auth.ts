import { Hono } from "hono";
import { exchangeOAuthCallback, proxyAuthRequest } from "@worker/lib/auth/server";
import type { AppEnv } from "../env";

/**
 * Neon Auth 프록시 — `/api/auth/*`
 *
 * 브라우저의 authClient는 **같은 오리진의 이 경로로만** 통신한다.
 * 여기서 Neon Auth로 중계하므로 클라 번들에 Auth 서버 주소가 필요 없다.
 *
 * ⚠️ 이 라우터는 인증 미들웨어보다 **앞에** 마운트한다 (로그인 전에도 호출되므로).
 */
const authRoutes = new Hono<{ Bindings: AppEnv }>();

/**
 * OAuth 귀환 — 반드시 catch-all보다 **먼저** 등록한다.
 * `verifier`를 세션 쿠키로 교환하고 `/`로 되돌린다.
 */
authRoutes.get("/callback", async (context) => {
    const { setCookies } = await exchangeOAuthCallback(context.req.raw);

    // 로그인 후 목적지 — 내부 경로만 허용 (open redirect 방지)
    const redirectTo = context.req.query("redirectTo");
    const target = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";

    const headers = new Headers({ Location: target });
    for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie);
    }
    // 리다이렉트 응답에 직접 헤더를 붙인다 (Hono의 prepared header 병합에 의존하지 않는다).
    return new Response(null, { status: 302, headers });
});

authRoutes.all("/*", async (context) => {
    // "/api/auth/get-session" → "get-session"
    const path = new URL(context.req.url).pathname.replace(/^\/api\/auth\/?/, "");
    return proxyAuthRequest(context.req.raw, path);
});

export default authRoutes;
