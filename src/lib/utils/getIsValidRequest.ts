import { getAuth, AuthNotPortedError } from "@/lib/auth/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getServerEnv } from "@/lib/serverEnv";

/**
 * 요청 인증 헬퍼 — 10-31 Vite+Hono 이관으로 `NextRequest` 의존을 제거했다.
 * `Request`(표준)만 받는다. Hono 컨텍스트에서는 `c.req.raw`를 넘기면 된다.
 */

export interface C2SAuthResult {
    user: Awaited<ReturnType<typeof usersServerAPI.getUserByEmail>>;
    isValidRequest: boolean;
}

/**
 * 클라 세션 판정 — 세션 → email → 우리 users 행.
 * ⚠️ auth 이관 전이라 현재는 `AuthNotPortedError`를 던진다.
 */
export async function getIsValidRequestC2S(): Promise<C2SAuthResult> {
    const auth = await getAuth();
    const { data: session } = await auth.getSession();
    const authUser = session?.user ?? null;
    const email = authUser?.email ?? null;
    if (!authUser || !email) {
        return { user: null, isValidRequest: false };
    }

    let user = await usersServerAPI.getUserByEmail(email);
    if (!user) {
        const created = await usersServerAPI.postUsers({
            email,
            name: authUser.name ?? '',
            avatar_url: authUser.image ?? '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        user = created ?? await usersServerAPI.getUserByEmail(email);
    }

    return { user, isValidRequest: user !== null };
}

/** 서버 간(S2S) 호출 판정 — 공유 시크릿 헤더 비교 */
export async function getIsValidRequestS2S(request: Request): Promise<boolean> {
    const secret = request.headers.get('x-internal-secret');
    return secret === await getServerEnv('INTERNAL_FIRE_AND_FORGET_API_SECRET');
}

export { AuthNotPortedError };
