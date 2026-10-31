/**
 * 서버 런타임 env 읽기 — **Workers 단일 런타임** (10-31 Vite+Hono 이관).
 *
 * 이전(Next/OpenNext)에는 `getCloudflareContext().env`를 요청마다 조회했다.
 * 지금은 Hono 미들웨어가 요청 시작 시 `setRuntimeEnv(c.env)`로 한 번 넣어주고,
 * 이 모듈이 그 값을 읽는다.
 *
 * 왜 모듈 전역이 안전한가:
 *  - Workers에서 `env`는 **배포(스크립트 버전) 단위 상수**다. 요청마다 달라지지 않는다.
 *  - 그래서 "전역 가변 상태 금지" 규칙의 예외다(요청 스코프 데이터가 아님).
 *  - 로컬 Node 도구(스크립트 등)에서는 process.env 폴백을 그대로 쓴다.
 *
 * gotcha: 워커 진입점에서 `setRuntimeEnv`를 반드시 호출해야 한다. 안 하면 process.env 폴백으로
 * 떨어져 prod에서 env가 비어 보인다(이전 DODO_ENV 사고와 같은 유형).
 */

type RuntimeEnv = Record<string, unknown>;

let runtimeEnv: RuntimeEnv | null = null;

/** 워커 진입점(미들웨어)에서 1회 호출 */
export function setRuntimeEnv(env: unknown): void {
    runtimeEnv = (env ?? null) as RuntimeEnv | null;
}

export async function getServerEnv(key: string): Promise<string | undefined> {
    const value = runtimeEnv?.[key];
    if (typeof value === 'string' && value.length > 0) {
        return value;
    }
    return process.env[key];
}

/** 필수 env — 없으면 throw (호출자가 500/가시화 처리) */
export async function requireServerEnv(key: string): Promise<string> {
    const value = await getServerEnv(key);
    if (!value) {
        throw new Error(`Missing required server env: ${key}`);
    }
    return value;
}
