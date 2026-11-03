/**
 * 브라우저 HTTP 래퍼 — `~ClientAPI`들이 공통으로 쓴다.
 *
 * ## 10-31 이관에서 사라진 것
 * - **client-gateway 리라이트**: `/api/x` → `/api/client-gateway?path=/api/x`
 *   게이트웨이는 Next/OpenNext에서 self-fetch 금지를 피하려던 우회로였고,
 *   Hono에서는 세션 검증을 **미들웨어**가 한다. 그래서 경로를 그대로 보낸다.
 * - **`NEXT_PUBLIC_BASE_URL` / `VITE_BASE_URL`**: 클라(3002)와 API(3003)가 다른 오리진이던
 *   dev 전용 우회로였다. 지금은 Vite dev 하나가 클라와 `/api/*`를 같은 오리진에서 서빙하므로
 *   도메인을 넣을 변수 자체가 필요 없다. (상대 경로면 충분)
 * - **`ngrok-skip-browser-warning`**: ngrok 은퇴. Cloudflare Tunnel에는 그 인터스티셜이 없다.
 * - **`process.env.NODE_ENV`**: 브라우저에 `process`가 없다. Vite가 일부만 치환하지만
 *   여기서는 분기가 필요 없어졌으므로 쓰지 않는다.
 *
 * ⚠️ 이 파일은 **브라우저에서 실행**된다. 비밀값·서버 전용 코드를 넣지 말 것.
 */

const FETCH_TIMEOUT_MS = 30_000;
const FORM_TIMEOUT_MS = 60_000;

// !ok 응답 — 서버가 내려주는 {error} 본문을 보존해 throw (호출부가 원인을 알 수 있게).
// 서버는 404/500도 `{success,status,error}` 봉투로 내려주므로 대부분 원인이 살아 있다.
async function ensureOk(response: Response): Promise<Response> {
    if (response.ok) return response;

    let message = response.statusText;
    try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
    } catch {
        // 본문이 JSON이 아님 (플랫폼 오류 페이지 등) — 상태 텍스트 유지
    }
    console.error(`HTTP error: [${response.status}] ${message}`);
    throw Error(`[${response.status}] ${message}`);
}

export async function getFetch(route: string) {
    const response = await fetch(route, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: "GET",
        credentials: "include",
    });

    return ensureOk(response);
}

export async function postFetch(route: string, body?: unknown) {
    const response = await fetch(route, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
    });

    return ensureOk(response);
}

export async function postFormFetch(route: string, formData: FormData) {
    const response = await fetch(route, {
        signal: AbortSignal.timeout(FORM_TIMEOUT_MS),
        method: "POST",
        // multipart/form-data는 브라우저가 boundary를 자동 생성하므로 Content-Type을 수동 설정하지 않음
        body: formData,
        credentials: "include",
    });

    return ensureOk(response);
}

export async function patchFetch(route: string, body?: unknown) {
    const response = await fetch(route, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
    });

    return ensureOk(response);
}

export async function deleteFetch(route: string) {
    const response = await fetch(route, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: "DELETE",
        credentials: "include",
    });

    return ensureOk(response);
}
