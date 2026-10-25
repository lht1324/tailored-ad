const isProd = process.env.NODE_ENV === 'production';

function getRootPath(route: string) {
    if (isProd || route.includes("http")) {
        return "";
    }
    // dev 전용 — 클라(3002) → API 서버(3003) 직행 베이스. NEXT_PUBLIC_*는 빌드타임 주입.
    // 누락 시 문자열 "undefined" URL이 되지 않게 동일 출처(빈 값)로 폴백.
    return process.env.NEXT_PUBLIC_BASE_URL || "";
}

/**
 * Automatically wraps '/api/...' routes with the client-gateway.
 * e.g., /api/video?taskId=123 -> /api/client-gateway?path=/video&taskId=123
 */
function getGatewayRoute(route: string) {
    if (route.startsWith('/api/') && !route.startsWith('/api/client-gateway')) {
        const [path, query] = route.split('?');
        return `/api/client-gateway?path=${path}${query ? `&${query}` : ""}`;
    }
    return route;
}

const FETCH_TIMEOUT_MS = 30_000;
const FORM_TIMEOUT_MS = 60_000;

// !ok 응답 — 서버가 내려주는 {error} 본문을 보존해 throw (호출부가 원인을 알 수 있게).
// JSON이 아닌 응답(프록시 오류 페이지 등)은 상태 텍스트로 폴백.
async function ensureOk(response: Response): Promise<Response> {
    if (response.ok) return response;
    let message = response.statusText;
    try {
        const body = await response.json() as { error?: string };
        if (body.error) message = body.error;
    } catch {
        // 본문 파싱 실패 — 상태 텍스트 유지
    }
    console.error(`HTTP error: [${response.status}] ${message}`);
    throw Error(`[${response.status}] ${message}`);
}

export async function getFetch(route: string) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(isProd ? { }: {
                'ngrok-skip-browser-warning': '69420'
            }),
        },
        credentials: 'include',
    });

    return ensureOk(response);
}

export async function postFetch(route: string, body?: unknown) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(isProd ? { }: {
                'ngrok-skip-browser-warning': '69420'
            }),
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
    });

    return ensureOk(response);
}

export async function postFormFetch(route: string, formData: FormData) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
        signal: AbortSignal.timeout(FORM_TIMEOUT_MS),
        method: 'POST',
        // multipart/form-data는 브라우저가 boundary를 자동 생성하므로 Content-Type을 수동 설정하지 않음
        headers: {
            ...(isProd ? { } : {
                'ngrok-skip-browser-warning': '69420'
            }),
        },
        body: formData,
        credentials: 'include',
    });

    return ensureOk(response);
}

export async function patchFetch(route: string, body?: unknown) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(isProd ? { }: {
                'ngrok-skip-browser-warning': '69420'
            }),
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
    });

    return ensureOk(response);
}

export async function deleteFetch(route: string) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(isProd ? { }: {
                'ngrok-skip-browser-warning': '69420'
            }),
        },
        credentials: 'include',
    });

    return ensureOk(response);
}