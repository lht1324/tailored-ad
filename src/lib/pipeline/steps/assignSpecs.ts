import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { assignCreativeCombinations, type CreativeMode } from "@/lib/api/server/ad/creativeCombinationSampler";
import { AdCreativeResult, AdCreativeSpec, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { StepError } from "@/lib/pipeline/types";

/**
 * 단계: 5축 조합 배정 (원래 `api/creative/specs/route.ts`).
 *
 * 하는 일
 *  - 배치의 concept_count만큼 5축 조합을 **결정적으로** 배분해 `ad_creative_specs`에 저장
 *  - `ad_creative_results` 골격(copy·imageResults 비어 있음)을 함께 초기화
 *  - 상태를 `queued` → `generating`으로 전이 (이 전이는 코드 소유. `designing`/`completed`는 RPC 소유)
 *
 * 멱등: 이미 specs가 있거나 status가 queued가 아니면 아무것도 하지 않고 현재 값을 반환한다.
 */

export interface AssignSpecsInput {
    batchId: string;
}

export interface AssignSpecsOutput {
    /** 실제 배정을 수행했는지 (false = 이미 되어 있었음) */
    assigned: boolean;
    creativeCount: number;
    aspectRatios: AdRatioKey[];
    specs: AdCreativeSpec[];
}

export async function assignSpecs(input: AssignSpecsInput): Promise<AssignSpecsOutput> {
    const { batchId } = input;

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError('BATCH_NOT_FOUND', 'Batch not found.');
    }

    const aspectRatios = batch.aspect_ratios as AdRatioKey[];

    // 이중 실행 방어 — 배분은 queued 상태에서 1회만
    if (batch.status !== 'queued') {
        return {
            assigned: false,
            creativeCount: batch.ad_creative_specs.length || batch.concept_count,
            aspectRatios,
            specs: batch.ad_creative_specs,
        };
    }

    const batchImages = batch as unknown as { product_image?: unknown; person_image?: unknown };
    const hasProductImage = Boolean(batchImages.product_image);
    const hasPersonImage = Boolean(batchImages.person_image);
    const creativeMode: CreativeMode = hasProductImage && hasPersonImage
        ? 'combined'
        : hasPersonImage ? 'person-only' : 'product-only';

    const creativeSpecs: AdCreativeSpec[] = assignCreativeCombinations(batch.concept_count, undefined, creativeMode);

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

    return {
        assigned: true,
        creativeCount: creativeSpecs.length,
        aspectRatios,
        specs: creativeSpecs,
    };
}
