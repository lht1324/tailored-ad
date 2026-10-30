import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 서버 런타임 env 읽기 — Workers와 Node(dev/docker) 양쪽 대응.
 * Workers에서는 process.env가 빌드타임 값이라 대시보드 Secrets/Vars가 안 보인다.
 * getCloudflareContext().env를 먼저 보고, 없으면 process.env로 폴백한다.
 * 클라 번들에서는 호출 금지 (서버 전용).
 */
export async function getServerEnv(key: string): Promise<string | undefined> {
    try {
        const { env } = await getCloudflareContext();
        // CloudflareEnv는 wrangler가 생성한 구체 인터페이스라 문자열 인덱싱이 없다.
        // 동적 키 조회이므로 unknown을 거쳐 캐스팅한다 (10-31: generated types 도입에 따른 조정).
        const value = (env as unknown as Record<string, unknown> | undefined)?.[key];
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
    } catch {
        // 로컬 Node·빌드타임 등 Cloudflare 컨텍스트 없음 → 폴백
    }
    return process.env[key];
}

/** 필수 env — 없으면 throw (호출자가 500/가시화 처리) */
export async function requireServerEnv(key: string): Promise<string> {
    const value = await getServerEnv(key);
    if (!value) {
        throw new Error(`${key} is not configured.`);
    }
    return value;
}
