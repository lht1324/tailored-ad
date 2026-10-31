/**
 * Neon Auth 서버 — **아직 이관 전 (TODO: auth 단계)**
 *
 * 이전 구현은 `@neondatabase/auth/next/server`의 `createNeonAuth()`를 썼다.
 * 이 패키지의 Next 어댑터는 `next/headers`의 쿠키에 의존하므로 Vite+Hono에서 그대로 못 쓴다.
 *
 * 대안(확인됨): `@neondatabase/auth/server`가 프레임워크 비의존 API를 노출한다.
 *  - `createAuthServer`, `handleAuthProxyRequest`, `extractNeonAuthCookies`, `parseSessionData`
 *  → Hono에서는 요청 쿠키를 직접 넘기고, 응답 Set-Cookie를 직접 심는 방식으로 이식해야 한다.
 *
 * 그때까지 인증이 필요한 경로는 **명시적으로 실패**한다 (조용히 통과 금지).
 */

export class AuthNotPortedError extends Error {
    constructor() {
        super('Neon Auth is not ported to Vite+Hono yet (see src/lib/auth/server.ts TODO)');
        this.name = 'AuthNotPortedError';
    }
}

export async function getAuth(): Promise<never> {
    throw new AuthNotPortedError();
}
