import { NextRequest } from "next/server";
import { getServerEnv } from "@/lib/serverEnv";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { StepError } from "@/lib/pipeline/types";
import { prepareCreativePrompt } from "@/lib/pipeline/steps/prepareCreativePrompt";

/**
 * 문(door): Creative별 프롬프트 생성 — 내부 전용 엔드포인트.
 *
 * S0 리팩터 결과: 업무 로직은 `lib/pipeline/steps/prepareCreativePrompt`로 이동.
 * 이 파일에는 인증·파싱·호출·응답만 남는다 (`PIPELINE_ARCHITECTURE.md` §2 R3).
 *
 * ⚠️ 임시: 다음 단계(generation/base)로 넘기는 블록이 아직 여기 있다.
 *    S3(오케스트레이터)에서 사라지고, 이 라우트 자체도 삭제된다.
 */

const HTTP_STATUS_BY_CODE: Record<string, number> = {
    BATCH_NOT_FOUND: 400,
    SPEC_NOT_FOUND: 400,
};

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ 'creative-index': string }> },
) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { 'creative-index': creativeIndexParam } = await context.params;
    const batchId = request.nextUrl.searchParams.get('batchId');

    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: batchId"
        });
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);

    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid creative-index path param."
        });
    }

    try {
        const output = await prepareCreativePrompt({ batchId, creativeIndex });

        // ⚠️ 임시 다리 — S3에서 오케스트레이터로 이동
        const baseUrl = await getServerEnv('BASE_URL');
        if (!baseUrl) {
            throw new Error("BASE_URL is not configured.");
        }
        internalFireAndForgetFetch(
            `${baseUrl}/api/image/generation/base?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}`,
            { method: "POST" },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Creative prompt generated and generation dispatched.",
            data: output,
        });
    } catch (error) {
        // 단계 실패 — code로 상태 매핑 (HTTP 지식은 문에만 둔다)
        if (error instanceof StepError) {
            return getNextBaseResponse({
                success: false,
                status: HTTP_STATUS_BY_CODE[error.code] ?? 500,
                error: error.message,
            });
        }

        console.error(`Error in POST /api/creative/${creativeIndexParam}/prompt:`, error);

        // prompt 실패는 creative 단위 격리 — 배치 전체 failed 전이는 specs 단계에서만 수행
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to run prompt step"
        });
    }
}
