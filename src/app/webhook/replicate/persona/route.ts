import { getServerEnv } from "@/lib/serverEnv";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

/**
 * Replicate 웹훅 배달부 — 페르소나 prediction 전용.
 * 역할은 수신→전달뿐: 파싱해서 process/persona로 넘기고 즉시 200 응답.
 * (절대 에러 상태로 응답하지 않는다 — 재시도 폭풍 방지, base 선례와 동일)
 */
export async function POST(request: NextRequest) {
    const batchId = request.nextUrl.searchParams.get('batchId');
    const brief = request.nextUrl.searchParams.get('brief');

    if (!batchId) {
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Missing batchId query param."
        });
    }

    try {
        const payload = await request.json();

        if (!payload || typeof payload.id !== 'string' || typeof payload.status !== 'string') {
            console.warn(`[webhook/ad/replicate/persona] invalid payload (batch=${batchId}): missing id or status`);
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "Invalid Replicate payload: missing id or status.",
            });
        }

        internalFireAndForgetFetch(
            `${await getServerEnv('BASE_URL')}/api/image/process/persona?batchId=${batchId}${brief ? `&brief=${encodeURIComponent(brief)}` : ""}`,
            { method: "POST" },
            {
                replicatePayload: payload,
            },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Received persona webhook successfully",
        });
    } catch (error) {
        console.error(`[webhook/ad/replicate/persona] processing error (batch=${batchId}):`, error);

        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error",
        });
    }
}
