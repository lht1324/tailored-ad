import { createMiddleware } from "hono/factory";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getAuthForRequest } from "@/lib/auth/server";
import { getBaseResponse } from "@/lib/utils/getBaseResponse";
import type { User } from "@shared/types/supabase/Users";
import type { AppEnv } from "../env";

/**
 * 세션 인증 — C2S 검증을 **한 곳**에서 처리한다.
 *
 * 예전에는 `client-gateway`가 이 역할을 했다(라우트마다 C2S/S2S를 구분하는 게
 * 감당이 안 돼서 게이트웨이 한 곳에 몰았던 구조). Hono에서는 미들웨어가 그 자리다.
 *
 * ## 두 가지 소비자
 * 1. `requireSession` — API(`/api/*`). 실패하면 **JSON 401**
 * 2. `loadSessionUser` — 페이지 가드(`worker/routes/pages.ts`). 실패하면 **리다이렉트**
 *    (페이지 요청에 JSON 401을 주면 브라우저에 `{"success":false...}`가 그대로 보인다)
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

export interface SessionResolution {
    /** 우리 DB의 유저 행 (없거나 미로그인이면 null) */
    user: User | null;
    /** 세션 갱신 시 라이브러리가 심으려는 Set-Cookie — 호출부가 응답에 붙여야 한다 */
    setCookies: string[];
    /** 세션 조회 자체가 실패했는지 (네트워크·설정 오류) */
    failed: boolean;
}

/**
 * 세션 → 우리 `users` 행. 미로그인이면 `user: null`.
 * 세션이 유효한데 행이 없으면(콜백 미경유) 최소 행을 만든다.
 */
export async function loadSessionUser(request: Request): Promise<SessionResolution> {
    const setCookies: string[] = [];

    let sessionUser: SessionUser | null = null;
    try {
        const auth = await getAuthForRequest({ request, setCookies });
        const { data } = await auth.getSession();
        sessionUser = (data?.user ?? null) as SessionUser | null;
    } catch (error) {
        console.error("[auth] session check failed:", error);
        return { user: null, setCookies, failed: true };
    }

    const email = sessionUser?.email;
    if (!email) {
        return { user: null, setCookies, failed: false };
    }

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

    return { user: user ?? null, setCookies, failed: false };
}

/** API용 — 인증 실패 시 즉시 JSON 401 (라우트 핸들러는 실행되지 않는다) */
export const requireSession = createMiddleware<{
    Bindings: AppEnv;
    Variables: AuthVariables;
}>(async (context, next) => {
    const { user, setCookies, failed } = await loadSessionUser(context.req.raw);

    // 세션 갱신 쿠키는 성공/실패와 무관하게 반영한다.
    for (const cookie of setCookies) {
        context.header("Set-Cookie", cookie, { append: true });
    }

    if (failed) {
        return getBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Session check failed.",
        });
    }

    if (!user) {
        return getBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Sign-in required.",
        });
    }

    context.set("user", user);
    await next();
});
