import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";
import { llmServerAPI } from "@/lib/api/server/ad/llmServerAPI";
import { AdCopySpec, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { fontMap } from "@/lib/fonts";
import FONT_FAMILY_LIST from "@/lib/FontFamilyList";
import { StepError } from "@/lib/pipeline/types";

/**
 * 단계: creative 1장의 프롬프트(LLM) 생성.
 *
 * 원래 `api/creative/[creative-index]/prompt/route.ts`(203줄) 안에 있던 업무 로직을 그대로 옮긴 것.
 * 동작 변화 0 — 입력·출력·DB 쓰기·로그가 이전과 동일하다.
 *
 * 옮기면서 바꾼 것 2가지 (둘 다 계층 규칙 때문):
 * 1. `return getNextBaseResponse({ status: 400|500 })` → `throw new StepError(code)`
 *    (HTTP 상태 매핑은 route가 담당한다 — `PIPELINE_ARCHITECTURE.md` §2 R4)
 * 2. "다음 단계로 넘기는" `internalFireAndForgetFetch`는 여기 두지 않는다.
 *    지금은 route에 임시로 남아 있고, S3에서 오케스트레이터로 이동한다.
 */

export interface PrepareCreativePromptInput {
    batchId: string;
    creativeIndex: number;
}

export interface PrepareCreativePromptOutput {
    creativeIndex: number;
    creativePrompt: string;
    copy: AdCopySpec;
}

/** 원본 이미지들을 base64로 — 있으면 GLM Vision에 전달 (이미지가 1차 진실, note는 보조) */
async function loadReferenceImagesAsBase64(batch: Awaited<ReturnType<typeof adGenerationBatchServerAPI.getAdGenerationBatchById>> & object) {
    const result: {
        productImageBase64: string | null;
        personImageBase64: string | null;
        brandLogoBase64: string | null;
    } = { productImageBase64: null, personImageBase64: null, brandLogoBase64: null };

    try {
        const originalUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);
        let urlIdx = 0;

        const fetchBase64 = async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) return null;
            const buf = await res.arrayBuffer();
            return Buffer.from(buf).toString('base64');
        };

        if (batch.product_image) {
            const url = originalUrls[urlIdx++];
            if (url) result.productImageBase64 = await fetchBase64(url);
        }
        if (batch.person_image) {
            const url = originalUrls[urlIdx++];
            if (url) result.personImageBase64 = await fetchBase64(url);
        }

        const logoRecord = (batch as unknown as { brand_logo?: { imageFileExtension?: string } | null }).brand_logo;
        if (logoRecord) {
            try {
                const brandLogoUrl = await adImageServerAPI.getBatchBrandLogoSignedUrl(
                    batch.user_id,
                    batch.id,
                    logoRecord.imageFileExtension as string,
                );
                result.brandLogoBase64 = await fetchBase64(brandLogoUrl);
            } catch (e) {
                console.warn(`[prompt] failed to fetch brand logo for batch ${batch.id}:`, e);
            }
        }
    } catch (e) {
        console.warn(`[prompt] failed to fetch original images for batch ${batch.id}:`, e);
    }

    return result;
}

/** 폰트·웨이트·헤드라인 색 검증 — 목록 밖 값은 기본값으로 교정 (기존 동작 유지) */
function normalizeCopyFields(copy: AdCopySpec, batchId: string, creativeIndex: number): AdCopySpec {
    // fontFamily — 목록 외 반환 시 Inter로 교정
    const rawFont = copy.fontFamily;
    const allowedFonts = new Set(Object.keys(fontMap));
    if (rawFont && !allowedFonts.has(rawFont)) {
        console.warn(`[prompt] fontFamily "${rawFont}" not in available_fonts, fallback to Inter (creative ${creativeIndex} batch ${batchId})`);
        copy.fontFamily = 'Inter';
    } else if (!rawFont) {
        copy.fontFamily = 'Inter';
    }

    // fontWeight — 해당 폰트의 weightList 중 하나여야 함
    const finalFont = copy.fontFamily as string;
    const fontEntry = FONT_FAMILY_LIST.find((f) => f.name === finalFont);
    const supportedWeights = fontEntry ? fontEntry.weightList.map((v) => v.weight) : [400];
    const rawWeight = copy.fontWeight as number | null | undefined;
    if (typeof rawWeight !== 'number' || !supportedWeights.includes(rawWeight)) {
        const fallbackWeight = supportedWeights.includes(400) ? 400 : supportedWeights.includes(600) ? 600 : supportedWeights[0] ?? 400;
        console.warn(`[prompt] fontWeight "${rawWeight}" not supported for "${finalFont}" (supported: ${supportedWeights.join(',')}), fallback to ${fallbackWeight}`);
        copy.fontWeight = fallbackWeight;
    }

    // headlineColor — white/black 2택
    const rawColor = copy.headlineColor as string | null | undefined;
    if (rawColor !== 'white' && rawColor !== 'black') {
        console.warn(`[prompt] headlineColor "${rawColor}" invalid, fallback to white (creative ${creativeIndex} batch ${batchId})`);
        copy.headlineColor = 'white';
    }

    return copy;
}

/**
 * creative 프롬프트 1장 생성 + 저장. creative마다 1회.
 * 멱등: 이미 prompt가 저장돼 있으면 아무것도 하지 않고 기존 값을 반환한다.
 */
export async function prepareCreativePrompt(
    input: PrepareCreativePromptInput,
): Promise<PrepareCreativePromptOutput> {
    const { batchId, creativeIndex } = input;

    const adGenerationBatch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!adGenerationBatch) {
        throw new StepError('BATCH_NOT_FOUND', 'Batch not found.');
    }

    const adCreativeSpec = adGenerationBatch.ad_creative_specs[creativeIndex];
    if (!adCreativeSpec || adCreativeSpec.creativeIndex !== creativeIndex) {
        throw new StepError('SPEC_NOT_FOUND', `Creative spec #${creativeIndex} not found in batch.`);
    }

    const { productImageBase64, personImageBase64, brandLogoBase64 } =
        await loadReferenceImagesAsBase64(adGenerationBatch);

    const baseRatio: AdRatioKey = selectBaseRatio(adGenerationBatch.aspect_ratios);

    const llmResult = await llmServerAPI.postCreativeBaseImagePrompt({
        creativeIndex,
        creativeSpec: adCreativeSpec,
        baseRatio,
        productNote: adGenerationBatch.product_image?.note ?? null,
        personNote: adGenerationBatch.person_image?.note ?? null,
        ctaEnabled: adGenerationBatch.cta_enabled,
        brandPalette: adGenerationBatch.brand_palette ?? null,
        seed: adCreativeSpec.seed,
        productImageBase64,
        personImageBase64,
        brandLogoBase64,
    });

    if (!llmResult.success || !llmResult.creativePrompt || !llmResult.copy) {
        console.error(`[prompt] LLM failed creative #${creativeIndex} batch ${batchId}:`, llmResult.error);
        throw new StepError(
            'PROMPT_LLM_FAILED',
            llmResult.error?.message ?? 'LLM creative prompt failed',
        );
    }

    const copy = normalizeCopyFields({ ...llmResult.copy }, batchId, creativeIndex);

    await adGenerationBatchServerAPI.updateCreativePromptOutputs(
        batchId,
        creativeIndex,
        llmResult.creativePrompt,
        baseRatio,
        copy,
    );

    return {
        creativeIndex,
        creativePrompt: llmResult.creativePrompt,
        copy,
    };
}
