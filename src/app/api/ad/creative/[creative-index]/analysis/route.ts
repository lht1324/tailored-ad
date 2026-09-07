import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { llmServerAPI } from "@/lib/api/server/ad/llmServerAPI";
import { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * Creative 묶음 분석 단계 — process/ratios가 RPC#2에서 isLastCreative=true를 받았을 때만 호출.
 * 이 creative의 선택 비율 이미지 전부를 Qwen Vision으로 보고
 * 오버레이 지오메트리(design)와 score(0.0~10.0)를 비율당 확정한 뒤
 * RPC#3 update_creative_image_analysis로 저장한다.
 * (RPC#3이 배치 전부의 score 완료를 보고 status 'completed' 전이까지 처리한다)
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ 'creative-index': string }> },
) {
    if (!getIsValidRequestS2S(request)) {
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
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!batch) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch not found."
            });
        }

        const creativeSpec = batch.ad_creative_specs[creativeIndex];

        if (!creativeSpec || creativeSpec.creativeIndex !== creativeIndex) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Creative spec #${creativeIndex} not found in batch.`
            });
        }

        const creativeResult = batch.ad_creative_results?.[creativeIndex];

        if (!creativeResult || !creativeResult.copy) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Creative result #${creativeIndex} copy not found. Prompt step must be completed before analysis.`
            });
        }

        if (!Array.isArray(batch.aspect_ratios) || batch.aspect_ratios.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch has no aspect ratios."
            });
        }

        // 1) 이미지 수집 — 규칙 경로 + RPC 마커 확장자로 signed URL → base64 (fail-soft: error 비율은 스킵)
        const ratioOrder = batch.aspect_ratios as AdRatioKey[];
        const imageInputs: Array<{ ratioKey: AdRatioKey; imageBase64: string }> = [];
        const failedRatios = new Set<AdRatioKey>();

        for (const ratioKey of ratioOrder) {
            const existingResult = creativeResult.imageResults?.[ratioKey] as { imageFileExtension?: string | null; error?: unknown } | undefined;
            const fileExtension = existingResult?.imageFileExtension;
            const hasError = !!(existingResult as { error?: unknown } | undefined)?.error;

            if (hasError) {
                failedRatios.add(ratioKey);
                continue;
            }

            if (!fileExtension || typeof fileExtension !== 'string' || fileExtension.trim().length === 0) {
                return getNextBaseResponse({
                    success: false,
                    status: 409,
                    error: `Image for ratio ${ratioKey} is not ready. Generation must be completed before analysis.`
                });
            }

            const signedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
                batch.user_id,
                batch.id,
                creativeIndex,
                ratioKey,
                fileExtension,
            );

            const response = await fetch(signedUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch result image ${ratioKey}: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            imageInputs.push({ ratioKey, imageBase64: base64 });
        }

        // 전부 실패한 creative는 Vision 호출 없이 error 그대로 유지해 RPC로 완료 처리
        if (imageInputs.length === 0) {
            const mergedForAllFailed: Record<string, unknown> = {};
            for (const ratioKey of ratioOrder) {
                const existing = creativeResult.imageResults?.[ratioKey] as unknown as Record<string, unknown>;
                if (existing) {
                    mergedForAllFailed[ratioKey] = existing;
                }
            }
            await adGenerationBatchServerAPI.updateCreativeImageAnalysis(
                batchId,
                creativeIndex,
                mergedForAllFailed,
            );
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Creative analysis skipped — all ratios failed (fail-soft).",
                data: { creativeIndex, imageResults: mergedForAllFailed },
            });
        }

        // 1b) 브랜드 로고 수집 — 있으면 base64로 추가 컨텍스트 전달
        let brandLogoBase64: string | null = null;
        if ((batch as unknown as { brand_logo?: { imageFileExtension?: string } | null }).brand_logo) {
            const brandLogoRecord = (batch as unknown as { brand_logo: { imageFileExtension: string } }).brand_logo;
            try {
                const brandLogoUrl = await adImageServerAPI.getBatchBrandLogoSignedUrl(batch.user_id, batch.id, brandLogoRecord.imageFileExtension);
                const res = await fetch(brandLogoUrl);
                if (res.ok) {
                    const buf = await res.arrayBuffer();
                    brandLogoBase64 = Buffer.from(buf).toString('base64');
                }
            } catch (e) {
                console.warn(`[analysis] failed to fetch brand logo for batch ${batchId} creative ${creativeIndex}:`, e);
            }
        }

        // 2) Qwen Vision 묶음 평가 — 성공한 비율만 (fail-soft)
        const successfulRatios = imageInputs.map((i) => i.ratioKey);
        const llmResult = await llmServerAPI.postAdImageAnalysis({
            creativeIndex,
            aspectRatios: successfulRatios as AdRatioKey[],
            creativeSpec,
            copy: creativeResult.copy,
            brandPalette: batch.brand_palette ?? null,
            imageInputs,
            brandLogoBase64,
        });

        if (!llmResult.success || !llmResult.imageResults) {
            console.error(`[analysis] Vision failed creative #${creativeIndex} batch ${batchId}:`, llmResult.error);

            // fail-soft: creative 단위 실패 — 배치 전체 failed 전이하지 않음, 호출자가 재시도
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: llmResult.error?.message ?? "Vision analysis failed",
            });
        }

        // 3) RPC 마커의 imageFileExtension 보존 — Vision은 null로 반환하므로 기존 값으로 메움
        const mergedResults: Record<string, unknown> = {};

        for (const [ratioKey, value] of Object.entries(llmResult.imageResults)) {
            const typedRatio = ratioKey as AdRatioKey;
            const existingExtension = (creativeResult.imageResults?.[typedRatio] as { imageFileExtension?: string | null } | undefined)?.imageFileExtension ?? null;
            const typedValue = value as { design: unknown; score: unknown };

            mergedResults[ratioKey] = {
                design: typedValue.design,
                score: typedValue.score,
                imageFileExtension: existingExtension,
            };
        }

        // 누락된 비율이 있으면 기존 마커 유지 (방어)
        for (const ratioKey of ratioOrder) {
            if (!(ratioKey in mergedResults) && creativeResult.imageResults?.[ratioKey]) {
                const existing = creativeResult.imageResults[ratioKey] as unknown as Record<string, unknown>;
                mergedResults[ratioKey] = existing;
            }
        }

        await adGenerationBatchServerAPI.updateCreativeImageAnalysis(
            batchId,
            creativeIndex,
            mergedResults,
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Creative analysis completed.",
            data: {
                creativeIndex,
                imageResults: mergedResults,
            },
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/creative/${creativeIndexParam}/analysis (batch=${batchId}):`, error);

        // analysis 실패는 creative 격리 — 배치 전체 failed로 전이하지 않음 (fail-soft)
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to run analysis"
        });
    }
}
