import { NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { getServerEnv } from "@/lib/serverEnv";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

/**
 * Dodo 웹훅 수신부 — POST /api/webhook/dodo
 * Standard Webhooks 서명 검증 후 /api/dodo/process로 fire-and-forget 전달하고 즉시 200.
 * 검증 실패도 500으로 반환해 Dodo가 재시도하도록 한다 (2xx 손실 방지).
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const secret = (await getServerEnv('DODO_PAYMENTS_WEBHOOK_KEY')) ?? '';

    if (!rawBody || !secret) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing body or webhook secret.",
        });
    }

    try {
        const wh = new Webhook(secret);
        const event = wh.verify(rawBody, {
            "webhook-id": request.headers.get("webhook-id") ?? "",
            "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
            "webhook-signature": request.headers.get("webhook-signature") ?? "",
        }) as { type?: string; eventId?: string; event_id?: string; data?: unknown };

        internalFireAndForgetFetch(
            `${await getServerEnv('BASE_URL')}/api/dodo/process`,
            { method: "POST" },
            { type: event.type, eventId: event.eventId ?? event.event_id, data: event.data },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Dodo event received.",
        });
    } catch (error) {
        console.error("[webhook/dodo] verify failed:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Webhook verification failed.",
        });
    }
}
