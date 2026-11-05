/**
 * 응답 유틸 — 여러 라우터가 같이 쓴다.
 *
 * 왜 분리했나: 페이지 가드와 인증 라우트가 **둘 다 Set-Cookie를 응답에 붙인다.**
 * 라우터 파일에 두면 같은 코드가 두 곳에 생기고, 그 파일이 "경로 표"로 안 읽힌다.
 */

/** 리다이렉트 + Set-Cookie */
export function redirectWithCookies(location: string, setCookies: string[]): Response {
    const headers = new Headers({ Location: location });
    for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie);
    }
    return new Response(null, { status: 302, headers });
}

/**
 * 기존 응답에 Set-Cookie를 덧붙인다.
 *
 * ⚠️ `fetch`/`ASSETS.fetch`가 돌려준 Response의 헤더는 **immutable**이라
 *    복사본을 만들어야 한다 (`headers.set`이 조용히 실패하거나 throw).
 */
export function appendSetCookies(response: Response, setCookies: string[]): Response {
    if (setCookies.length === 0) return response;

    const headers = new Headers(response.headers);
    for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
