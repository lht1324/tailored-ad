import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { sendReplicateBaseEvent } from "@/lib/workflows/batchPipelineClient";

/**
 * Replicate 웹훅 배달부 — 기준(base) 이미지 prediction 전용.
 *
 * **10-31 변경**: 예전에는 `internalFireAndForgetFetch(.../api/image/process/base)`로
 * 다음 라우트를 불렀다. 이제는 **워크플로 인스턴스로 이벤트만 전달**하고 즉시 200을 준다.
 * 후처리는 워크플로의 `handleBaseResult` step이 맡는다 (HTTP 왕복 없음).
 *
 * 원칙: 절대 에러 상태로 응답하지 않는다 — Replicate 재시도 폭풍 방지.
 */
export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const creativeIndexParam = searchParams.get('creativeIndex');
    const ratioKey = searchParams.get('ratioKey');

    if (!batchId || creativeIndexParam === null) {
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Missing batchId or creativeIndex query params."
        });
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);
    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Invalid creativeIndex query param.",
        });
    }

    try {
        const payload = await request.json();

        if (!payload || typeof payload.id !== 'string' || typeof payload.status !== 'string') {
            console.warn(`[webhook/replicate/image/base] invalid payload (batch=${batchId}, creative=${creativeIndex}): missing id or status`);
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "Invalid Replicate payload: missing id or status.",
            });
        }

        await sendReplicateBaseEvent({
            batchId,
            creativeIndex,
            ratioKey,
            attempt: Number.parseInt(searchParams.get('attempt') ?? '1', 10) || 1,
            payload,
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Base image event delivered to pipeline.",
        });
    } catch (error) {
        // 워크플로 인스턴스가 없거나 종료된 경우 — 재시도 폭풍을 막기 위해 200 유지, 로그만
        console.error(`[webhook/replicate/image/base] delivery failed (batch=${batchId}):`, error);

        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error",
        });
    }
}
