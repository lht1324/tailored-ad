import { getServerEnv } from "@/lib/serverEnv";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { getPaddleClient } from "@/lib/paddleClient";

/**
 * Paddle 웹훅 수신부 — POST /api/webhook/paddle
 * 서명 검증 후 /api/paddle/process로 fire-and-forget 전달하고 즉시 200.
 * 검증 실패도 500으로 반환해 Paddle이 재시도하도록 한다 (2xx 손실 방지).
 * PADDLE_NOTIFICATION_WEBHOOK_SECRET은 destination별 값 (sandbox/prod 분리).
 */
export async function POST(request: NextRequest) {
    const signature = request.headers.get("paddle-signature") ?? "";
    const rawBody = await request.text();
    const secret = (await getServerEnv('PADDLE_NOTIFICATION_WEBHOOK_SECRET')) ?? '';

    if (!signature || !rawBody || !secret) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing signature, body, or webhook secret.",
        });
    }

    try {
        const paddle = await getPaddleClient();
        // throws on mismatch/expired/malformed — catch에서 500으로 재시도 유도
        const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);

        internalFireAndForgetFetch(
            `${await getServerEnv('BASE_URL')}/api/paddle/process`,
            { method: "POST" },
            { type: event.eventType, eventId: event.eventId, data: event.data },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Paddle event received.",
        });
    } catch (error) {
        console.error("[webhook/paddle] verify failed:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Webhook verification failed.",
        });
    }
}
