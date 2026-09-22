import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

/**
 * Replicate 웹훅 배달부 — 기준(base) 이미지 prediction 전용.
 * webhook_url에 batchId·creativeIndex·ratioKey가 query로 박혀 제출 시점에 전달된다.
 * 역할은 수신→전달뿐: 파싱해서 process/base로 넘기고 즉시 200 응답.
 * (절대 에러 상태로 응답하지 않는다 — 재시도 폭풍 방지, fal 웹훅 선례와 동일)
 */
export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const creativeIndexParam = searchParams.get('creativeIndex');
    const ratioKey = searchParams.get('ratioKey');

    if (!batchId || creativeIndexParam === null) {
        // 식별 불가 웹훅 — 버릴 수밖에 없지만 Replicate에는 성공으로 응답
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Missing batchId or creativeIndex query params."
        });
    }

    try {
        const payload = await request.json();

        if (!payload || typeof payload.id !== 'string' || typeof payload.status !== 'string') {
            console.warn(`[webhook/ad/replicate/image/base] invalid payload (batch=${batchId}, creative=${creativeIndexParam}): missing id or status`);
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "Invalid Replicate payload: missing id or status.",
            });
        }

        // ratioKey는 webhook query가 1순위, 없으면 payload.input.aspect_ratio에서 fallback
        let effectiveRatioKey = ratioKey;
        if (!effectiveRatioKey && payload.input?.aspect_ratio && typeof payload.input.aspect_ratio === 'string') {
            effectiveRatioKey = (payload.input.aspect_ratio as string).replace(':', '_');
        }

        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/image/process/base?batchId=${batchId}&creativeIndex=${creativeIndexParam}${effectiveRatioKey ? `&ratioKey=${effectiveRatioKey}` : ""}${searchParams.get('attempt') ? `&attempt=${encodeURIComponent(searchParams.get('attempt') as string)}` : ""}`,
            { method: "POST" },
            {
                replicatePayload: payload,
            },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Received base image webhook successfully",
        });
    } catch (error) {
        console.error(`[webhook/ad/replicate/image/base] processing error (batch=${batchId}):`, error);

        // 에러가 나도 Replicate에는 200으로 응답 (재시도 폭풍 방지)
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error",
        });
    }
}
