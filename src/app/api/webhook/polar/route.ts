import { NextRequest } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

/**
 * Polar 웹훅 수신부 — POST /api/webhook/polar
 * 역할은 검증→전달뿐: 서명 확인 후 `/api/polar/process`로 넘기고 즉시 200 응답.
 * (처리 실패 시 Polar 재시도 + process 멱등으로 흡수 — Replicate 리시버와 동일 계약)
 *
 * 서명: 2026-09-08 이후 시크릿 = Standard Webhooks → `whsec_…` 통째로 전달.
 * (Polar SDK 0.49.0의 validateEvent는 구HMAC 전제라 신시크릿에 403 확정이라 우회)
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const secret = process.env.POLAR_WEBHOOK_SECRET ?? '';
    if (!secret) {
        console.error('[webhook/polar] missing POLAR_WEBHOOK_SECRET');
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Webhook secret not configured.',
        });
    }

    let event: { type: string; data: unknown };
    try {
        const wh = new Webhook(secret);
        event = wh.verify(rawBody, Object.fromEntries(request.headers.entries())) as {
            type: string;
            data: unknown;
        };
    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            console.error("Polar checkout error: ", error);
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: 'Invalid webhook signature.',
            });
        }
        throw error;
    }

    internalFireAndForgetFetch(
        `${process.env.BASE_URL}/api/polar/process`,
        { method: "POST" },
        {
            type: event.type,
            data: event.data,
        },
    );

    return getNextBaseResponse({
        success: true,
        status: 200,
        message: 'Polar webhook received.',
    });
}
