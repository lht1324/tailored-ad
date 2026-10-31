import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

/**
 * Neon Auth 브라우저 클라이언트 — Vite 버전 (10-31 이관).
 *
 * 기존에는 `@neondatabase/auth/next`를 썼는데 그건 Next 전용 어댑터다.
 * Vite에서는 본체 `createAuthClient` + **React 어댑터**를 직접 조립한다.
 *
 * ## 인자
 * 첫 인자는 Auth API의 base URL이다. 우리는 **동일 오리진의 프록시**(`/api/auth`)를 쓴다.
 * 그래서 클라 번들에 Neon Auth 서버 주소·키가 필요 없고, CORS도 발생하지 않는다.
 *
 * ## 세션 쿠키
 * 쿠키는 `httpOnly`라 JS에서 못 읽는다. `getSession()`으로 상태만 확인한다.
 * (로그인·갱신 시의 Set-Cookie는 서버 프록시가 그대로 브라우저로 흘려보낸다.)
 */

function resolveAuthBaseUrl(): string {
    // 프리렌더(브라우저 없음) 시점에도 모듈이 평가될 수 있어 상대 경로로 폴백한다.
    if (typeof window === "undefined") return "/api/auth";
    return `${window.location.origin}/api/auth`;
}

export const authClient = createAuthClient(resolveAuthBaseUrl(), {
    adapter: BetterAuthReactAdapter(),
});
