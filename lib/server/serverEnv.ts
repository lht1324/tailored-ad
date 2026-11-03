/**
 * 서버 env 접근 — **플랫폼 경계 지점**.
 *
 * ## 왜 이 파일이 존재하나
 * 도메인 코드(`src/lib` 63파일)는 Cloudflare를 한 글자도 몰라야 한다.
 * 그래서 플랫폼이 주는 바인딩은 **입구에서 한 번만** 이 모듈에 묶고(`bindEnv`),
 * 아래에서는 `getServerEnv(key)`로만 읽는다.
 * 다른 플랫폼으로 옮길 때 고칠 곳은 `worker/index.ts`의 `bindEnv(...)` 한 줄이다.
 *   - Cloudflare : `bindEnv(context.env)`
 *   - Node/Heroku: `bindEnv(process.env)`
 *
 * ## 호출 지점 (이 둘뿐)
 * 1. 요청      — `worker/index.ts` 미들웨어 (모든 `/api/*`)
 * 2. 워크플로  — `run()` 첫 줄에서 `bindEnv(this.env)`
 *    (워크플로는 요청 컨텍스트가 아니라서 1번이 적용되지 않는다)
 *
 * ## 하지 않는 것
 * `import { env } from "cloudflare:workers"` — 쓰지 않는다.
 * 모듈 이름에 플랫폼이 박혀 import 자체가 Cloudflare 전용이 되고,
 * 문서상 **요청 컨텍스트 밖에서는 비어 있다**. 위 2번 문제를 스스로 만들 뿐이다.
 *
 * ## 왜 모듈 전역이 안전한가
 * Workers에서 `env`는 **배포(스크립트 버전) 단위 상수**다. 요청마다 달라지지 않으므로
 * "전역 가변 상태 금지" 규칙의 예외다. (요청 스코프 데이터가 아니다. 그건 `context.set/get`.)
 */

type EnvValues = Record<string, unknown>;

let boundEnv: EnvValues | null = null;

/** 플랫폼 바인딩을 이 모듈에 묶는다. 요청/워크플로 진입에서 1회 호출. */
export function bindEnv(env: unknown): void {
    boundEnv = (env ?? null) as EnvValues | null;
}

export async function getServerEnv(key: string): Promise<string | undefined> {
    const value = boundEnv?.[key];
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    // Node 스크립트(drizzle-kit 등) 경로. Workers에서는 bindEnv가 먼저 채운다.
    return process.env[key];
}

/** 필수 env — 없으면 throw (호출자가 500/가시화 처리). 조용한 기본값 금지. */
export async function requireServerEnv(key: string): Promise<string> {
    const value = await getServerEnv(key);
    if (!value) {
        throw new Error(`Missing required server env: ${key}`);
    }
    return value;
}
