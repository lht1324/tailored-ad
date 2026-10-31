import { createMiddleware } from "hono/factory";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getAuthForRequest } from "@/lib/auth/server";
import { getBaseResponse } from "@/lib/utils/getBaseResponse";
import type { User } from "@/lib/api/types/supabase/Users";
import type { AppEnv } from "../env";

/**
 * 세션 인증 미들웨어 — C2S 검증을 **한 곳**에서 처리한다.
 *
 * 예전에는 `client-gateway`가 이 역할을 했다(라우트마다 C2S/S2S를 구분하는 게
 * 감당이 안 돼서 게이트웨이 한 곳에 몰았던 구조). Hono에서는 미들웨어가 그 자리다.
 *
 * 흐름: 세션 쿠키 → Neon Auth `getSession()` → email → 우리 `users` 행 → `context.set("user")`
 * 실패하면 401을 **즉시 반환**한다 (라우트 핸들러는 실행되지 않는다).
 *
 * 라우트에서는 `context.get("user")`로 꺼내 쓴다. `userId`를 쿼리로 받지 않으므로
 * "경로 userId 대조( IDOR )" 같은 방어 코드도 필요 없다.
 */

export type AuthVariables = {
    user: User;
};

/** Neon Auth 세션에서 우리가 쓰는 필드만 */
type SessionUser = {
    email?: string | null;
    name?: string | null;
    image?: string | null;
};

export const requireSession = createMiddleware<{
    Bindings: AppEnv;
    Variables: AuthVariables;
}>(async (context, next) => {
    const setCookies: string[] = [];

    let sessionUser: SessionUser | null = null;

    try {
        const auth = await getAuthForRequest({ request: context.req.raw, setCookies });
        const { data } = await auth.getSession();
        sessionUser = (data?.user ?? null) as SessionUser | null;
    } catch (error) {
        console.error("[middleware/auth] session check failed:", error);
        return getBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Session check failed.",
        });
    }

    // 세션 갱신 쿠키는 성공/실패와 무관하게 반영한다.
    for (const cookie of setCookies) {
        context.header("Set-Cookie", cookie, { append: true });
    }

    const email = sessionUser?.email;
    if (!email) {
        return getBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Sign-in required.",
        });
    }

    // 세션은 유효한데 우리 행이 없는 경우(콜백 미경유) 최소 행을 만든다.
    let user = await usersServerAPI.getUserByEmail(email);
    if (!user) {
        const created = await usersServerAPI.postUsers({
            email,
            name: sessionUser?.name ?? "",
            avatar_url: sessionUser?.image ?? "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        user = created ?? (await usersServerAPI.getUserByEmail(email));
    }

    if (!user) {
        return getBaseResponse({
            success: false,
            status: 500,
            error: "Failed to resolve user profile.",
        });
    }

    context.set("user", user);
    await next();
});
