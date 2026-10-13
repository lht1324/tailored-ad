import { getServerEnv } from "@/lib/serverEnv";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Fungies 웹훅 수신부 — POST /api/webhook/fungies
 * HMAC-SHA256 서명 검증 후 /api/fungies/process로 fire-and-forget 전달하고 즉시 200.
 * 검증 실패도 500으로 반환해 Fungies가 재시도하도록 한다 (2xx 손실 방지).
 * FUNGIES_WEBHOOK_SECRET은 웹훅별 값 (stage/production 분리).
 * 출처: help.fungies.io Next.js 15 guide (x-fngs-signature + raw body HMAC hex)
 */
export async function POST(request: NextRequest) {
    const signature = request.headers.get("x-fngs-signature") ?? "";
    const rawBody = await request.text();
    const secret = (await getServerEnv('FUNGIES_WEBHOOK_SECRET')) ?? '';

    if (!signature || !rawBody || !secret) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing signature, body, or webhook secret.",
        });
    }

    try {
        const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
        const a = Buffer.from(digest, "utf8");
        const b = Buffer.from(signature, "utf8");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            throw new Error("Signature mismatch.");
        }
        const event = JSON.parse(rawBody) as { type?: unknown; data?: unknown };

        internalFireAndForgetFetch(
            `${await getServerEnv('BASE_URL')}/api/fungies/process`,
            { method: "POST" },
            { type: event.type, data: event.data },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Fungies event received.",
        });
    } catch (error) {
        console.error("[webhook/fungies] verify failed:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Webhook verification failed.",
        });
    }
}
