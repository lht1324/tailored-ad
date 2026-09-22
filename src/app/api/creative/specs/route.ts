import { getServerEnv } from "@/lib/serverEnv";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import {
    AdCreativeResult,
    AdCreativeSpec,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { assignCreativeCombinations, type CreativeMode } from "@/lib/api/server/ad/creativeCombinationSampler";

/**
 * Creative 조합 배분 단계.
 * 코드가 5축 조합을 결정적으로 배분해 ad_creative_specs에 저장하고,
 * results 골격(copy·imageResults는 각 단계가 채움)을 함께 초기화한 뒤
 * creative마다 프롬프트 단계를 fire-and-forget으로 호출한다.
 */
export async function POST(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const batchId = request.nextUrl.searchParams.get('batchId');

    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: batchId"
        });
    }

    try {
        const adGenerationBatch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!adGenerationBatch) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch not found."
            });
        }

        // 이중 발화 방어 — 배분은 queued 상태에서 1회만 수행
        if (adGenerationBatch.status !== 'queued') {
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Batch already started. Skipping duplicate assignment."
            });
        }

        // 조합 배분 — 코드 소유. 시드는 매 배치 새로 뽑고, 재현은 저장된 specs가 담당한다.
        // 모드는 입력 이미지 기준 (프롬프트 선택과 동일 규칙: 둘 다→combined, 사람만→person, 나머지→product)
        const batchImages = adGenerationBatch as unknown as { product_image?: unknown; person_image?: unknown };
        const hasProductImage = Boolean(batchImages.product_image);
        const hasPersonImage = Boolean(batchImages.person_image);
        const creativeMode: CreativeMode = hasProductImage && hasPersonImage
            ? 'combined'
            : hasPersonImage ? 'person-only' : 'product-only';
        const creativeSpecs: AdCreativeSpec[] = assignCreativeCombinations(adGenerationBatch.concept_count, undefined, creativeMode);

        const creativeResults: AdCreativeResult[] = creativeSpecs.map((spec) => ({
            creativeIndex: spec.creativeIndex,
            copy: {
                headline: null,
                cta: null,
            },
            imageResults: {},
        }));

        await adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, {
            ad_creative_specs: creativeSpecs,
            ad_creative_results: creativeResults,
            status: 'generating',
        });

        // creative마다 프롬프트(LLM 캡션+copy) 단계 호출
        for (const spec of creativeSpecs) {
            internalFireAndForgetFetch(
                `${await getServerEnv('BASE_URL')}/api/creative/${spec.creativeIndex}/prompt?batchId=${batchId}`,
                { method: "POST" },
            );
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                assignedCount: creativeSpecs.length,
            },
            message: "Creative combinations assigned and prompt steps dispatched.",
        });
    } catch (error) {
        console.error("Error in POST /api/creative/specs:", error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to assign creative combinations"
        });
    }
}
