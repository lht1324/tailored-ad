import { getServerEnv } from "@/lib/serverEnv";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";
import { llmServerAPI } from "@/lib/api/server/ad/llmServerAPI";
import { fontMap } from "@/lib/fonts";
import FONT_FAMILY_LIST from "@/lib/FontFamilyList";

/**
 * Creative별 프롬프트(LLM) 단계 — Creative마다 1회 호출 (ad_variation_study.md §3).
 * 코드가 배정한 5축 조합 + 사용자 입력을 받아 creative 프롬프트(creativePrompt)와
 * 판매 카피(headline/CTA, headline은 조건부 — 무헤드라인 원본 렌더도 지원)를 한 번에 생성한다.
 */
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
        const adGenerationBatch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!adGenerationBatch) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch not found."
            });
        }

        const adCreativeSpec = adGenerationBatch.ad_creative_specs[creativeIndex];

        if (!adCreativeSpec || adCreativeSpec.creativeIndex !== creativeIndex) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Creative spec #${creativeIndex} not found in batch.`
            });
        }

        // 0) 원본 이미지 수집 — 있으면 base64로 변환해 GLM Vision에 전달 (이미지가 1차 진실, note는 보조)
        let productImageBase64: string | null = null;
        let personImageBase64: string | null = null;
        let brandLogoBase64: string | null = null;
        try {
            const originalUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(adGenerationBatch);
            let urlIdx = 0;
            const fetchBase64 = async (url: string) => {
                const res = await fetch(url);
                if (!res.ok) return null;
                const buf = await res.arrayBuffer();
                return Buffer.from(buf).toString('base64');
            };
            if (adGenerationBatch.product_image) {
                const url = originalUrls[urlIdx++];
                if (url) productImageBase64 = await fetchBase64(url);
            }
            if (adGenerationBatch.person_image) {
                const url = originalUrls[urlIdx++];
                if (url) personImageBase64 = await fetchBase64(url);
            }
            if ((adGenerationBatch as unknown as { brand_logo?: { imageFileExtension?: string } | null }).brand_logo) {
                const brandLogoRecord = (adGenerationBatch as unknown as { brand_logo: { imageFileExtension: string } }).brand_logo;
                try {
                    const brandLogoUrl = await adImageServerAPI.getBatchBrandLogoSignedUrl(adGenerationBatch.user_id, adGenerationBatch.id, brandLogoRecord.imageFileExtension);
                    brandLogoBase64 = await fetchBase64(brandLogoUrl);
                } catch (e) {
                    console.warn(`[prompt] failed to fetch brand logo for batch ${batchId}:`, e);
                }
            }
        } catch (e) {
            console.warn(`[prompt] failed to fetch original images for batch ${batchId} creative ${creativeIndex}:`, e);
        }

        // 1) GLM 5.3 Flash 호출 — 5축 + aspect_ratios + base_ratio + notes + cta + brandPalette + brandLogo + seed + images
        //    creative 프롬프트(creative_prompt 문자열) 1장 발주
        const baseRatio = selectBaseRatio(adGenerationBatch.aspect_ratios);
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

            // fail-soft: creative 단위 실패는 배치 전체 failed로 전이하지 않음 — 호출자가 재시도
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: llmResult.error?.message ?? "LLM creative prompt failed",
            });
        }

        // fontFamily 검증 — 목록 외 반환 시 Inter로 교정
        const rawFont = llmResult.copy.fontFamily;
        const allowedFonts = new Set(Object.keys(fontMap));
        if (rawFont && !allowedFonts.has(rawFont)) {
            console.warn(`[prompt] fontFamily "${rawFont}" not in available_fonts, fallback to Inter (creative ${creativeIndex} batch ${batchId})`);
            llmResult.copy.fontFamily = 'Inter';
        } else if (!rawFont) {
            llmResult.copy.fontFamily = 'Inter';
        }

        // fontWeight 검증 — 해당 폰트의 weightList 중 하나여야 함
        const finalFont = llmResult.copy.fontFamily as string;
        const fontEntry = FONT_FAMILY_LIST.find((f) => f.name === finalFont);
        const supportedWeights = fontEntry ? fontEntry.weightList.map((v) => v.weight) : [400];
        const rawWeight = llmResult.copy.fontWeight as number | null | undefined;
        if (typeof rawWeight !== 'number' || !supportedWeights.includes(rawWeight)) {
            const fallbackWeight = supportedWeights.includes(400) ? 400 : supportedWeights.includes(600) ? 600 : supportedWeights[0] ?? 400;
            console.warn(`[prompt] fontWeight "${rawWeight}" not supported for "${finalFont}" (supported: ${supportedWeights.join(',')}), fallback to ${fallbackWeight}`);
            llmResult.copy.fontWeight = fallbackWeight;
        }

        // headlineColor 검증 — white/black 2택
        const rawColor = llmResult.copy.headlineColor as string | null | undefined;
        if (rawColor !== 'white' && rawColor !== 'black') {
            console.warn(`[prompt] headlineColor "${rawColor}" invalid, fallback to white (creative ${creativeIndex} batch ${batchId})`);
            llmResult.copy.headlineColor = 'white';
        }

        // 2) RPC로 저장 — creativePrompt + copy
        await adGenerationBatchServerAPI.updateCreativePromptOutputs(
            batchId,
            creativeIndex,
            llmResult.creativePrompt,
            baseRatio,
            llmResult.copy,
        );

        // 3) 비율 갯수 판정 → generation 분기 (fire-and-forget, creative 격리)
        const baseUrl = await getServerEnv('BASE_URL');

        if (!baseUrl) {
            throw new Error("BASE_URL is not configured.");
        }

        internalFireAndForgetFetch(
            `${baseUrl}/api/image/generation/base?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}`,
            { method: "POST" },
        )

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Creative prompt generated and generation dispatched.",
            data: {
                creativeIndex,
                creativePrompt: llmResult.creativePrompt,
                copy: llmResult.copy,
            },
        });
    } catch (error) {
        console.error(`Error in POST /api/creative/${creativeIndexParam}/prompt:`, error);

        // prompt 실패는 creative 단위 격리 — 배치 전체 failed 전이는 specs 단계에서만 수행
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to run prompt step"
        });
    }
}
