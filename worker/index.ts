import { Hono } from "hono";

/**
 * API 워커 (Hono).
 *
 * 기존 Next의 `app/api` 아래 route.ts 34개를 이 앱으로 포팅한다.
 * 지금은 스캐폴드 확인용 health 라우트만 있다.
 *
 * 설계 원칙 (`PIPELINE_ARCHITECTURE.md`):
 * - 문(route)은 얇게: 인증 → 입력 검증 → **함수 호출** → 응답
 * - 파이프라인 순서는 워크플로(`src/workflows/batchPipeline.ts`)가 소유
 * - 자기 자신을 fetch 하지 않는다 (Workers 제약)
 */

export interface Env {
    // Cloudflare 바인딩/변수는 `npm run cf-typegen` 후 CloudflareEnv로 확장한다.
    BASE_URL?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) =>
    c.json({
        success: true,
        status: 200,
        data: {
            service: "tailored-ad-api",
            runtime: "workers",
            time: new Date().toISOString(),
        },
    }),
);

// TODO(포팅): 아래를 순서대로 붙인다 — auth · user · dodo · image · creative · webhook

export default app;
