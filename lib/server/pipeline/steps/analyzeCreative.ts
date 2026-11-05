import { adGenerationBatchServerAPI } from "@server/api/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@server/storage/imageStorage";
import { llmServerAPI } from "@server/api/ad/llmServerAPI";
import { StepError } from "@server/pipeline/types";
import type { AdRatioKey } from "@shared/types/supabase/ad/AdGenerationBatch";

/**
 * Creative 묶음 분석 단계 — 원래 `api/creative/[creative-index]/analysis` 라우트.
 *
 * 이 creative의 **선택 비율 이미지를 전부** Vision 모델에 넣어
 * 오버레이 지오메트리(`design`)와 점수(`score`)를 비율당 확정하고 RPC#3로 저장한다.
 * RPC#3이 배치 전체의 점수가 다 찼는지 보고 `completed` 전이까지 처리한다.
 *
 * ## 언제 불리는가
 * 이 creative의 모든 비율이 끝났을 때(`isLastCreative`) — 오케스트레이터가 호출한다.
 *
 * ## fail-soft 경계
 * - 일부 비율이 error → **스킵하고 성공한 것만** 평가한다 (이미지 없이 평가할 수 없다)
 * - 전부 실패 → Vision을 부르지 않고 마커만 유지한 채 저장(배치가 굳지 않게)
 * - Vision 호출 자체가 실패 → `StepError`로 던져 워크플로가 재시도하게 둔다
 *   (이미지 생성과 달리 **재시도 과금은 LLM 토큰뿐**이다)
 */

export interface AnalyzeCreativeOutput {
    stored: boolean;
    /** 저장된 비율 수 (0이면 전부 실패해서 스킵) */
    ratioCount: number;
    note: string;
}

/** Vision 출력 형 검증 — 각 비율이 `{design:{headline.text, scrim}, score:number}` 인가 */
function isValidAnalysisShape(results: unknown, ratioKeys: AdRatioKey[]): boolean {
    if (!results || typeof results !== "object") return false;
    const record = results as Record<string, unknown>;
    for (const key of ratioKeys) {
        const entry = record[key] as { design?: unknown; score?: unknown } | undefined;
        if (!entry || typeof entry !== "object") return false;
        if (typeof entry.score !== "number" || Number.isNaN(entry.score)) return false;
        const design = entry.design as { headline?: unknown; scrim?: unknown } | null;
        if (!design || typeof design !== "object") return false;
        const headline = design.headline as { text?: unknown } | null;
        if (!headline || typeof headline.text !== "string") return false;
        if (typeof design.scrim !== "boolean") return false;
    }
    return true;
}

export async function analyzeCreative(input: {
    batchId: string;
    creativeIndex: number;
}): Promise<AnalyzeCreativeOutput> {
    const { batchId, creativeIndex } = input;

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError("BATCH_NOT_FOUND", `Batch not found: ${batchId}`);
    }

    const creativeSpec = batch.ad_creative_specs[creativeIndex];
    if (!creativeSpec || creativeSpec.creativeIndex !== creativeIndex) {
        throw new StepError("SPEC_NOT_FOUND", `Creative spec #${creativeIndex} not found in batch.`);
    }

    const creativeResult = batch.ad_creative_results?.[creativeIndex];
    if (!creativeResult || !creativeResult.copy) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            `Creative result #${creativeIndex} copy not found. Prompt step must be completed before analysis.`,
        );
    }

    if (!Array.isArray(batch.aspect_ratios) || batch.aspect_ratios.length === 0) {
        throw new StepError("STEP_INTERNAL_ERROR", "Batch has no aspect ratios.");
    }

    // 1) 이미지 수집 — 규칙 경로 + RPC 마커 확장자로 signed URL → base64 (error 비율은 스킵)
    const ratioOrder = batch.aspect_ratios as AdRatioKey[];
    const imageInputs: Array<{ ratioKey: AdRatioKey; imageBase64: string }> = [];

    for (const ratioKey of ratioOrder) {
        const existing = creativeResult.imageResults?.[ratioKey] as
            | { imageFileExtension?: string | null; error?: unknown }
            | undefined;
        const fileExtension = existing?.imageFileExtension;

        if (existing?.error) continue;

        if (!fileExtension || typeof fileExtension !== "string" || fileExtension.trim().length === 0) {
            throw new StepError(
                "STEP_INTERNAL_ERROR",
                `Image for ratio ${ratioKey} is not ready. Generation must be completed before analysis.`,
            );
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
            throw new StepError(
                "STEP_INTERNAL_ERROR",
                `Failed to fetch result image ${ratioKey}: ${response.status} ${response.statusText}`,
            );
        }

        imageInputs.push({
            ratioKey,
            imageBase64: Buffer.from(await response.arrayBuffer()).toString("base64"),
        });
    }

    // 전부 실패한 creative는 Vision 없이 마커만 유지해 완료 처리 (배치가 굳지 않게)
    if (imageInputs.length === 0) {
        const mergedForAllFailed: Record<string, unknown> = {};
        for (const ratioKey of ratioOrder) {
            const existing = creativeResult.imageResults?.[ratioKey] as unknown as Record<string, unknown>;
            if (existing) mergedForAllFailed[ratioKey] = existing;
        }
        await adGenerationBatchServerAPI.updateCreativeImageAnalysis(
            batchId,
            creativeIndex,
            mergedForAllFailed,
        );
        return { stored: false, ratioCount: 0, note: "all ratios failed — analysis skipped" };
    }

    // 1b) 브랜드 로고 — 있으면 base64로 추가 컨텍스트 전달
    let brandLogoBase64: string | null = null;
    const brandLogo = (batch as unknown as { brand_logo?: { imageFileExtension?: string } | null }).brand_logo;
    if (brandLogo?.imageFileExtension) {
        try {
            const brandLogoUrl = await adImageServerAPI.getBatchBrandLogoSignedUrl(
                batch.user_id,
                batch.id,
                brandLogo.imageFileExtension,
            );
            const res = await fetch(brandLogoUrl);
            if (res.ok) {
                brandLogoBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
            }
        } catch (error) {
            console.warn(
                `[analyzeCreative] brand logo fetch failed (batch=${batchId}, creative=${creativeIndex}):`,
                error,
            );
        }
    }

    // 2) Vision 묶음 평가 — 성공한 비율만
    const successfulRatios = imageInputs.map((item) => item.ratioKey);
    const analysisParams = {
        creativeIndex,
        aspectRatios: successfulRatios,
        creativeSpec,
        copy: creativeResult.copy,
        brandPalette: batch.brand_palette ?? null,
        imageInputs,
        brandLogoBase64,
    };

    let llmResult = await llmServerAPI.postAdImageAnalysis(analysisParams);

    // 2b) 형 검증 — 깨진 채 저장 금지 (design 래퍼·score 누락). 불량이면 Vision 1회 재시도.
    if (llmResult.success && llmResult.imageResults && !isValidAnalysisShape(llmResult.imageResults, successfulRatios)) {
        console.error(
            `[analyzeCreative] malformed shape creative #${creativeIndex} batch ${batchId}, retrying vision once`,
        );
        llmResult = await llmServerAPI.postAdImageAnalysis(analysisParams);
    }

    if (llmResult.success && llmResult.imageResults && !isValidAnalysisShape(llmResult.imageResults, successfulRatios)) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            "Vision analysis returned malformed shape (missing design wrapper or score)",
        );
    }

    if (!llmResult.success || !llmResult.imageResults) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            llmResult.error?.message ?? "Vision analysis failed",
        );
    }

    // 3) RPC 마커의 imageFileExtension 보존 — Vision은 null로 반환하므로 기존 값으로 메운다
    const mergedResults: Record<string, unknown> = {};

    for (const [ratioKey, value] of Object.entries(llmResult.imageResults)) {
        const typedRatio = ratioKey as AdRatioKey;
        const existingExtension =
            (creativeResult.imageResults?.[typedRatio] as { imageFileExtension?: string | null } | undefined)
                ?.imageFileExtension ?? null;
        const typedValue = value as { design: unknown; score: unknown };

        mergedResults[ratioKey] = {
            design: typedValue.design,
            score: typedValue.score,
            imageFileExtension: existingExtension,
        };
    }

    // 누락된 비율은 기존 마커 유지 (방어)
    for (const ratioKey of ratioOrder) {
        if (!(ratioKey in mergedResults) && creativeResult.imageResults?.[ratioKey]) {
            mergedResults[ratioKey] = creativeResult.imageResults[ratioKey] as unknown as Record<string, unknown>;
        }
    }

    await adGenerationBatchServerAPI.updateCreativeImageAnalysis(batchId, creativeIndex, mergedResults);

    return {
        stored: true,
        ratioCount: Object.keys(mergedResults).length,
        note: `analysis stored for ${successfulRatios.length} ratio(s)`,
    };
}
