import { Hono } from "hono";
import { Webhook } from "standardwebhooks";
import { processDodoEvent } from "@worker/lib/payments/processDodo";
import { getServerEnv } from "@worker/lib/serverEnv";
import { getBaseResponse } from "@worker/lib/utils/getBaseResponse";
import type { AppEnv } from "../../env";

/**
 * Dodo 웹훅 수신 — `POST /api/webhook/dodo`
 *
 * ## 순서
 * 1. **서명 검증** (standardwebhooks). 실패하면 **500** — Dodo가 재시도하도록 2xx를 주지 않는다.
 * 2. 처리 함수를 `waitUntil`로 넘긴다 → **응답을 먼저 반환**(Dodo 타임아웃·재시도 폭풍 방지)
 * 3. 즉시 200
 *
 * ## 예전과 달라진 점
 * 예전에는 `fetch(BASE_URL/api/dodo/process)`로 자기 자신을 불렀다. Workers는 자기 zone fetch를
 * 거부하므로 prod에서 이 경로가 죽어 있었고, **결제 후 크레딧 적립이 안 됐다.**
 * 지금은 함수 직접 호출이다 (HTTP 없음).
 *
 * ## 멱등성
 * 처리 함수가 만드는 `subscription_grants` 행은 `UNIQUE (구독, 사이클, 사유)`로 중복이 막힌다.
 * 그래서 Dodo가 같은 이벤트를 다시 보내도 크레딧이 두 배가 되지 않는다.
 *
 * ⚠️ 인증 미들웨어보다 **앞에** 마운트한다 (세션이 없는 외부 호출).
 */
const dodoWebhookRoutes = new Hono<{ Bindings: AppEnv }>();

dodoWebhookRoutes.post("/dodo", async (context) => {
    const rawBody = await context.req.text();
    const secret = (await getServerEnv("DODO_PAYMENTS_WEBHOOK_KEY")) ?? "";

    if (!rawBody || !secret) {
        return getBaseResponse({ success: false, status: 400, error: "Missing body or webhook secret." });
    }

    let event: { type?: string; eventId?: string; event_id?: string; data?: unknown };
    try {
        const webhook = new Webhook(secret);
        event = webhook.verify(rawBody, {
            "webhook-id": context.req.header("webhook-id") ?? "",
            "webhook-timestamp": context.req.header("webhook-timestamp") ?? "",
            "webhook-signature": context.req.header("webhook-signature") ?? "",
        }) as typeof event;
    } catch (error) {
        // 검증 실패도 500 — 200을 주면 Dodo가 재시도를 멈춘다 (이벤트 유실)
        console.error("[webhook/dodo] signature verification failed:", error);
        return getBaseResponse({ success: false, status: 500, error: "Invalid signature." });
    }

    // 응답을 먼저 보내고 처리는 계속 (Process/Token: 얇은 문 유지)
    context.executionCtx.waitUntil(
        processDodoEvent({ type: event.type ?? "", data: event.data }).catch((error) => {
            console.error("[webhook/dodo] process failed:", error);
        }),
    );

    return getBaseResponse({
        success: true,
        status: 200,
        message: "Dodo webhook received.",
    });
});

export default dodoWebhookRoutes;
