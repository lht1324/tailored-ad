import { getServerEnv, requireServerEnv } from "@/lib/serverEnv";

/**
 * Fungies 서버 전용 클라이언트 — 라우트 핸들러에서만 import (클라 번들에 시크릿 키 노출 금지).
 * 공식 Node SDK가 없어 fetch 래퍼로 묶는다. URL·헤더는 이 파일 안에서만 쓰고 route에 흩뿌리지 않는다.
 * 인증: 전 요청 `x-fngs-public-key`, 쓰기(POST/PATCH/DELETE)는 `x-fngs-secret-key` 추가.
 * 테스트 키(`pub_test_`/`sec_test_`)도 같은 호스트·경로 — 키가 테스트 데이터를 가리킨다.
 * 출처: docs.fungies.io/api-reference/authentication
 */

/** API 호스트 — 진실원천은 코드. stage는 env로 교체 (기본값 production) */
async function getApiBaseUrl(): Promise<string> {
    const override = await getServerEnv("FUNGIES_API_BASE_URL");
    const base = override && override.length > 0 ? override : "https://api.fungies.io/v0";
    if (!base.startsWith("https://")) {
        throw new Error("FUNGIES_API_BASE_URL must start with https://");
    }
    return base.replace(/\/$/, "");
}

/** 비-2xx면 throw (키는 절대 에러에 포함하지 않음) */
async function parseResponse<T>(res: Response, method: string, path: string): Promise<T> {
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = (data as { message?: unknown }).message;
        const detail = typeof message === "string" ? message : JSON.stringify(data).slice(0, 300);
        throw new Error(`Fungies ${method} ${path} → ${res.status}: ${detail}`);
    }
    return data as T;
}

/** 읽기 — public 키만 필요 */
export async function fungiesGet<T>(path: string): Promise<T> {
    const res = await fetch(`${await getApiBaseUrl()}${path}`, {
        method: "GET",
        headers: {
            "x-fngs-public-key": await requireServerEnv("FUNGIES_PUBLIC_KEY"),
        },
    });
    return parseResponse<T>(res, "GET", path);
}

/** 쓰기 — public + secret 키 필요 (미설정이면 throw) */
export async function fungiesWrite<T>(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
): Promise<T> {
    const res = await fetch(`${await getApiBaseUrl()}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            "x-fngs-public-key": await requireServerEnv("FUNGIES_PUBLIC_KEY"),
            "x-fngs-secret-key": await requireServerEnv("FUNGIES_SECRET_KEY"),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parseResponse<T>(res, method, path);
}
