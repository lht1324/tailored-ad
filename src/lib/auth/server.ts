import { createNeonAuth } from "@neondatabase/auth/next/server";
import { requireServerEnv } from "@/lib/serverEnv";

/**
 * Neon Auth(Managed Better Auth) 서버 싱글톤.
 * Workers에서는 process.env가 빌드타임 값이라 getServerEnv로 읽는다 (r2·neon DB와 동일).
 * 클라 번들에서는 호출 금지 — 클라는 `@/lib/auth/client`의 authClient 사용.
 */
let cached: ReturnType<typeof createNeonAuth> | null = null;

export async function getAuth(): Promise<ReturnType<typeof createNeonAuth>> {
    if (!cached) {
        cached = createNeonAuth({
            baseUrl: await requireServerEnv("NEON_AUTH_BASE_URL"),
            cookies: { secret: await requireServerEnv("NEON_AUTH_COOKIE_SECRET") },
        });
    }
    return cached;
}
