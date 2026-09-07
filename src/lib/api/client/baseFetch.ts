const isProd = process.env.NODE_ENV === 'production';

function getRootPath(route: string) {
    return isProd || route.includes("http") || route.includes("https")
        ? ""
        : `${process.env.NEXT_PUBLIC_BASE_URL!}`
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

export async function getFetch(route: string) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(isProd ? { }: {
                'ngrok-skip-browser-warning': '69420'
            }),
        },
        credentials: 'include',
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function postFetch(route: string, body?: unknown) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    console.log(`[${route}]: ${rootPath}${gatewayRoute}`);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
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

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function postFormFetch(route: string, formData: FormData) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    console.log(`[${route}][form]: ${rootPath}${gatewayRoute}`);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
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

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function patchFetch(route: string, body?: unknown) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
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

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function deleteFetch(route: string) {
    const rootPath = getRootPath(route);
    const gatewayRoute = getGatewayRoute(route);
    const response = await fetch(`${rootPath}${gatewayRoute}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(isProd ? { }: {
                'ngrok-skip-browser-warning': '69420'
            }),
        },
        credentials: 'include',
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}