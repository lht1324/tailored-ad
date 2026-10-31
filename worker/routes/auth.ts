import { Hono } from "hono";
import { proxyAuthRequest } from "@/lib/auth/server";
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

authRoutes.all("/*", async (context) => {
    // "/api/auth/get-session" → "get-session"
    const path = new URL(context.req.url).pathname.replace(/^\/api\/auth\/?/, "");
    return proxyAuthRequest(context.req.raw, path);
});

export default authRoutes;
