import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

/**
 * Neon Auth 브라우저 클라이언트 — Vite 버전 (10-31 이관).
 *
 * 기존에는 `@neondatabase/auth/next`를 썼는데 그건 Next 전용 어댑터다.
 * Vite에서는 본체 `createAuthClient` + **React 어댑터**를 직접 조립한다.
 *
 * ## `@neondatabase/auth-ui`를 쓰지 않는 이유 (기록)
 * 패키지는 이미 깔려 있고(`@neondatabase/auth`의 전이 의존), `@neondatabase/auth/react`가
 * `AuthView`·`SignInForm` 등을 re-export한다. 즉 기술적으로는 지금도 쓸 수 있다.
 * 그런데도 직접 만든 화면을 쓰는 이유:
 *
 * 1. **원래부터 커스텀이었다** — Next 시절부터 `SignInPageClient`/`AuthForm`을 직접 만들었다.
 *    (구 프로젝트에 `auth-ui`/`AuthView` 참조 0건) Vite 이관 때문에 바뀐 게 아니다.
 * 2. **브랜딩** — auth-ui는 자체 디자인 시스템을 끌고 온다. 앱 톤과 따로 놀게 된다.
 * 3. **버전 불일치** — `auth-ui@0.4`는 `auth@0.6`을 peer로 요구한다. 우리는 0.7이라
 *    npm이 0.6을 **중첩 설치**했다. auth-ui 컴포넌트를 쓰면 0.6 인스턴스가 섞여
 *    세션 상태가 갈릴 수 있다.
 *
 * 나중에 "왜 auth-ui 안 썼지?"라는 질문이 또 나오면 이 주석을 보면 된다.
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
