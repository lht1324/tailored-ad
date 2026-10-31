import { Hono } from "hono";
import { bindEnv } from "@/lib/serverEnv";
import type { AppEnv } from "./env";

/**
 * API 워커 (Hono).
 *
 * 기존 Next의 API 25개 + 웹훅 3개를 이 앱으로 포팅한다.
 * 지금은 스캐폴드 확인용 health 라우트만 있다.
 *
 * 설계 원칙 (`PIPELINE_ARCHITECTURE.md`):
 * - 문(route)은 얇게: 인증 → 입력 검증 → **함수 호출** → 응답
 * - 파이프라인 순서는 워크플로(`src/workflows/batchPipeline.ts`)가 소유
 * - 자기 자신을 fetch 하지 않는다 (Workers 제약)
 * - env는 `context.env`로 받고, 아래 계층에는 `bindEnv`로 한 번만 내려보낸다
 */

const app = new Hono<{ Bindings: AppEnv }>();

// 플랫폼 경계 — 요청마다 바인딩을 src/lib에 묶는다 (`src/lib/serverEnv.ts` 참고).
// 이 미들웨어보다 **뒤에** 등록된 라우트에만 적용된다.
app.use("*", async (context, next) => {
    bindEnv(context.env);
    await next();
});

app.get("/api/health", (context) =>
    context.json({
        success: true,
        status: 200,
        data: {
            service: "tailored-ad-api",
            runtime: "workers",
            // 배포된 워커가 dev인지 prod인지 즉시 보여주는 진단값 (wrangler.jsonc vars)
            environment: context.env.ENVIRONMENT,
            time: new Date().toISOString(),
        },
    }),
);

// TODO(포팅): 아래를 순서대로 붙인다 — auth · user · dodo · image · creative · webhook
//   /api/webhook/* 은 인증 미들웨어보다 **앞에** 마운트한다 (세션 없음).

export default app;
