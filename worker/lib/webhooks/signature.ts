import { requireServerEnv } from "@worker/lib/serverEnv";

/**
 * Replicate 웹훅 URL 서명 — **Replicate는 서명을 보내지 않는다.**
 *
 * ## 왜 필요한가
 * 웹훅은 세션이 없는 외부 요청이라 "누가 보냈는지"를 알 수 없다. 지금까지는 batchId(UUID)를
 * 아는 것만으로 통과했는데, 그러면 그 배치에 엉뚱한 이미지를 꽂을 수 있다.
 * (다른 사람 데이터를 읽거나 크레딧을 얻을 수는 없다 — 저장 경로·소유자는 DB에서 나온다)
 *
 * ## prediction 재조회로는 못 막는다
 * 공격자가 자기 계정에서 진짜 prediction을 만들어 그 id를 남의 batchId로 보내면 조회는 통과한다.
 * **제출 시점에 우리가 만든 URL에 서명**해야 "우리가 요청한 그 조합"인지 알 수 있다.
 *
 * ## 방식
 * query 파라미터를 정렬해 HMAC-SHA256 → `sig`로 붙인다. 수신 시 재계산해 상수 시간 비교.
 * - 추가 API 호출 0 (해시 연산만)
 * - 키는 폐기 예정이던 `INTERNAL_FIRE_AND_FORGET_API_SECRET`을 **웹훅 서명 키로 재사용**한다
 *   (self-fetch가 사라져 원래 용도는 없어졌지만, 대시보드에 이미 있는 시크릿이다)
 */

const SIGNATURE_PARAM = "sig";

function canonicalize(params: Record<string, string>): string {
    return Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");
}

async function importKey(): Promise<CryptoKey> {
    const secret = await requireServerEnv("INTERNAL_FIRE_AND_FORGET_API_SECRET");
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
}

function toBase64Url(bytes: ArrayBuffer): string {
    const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signParams(params: Record<string, string>): Promise<string> {
    const key = await importKey();
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalize(params)));
    return toBase64Url(mac);
}

/** 길이·내용을 모두 비교 (조기 반환 금지 — 타이밍 노출 방지) */
function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

/**
 * 서명된 웹훅 URL을 만든다.
 * 예: `https://tailoredad.com/api/webhook/replicate/image/base?batchId=…&sig=…`
 */
export async function buildSignedWebhookUrl(
    baseUrl: string,
    path: string,
    params: Record<string, string>,
): Promise<string> {
    const signature = await signParams(params);
    const query = new URLSearchParams({ ...params, [SIGNATURE_PARAM]: signature });
    return `${baseUrl.replace(/\/+$/, "")}${path}?${query.toString()}`;
}

/** 수신한 요청의 `sig`를 재계산해 비교한다. 서명이 없거나 다르면 false. */
export async function verifySignedWebhookUrl(requestUrl: string): Promise<boolean> {
    const url = new URL(requestUrl);
    const provided = url.searchParams.get(SIGNATURE_PARAM);
    if (!provided) return false;

    const params: Record<string, string> = {};
    for (const [key, value] of url.searchParams) {
        if (key !== SIGNATURE_PARAM) params[key] = value;
    }

    try {
        const expected = await signParams(params);
        return constantTimeEqual(provided, expected);
    } catch (error) {
        console.error("[webhook] signature check failed:", error);
        return false;
    }
}
