/**
 * env 경계 — **플랫폼 종속은 이 파일 하나에만** 둔다.
 *
 * 왜 별칭을 두나:
 *  - 도메인 코드가 `CloudflareEnv`를 직접 참조하면 Cloudflare 문자열이 63개 파일에 퍼진다.
 *  - 여기서 한 번만 묶어두면, 다른 플랫폼으로 옮길 때 **이 파일만 고치면 된다**.
 *    (예: Heroku → `export type AppEnv = { BASE_URL?: string; ... }` + process.env를 채우는 어댑터)
 *
 * ⚠️ 규칙
 *  - `import { env } from "cloudflare:workers"` 는 **쓰지 않는다**.
 *    모듈 이름에 플랫폼이 박혀 있어 import 자체가 Cloudflare 전용이 되고,
 *    요청 컨텍스트 밖(워크플로)에서 비어 있을 수 있다.
 *  - 대신 `env: AppEnv`를 **인자로** 넘긴다.
 *    라우트는 `c.env`, 워크플로는 `this.env`, 그 아래는 파라미터.
 *
 * 타입의 출처는 `wrangler.jsonc`다:
 *   wrangler.jsonc (vars·secrets.required) → `npm run cf-typegen` → cloudflare-env.d.ts
 * 즉 **설정에 없는 키는 컴파일 단계에서 잡힌다.**
 */

export type AppEnv = CloudflareEnv;
