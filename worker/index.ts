import { Hono } from "hono";
import { bindEnv } from "@/lib/serverEnv";
import type { AppEnv } from "./env";
import authRoutes from "./routes/auth";
import batchRoutes from "./routes/batches";
import { requireSession, type AuthVariables } from "./middleware/auth";

/**
 * API 워커 (Hono).
 *
 * 기존 Next의 API 25개 + 웹훅 3개를 이 앱으로 포팅한다.
 *
 * 설계 원칙 (`PIPELINE_ARCHITECTURE.md`):
 * - 문(route)은 얇게: 인증 → 입력 검증 → **함수 호출** → 응답
 * - 파이프라인 순서는 워크플로(`src/workflows/batchPipeline.ts`)가 소유
 * - 자기 자신을 fetch 하지 않는다 (Workers 제약)
 * - env는 `context.env`로 받고, 아래 계층에는 `bindEnv`로 한 번만 내려보낸다
 *
 * ⚠️ **등록 순서가 곧 접근 제어**다. `app.use("/api/*", requireSession)`보다
 *    뒤에 등록된 라우트만 인증 대상이 된다.
 */

const app = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

// 1) 플랫폼 경계 — 요청마다 바인딩을 src/lib에 묶는다 (`src/lib/serverEnv.ts`)
app.use("*", async (context, next) => {
    bindEnv(context.env);
    await next();
});

// 2) 인증이 필요 없는 라우트
app.route("/api/auth", authRoutes); // 로그인·OAuth·세션 갱신 (세션 이전에 호출됨)
app.get("/api/health", (context) =>
    context.json({
        success: true,
        status: 200,
        data: {
            service: "tailored-ad-api",
            runtime: "workers",
            environment: context.env.ENVIRONMENT,
            time: new Date().toISOString(),
        },
    }),
);

// 3) 여기서부터 세션 인증
app.use("/api/*", requireSession);

// 4) 인증된 라우트
app.route("/api", batchRoutes);

// TODO(포팅): user · profile · creative · image · dodo · events
//   /api/webhook/* 은 인증 미들웨어보다 **앞에** 마운트한다 (세션 없음).

export default app;
