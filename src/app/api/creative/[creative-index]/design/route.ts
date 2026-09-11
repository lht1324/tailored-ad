import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { fontMap } from "@/lib/fonts";
import { isValidHexColor, normalizeHeadlineColor } from "@/lib/colorUtils";
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";
import { AdCreativeResult, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * 에디터 저장 단계 — 완성 배치의 특정 비율 design + creative 공용 copy를 덮어쓴다.
 * running 배치에는 409 (파이프라인 쓰기와 read-modify-write 경합 방지 — 완성 후 편집 원칙).
 * copy.headline은 creative 공용 필드라 같은 creative 전 비율에 함께 반영됨 (仕様, 버그 아님).
 */

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function validateDesign(input: unknown): { ok: boolean; error?: string } {
    if (typeof input !== 'object' || input === null) {
        return { ok: false, error: "design must be an object." };
    }
    const design = input as Record<string, unknown>;
    if (typeof design.scrim !== 'boolean') {
        return { ok: false, error: "design.scrim must be a boolean." };
    }
    if (design.scrimStrength !== undefined && design.scrimStrength !== null) {
        if (!isFiniteNumber(design.scrimStrength) || (design.scrimStrength as number) < 0 || (design.scrimStrength as number) > 100) {
            return { ok: false, error: "design.scrimStrength must be 0-100." };
        }
    }
    const headline = design.headline as Record<string, unknown> | null;
    if (headline !== null && headline !== undefined) {
        if (typeof headline.text !== 'string' || headline.text.length === 0 || headline.text.length > 200) {
            return { ok: false, error: "design.headline.text must be 1-200 chars." };
        }
        for (const key of ['x', 'y', 'maxWidth', 'fontSizePct'] as const) {
            if (!isFiniteNumber(headline[key]) || (headline[key] as number) < 0 || (headline[key] as number) > 100) {
                return { ok: false, error: `design.headline.${key} must be 0-100.` };
            }
        }
        if (headline.align !== 'left' && headline.align !== 'center' && headline.align !== 'right') {
            return { ok: false, error: "design.headline.align must be left|center|right." };
        }
        if (headline.color !== undefined && headline.color !== null && headline.color !== 'white' && headline.color !== 'black' && !isValidHexColor(headline.color)) {
            return { ok: false, error: "design.headline.color must be white|black|#RRGGBB." };
        }
    }
    const cta = design.cta as Record<string, unknown> | null;
    if (cta !== null && cta !== undefined) {
        if (typeof cta.text !== 'string' || cta.text.length === 0 || cta.text.length > 60) {
            return { ok: false, error: "design.cta.text must be 1-60 chars." };
        }
        for (const key of ['x', 'y', 'widthPct', 'fontSizePct'] as const) {
            if (!isFiniteNumber(cta[key]) || (cta[key] as number) < 0 || (cta[key] as number) > 100) {
                return { ok: false, error: `design.cta.${key} must be 0-100.` };
            }
        }
    }
    return { ok: true };
}

export async function PATCH(
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

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId.",
        });
    }

    const { 'creative-index': creativeIndexParam } = await context.params;
    const batchId = request.nextUrl.searchParams.get('batchId');
    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: batchId",
        });
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);
    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid creative-index path param.",
        });
    }

    try {
        const body = (await request.json()) as {
            ratioKey?: unknown;
            design?: unknown;
            copy?: unknown;
        };
        const ratioKey = body.ratioKey as AdRatioKey | undefined;
        if (!ratioKey || typeof ratioKey !== 'string') {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Missing required body field: ratioKey",
            });
        }

        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
        if (!batch) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Batch not found.",
            });
        }
        if (batch.user_id !== userId) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: "Forbidden. User mismatch.",
            });
        }
        if (!(batch.aspect_ratios as string[]).includes(ratioKey)) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `ratioKey ${ratioKey} is not in batch aspect_ratios.`,
            });
        }
        if (batch.status !== 'completed' && batch.status !== 'failed') {
            return getNextBaseResponse({
                success: false,
                status: 409,
                error: "Batch is still running. Editing is available after completion.",
            });
        }

        const results = batch.ad_creative_results ?? [];
        const resultIndex = results.findIndex((r) => r.creativeIndex === creativeIndex);
        if (resultIndex === -1) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: `Creative #${creativeIndex} result not found.`,
            });
        }

        let nextDesign: AdDesignLayout | undefined;
        if (body.design !== undefined) {
            const checked = validateDesign(body.design);
            if (!checked.ok) {
                return getNextBaseResponse({ success: false, status: 400, error: checked.error });
            }
            nextDesign = body.design as AdDesignLayout;
        }

        let nextCopy: AdCreativeResult['copy'] | undefined;
        if (body.copy !== undefined) {
            if (typeof body.copy !== 'object' || body.copy === null) {
                return getNextBaseResponse({ success: false, status: 400, error: "copy must be an object." });
            }
            const copyInput = body.copy as Record<string, unknown>;
            const merged = { ...(results[resultIndex].copy as Record<string, unknown>) };
            if (copyInput.headline !== undefined) {
                if (typeof copyInput.headline !== 'string' || copyInput.headline.length === 0 || copyInput.headline.length > 200) {
                    return getNextBaseResponse({ success: false, status: 400, error: "copy.headline must be 1-200 chars." });
                }
                merged.headline = copyInput.headline;
            }
            if (copyInput.cta !== undefined) {
                if (copyInput.cta !== null && (typeof copyInput.cta !== 'string' || copyInput.cta.length > 60)) {
                    return getNextBaseResponse({ success: false, status: 400, error: "copy.cta must be null or ≤60 chars." });
                }
                merged.cta = copyInput.cta as string | null;
            }
            if (copyInput.fontFamily !== undefined) {
                if (typeof copyInput.fontFamily !== 'string' || !(copyInput.fontFamily in fontMap)) {
                    return getNextBaseResponse({ success: false, status: 400, error: "copy.fontFamily is not in available fonts." });
                }
                merged.fontFamily = copyInput.fontFamily;
            }
            if (copyInput.fontWeight !== undefined) {
                if (!isFiniteNumber(copyInput.fontWeight)) {
                    return getNextBaseResponse({ success: false, status: 400, error: "copy.fontWeight must be a number." });
                }
                merged.fontWeight = copyInput.fontWeight as number;
            }
            if (copyInput.headlineColor !== undefined) {
                // 토큰(white/black) + hex 허용, 저장 전 hex로 통일 (단일 강제점)
                const hc = copyInput.headlineColor;
                if (hc !== 'white' && hc !== 'black' && !isValidHexColor(hc)) {
                    return getNextBaseResponse({ success: false, status: 400, error: "copy.headlineColor must be white|black|#RRGGBB." });
                }
                merged.headlineColor = normalizeHeadlineColor(hc as string | null);
            }
            nextCopy = merged as AdCreativeResult['copy'];
        }

        if (!nextDesign && !nextCopy) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Nothing to update. Provide design and/or copy.",
            });
        }

        const updatedResults = results.map((r, i) => {
            if (i !== resultIndex) return r;
            const current = { ...(r.imageResults ?? {}) } as Record<string, AdCreativeResult['imageResults'][AdRatioKey]>;
            if (nextDesign) {
                const prev = current[ratioKey];
                if (!prev) {
                    return r;
                }
                current[ratioKey] = { ...prev, design: nextDesign };
            }
            return {
                ...r,
                imageResults: current,
                copy: nextCopy ?? r.copy,
            };
        });

        await adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, {
            ad_creative_results: updatedResults as AdCreativeResult[],
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { creativeIndex, ratioKey, design: nextDesign ?? null, copy: nextCopy ?? null },
            message: "Design updated.",
        });
    } catch (error) {
        console.error(`Error in PATCH /api/creative/${creativeIndexParam}/design:`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update design",
        });
    }
}
