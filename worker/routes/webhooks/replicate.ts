import { Hono } from "hono";
import {
    sendReplicateBaseEvent,
    sendReplicateRatioEvent,
} from "@worker/lib/workflows/batchPipelineClient";
import { getBaseResponse } from "@worker/lib/utils/getBaseResponse";
import type { ReplicateWebhookPayload } from "@worker/lib/workflows/batchPipelineClient";
import type { AppEnv } from "../../env";

/**
 * Replicate 웹훅 배달부 — `/api/webhook/replicate/*`
 *
 * ## 역할은 "전달"뿐
 * 파싱해서 워크플로 인스턴스에 이벤트를 넣고 **즉시 200**을 준다.
 * 후처리는 워크플로의 step(`handleBaseResult` / `handleRatioResult`)이 한다.
 * (예전에는 여기서 `/api/image/process/*`를 self-fetch로 불렀고, 그게 prod에서 죽은 원인이었다)
 *
 * ## 원칙: **절대 에러 상태로 응답하지 않는다**
 * 실패 응답을 주면 Replicate가 재시도 폭풍을 일으킨다. 배달 실패는 로그만 남기고 200.
 *
 * ## ⚠️ 서명이 없다
 * Replicate 웹훅에는 서명이 없다. 그래서 batchId를 아는 사람이 위조 payload를 넣을 수 있다.
 * 지금은 batchId가 UUID라 현실적 위험은 낮지만, **W3에서 prediction을 Replicate에 재조회해
 * 대조**하는 검증을 넣을 예정이다. (Dodo 웹훅은 `standardwebhooks` 서명으로 이미 검증한다)
 */
const replicateWebhookRoutes = new Hono<{ Bindings: AppEnv }>();

function alwaysOk(message: string, error?: string): Response {
    return getBaseResponse({ success: true, status: 200, message, error });
}

/** `input.aspect_ratio`("4:5") → 저장 키("4_5") */
function deriveRatioKeyFromPayload(
    ratioKeyFromQuery: string | null,
    payload: ReplicateWebhookPayload,
): string | null {
    if (ratioKeyFromQuery) return ratioKeyFromQuery;
    const aspectRatio = payload.input?.aspect_ratio;
    if (typeof aspectRatio === "string" && aspectRatio.length > 0) {
        return aspectRatio.replace(":", "_");
    }
    return null;
}

/** 기준(base) 이미지 결과 */
replicateWebhookRoutes.post("/replicate/image/base", async (context) => {
    const batchId = context.req.query("batchId");
    const creativeIndexParam = context.req.query("creativeIndex");
    const ratioKey = context.req.query("ratioKey") ?? null;

    if (!batchId || creativeIndexParam === undefined) {
        return alwaysOk("", "Missing batchId or creativeIndex query params.");
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);
    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return alwaysOk("", "Invalid creativeIndex query param.");
    }

    try {
        const payload = (await context.req.json()) as ReplicateWebhookPayload;
        if (!payload || typeof payload.id !== "string" || typeof payload.status !== "string") {
            console.warn(
                `[webhook/replicate/base] invalid payload (batch=${batchId}, creative=${creativeIndex})`,
            );
            return alwaysOk("", "Invalid Replicate payload: missing id or status.");
        }

        await sendReplicateBaseEvent(context.env, {
            batchId,
            creativeIndex,
            ratioKey,
            attempt: Number.parseInt(context.req.query("attempt") ?? "1", 10) || 1,
            payload,
        });

        return alwaysOk("Base image event delivered to pipeline.");
    } catch (error) {
        console.error(`[webhook/replicate/base] delivery failed (batch=${batchId}):`, error);
        return alwaysOk("", "Webhook delivery error");
    }
});

/** 파생(ratio) 이미지 결과 */
replicateWebhookRoutes.post("/replicate/image/ratios", async (context) => {
    const batchId = context.req.query("batchId");
    const creativeIndexParam = context.req.query("creativeIndex");

    if (!batchId || creativeIndexParam === undefined) {
        return alwaysOk("", "Missing batchId or creativeIndex query params.");
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);
    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return alwaysOk("", "Invalid creativeIndex query param.");
    }

    try {
        const payload = (await context.req.json()) as ReplicateWebhookPayload;
        if (!payload || typeof payload.id !== "string" || typeof payload.status !== "string") {
            console.warn(
                `[webhook/replicate/ratios] invalid payload (batch=${batchId}, creative=${creativeIndex})`,
            );
            return alwaysOk("", "Invalid Replicate payload: missing id or status.");
        }

        const ratioKey = deriveRatioKeyFromPayload(context.req.query("ratioKey") ?? null, payload);

        await sendReplicateRatioEvent(context.env, {
            batchId,
            creativeIndex,
            ratioKey,
            attempt: Number.parseInt(context.req.query("attempt") ?? "1", 10) || 1,
            payload,
        });

        return alwaysOk("Ratio image event delivered to pipeline.");
    } catch (error) {
        console.error(`[webhook/replicate/ratios] delivery failed (batch=${batchId}):`, error);
        return alwaysOk("", "Webhook delivery error");
    }
});

export default replicateWebhookRoutes;
