import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import {
    AD_IMAGE_STORAGE_BUCKET,
    adImageServerAPI,
} from "@/lib/api/server/ad/imageServerAPI";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";

const MAX_SAME_RATIO_ATTEMPTS = 2; // 1회 재시도 → 총 2회 시도

/**
 * 기준(base) 이미지 후처리 단계 — 웹훅 배달부(webhook/.../base)에서 전달받아 실행.
 * payload 검사 → 이미지 다운로드·Supabase 저장 → RPC#2(완료 마커·마지막 조각 판정) →
 * 성공 시 generation/ratios 재호출로 파생 단계를 연다. 이 라우트가 creative의 갈래점이다.
 */
export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const creativeIndexParam = searchParams.get('creativeIndex');
    const ratioKeyParam = searchParams.get('ratioKey');

    if (!batchId || creativeIndexParam === null) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query params: batchId, creativeIndex"
        });
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);

    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid creativeIndex query param."
        });
    }

    try {
        const body = await request.json();
        const replicatePayload = body?.replicatePayload;

        if (!replicatePayload || typeof replicatePayload.id !== 'string' || typeof replicatePayload.status !== 'string') {
            throw new Error("Invalid replicatePayload: missing id or status.");
        }

        // fail-soft + n=2 성의 재시도: 같은 비율 최대 2회 시도 후 차순위 base로 폴백
        if (replicatePayload.status !== 'succeeded') {
            const errorMessage = replicatePayload.error ?? `Replicate status ${replicatePayload.status}`;
            const attempt = Number.parseInt(searchParams.get('attempt') ?? '1', 10) || 1;
            let effectiveRatioKeyForError = ratioKeyParam;
            if (!effectiveRatioKeyForError && replicatePayload.input?.aspect_ratio && typeof replicatePayload.input.aspect_ratio === 'string') {
                effectiveRatioKeyForError = (replicatePayload.input.aspect_ratio as string).replace(':', '_');
            }
            console.error(`[process/base] prediction failed (batch=${batchId}, creative=${creativeIndex}, ratio=${effectiveRatioKeyForError}, attempt=${attempt}, status=${replicatePayload.status}, error=${errorMessage})`);

            if (effectiveRatioKeyForError && attempt < MAX_SAME_RATIO_ATTEMPTS) {
                // 같은 비율 재시도
                console.log(`[process/base] retry same ratio ${effectiveRatioKeyForError} attempt ${attempt + 1}/${MAX_SAME_RATIO_ATTEMPTS}`);
                internalFireAndForgetFetch(
                    `${process.env.BASE_URL}/api/ad/image/generation/base?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&baseRatio=${encodeURIComponent(effectiveRatioKeyForError)}&attempt=${encodeURIComponent(String(attempt + 1))}`,
                    { method: "POST" },
                );
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: `Base ${effectiveRatioKeyForError} attempt ${attempt} failed, retrying same ratio attempt ${attempt + 1} (n=2).`,
                });
            }

            // n회 실패 → 해당 비율 error 마킹 후 차순위 base로 폴백
            if (effectiveRatioKeyForError) {
                await adGenerationBatchServerAPI.updateCreativeImageByRatioGenerationCompleted(
                    batchId,
                    creativeIndex,
                    effectiveRatioKeyForError,
                    null,
                    { code: 'REPLICATE_' + replicatePayload.status.toUpperCase(), message: errorMessage },
                ).catch(() => {});
            }

            try {
                const batchForFallback = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
                if (batchForFallback) {
                    const doneKeys = new Set(Object.keys(batchForFallback.ad_creative_results?.[creativeIndex]?.imageResults ?? {}));
                    // 실패한 base도 done으로 간주되므로, 남은 것 중 다음 base 선정
                    const remainingRatios = (batchForFallback.aspect_ratios as AdRatioKey[]).filter((r) => !doneKeys.has(r));
                    if (remainingRatios.length > 0) {
                        const nextBase = selectBaseRatio(remainingRatios);
                        console.log(`[process/base] fallback to next base ${nextBase} after ${effectiveRatioKeyForError} exhausted n=${MAX_SAME_RATIO_ATTEMPTS}`);
                        internalFireAndForgetFetch(
                            `${process.env.BASE_URL}/api/ad/image/generation/base?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&baseRatio=${encodeURIComponent(nextBase)}&attempt=1`,
                            { method: "POST" },
                        );
                        return getNextBaseResponse({
                            success: true,
                            status: 200,
                            message: `Base ${effectiveRatioKeyForError} exhausted n=${MAX_SAME_RATIO_ATTEMPTS}, fallback to next base ${nextBase}.`,
                        });
                    }
                }
            } catch {}

            // 차순위도 없으면 원본만으로 폴백 (마지막 수단)
            internalFireAndForgetFetch(
                `${process.env.BASE_URL}/api/ad/image/generation/ratios?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}`,
                { method: "POST" },
            );

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: `Base ${effectiveRatioKeyForError} failed after n=${MAX_SAME_RATIO_ATTEMPTS},Creative ${creativeIndex} base marked as error, fallback dispatched.`,
            });
        }

        let effectiveRatioKey = ratioKeyParam;
        if (!effectiveRatioKey && replicatePayload.input?.aspect_ratio && typeof replicatePayload.input.aspect_ratio === 'string') {
            effectiveRatioKey = (replicatePayload.input.aspect_ratio as string).replace(':', '_');
        }

        if (!effectiveRatioKey) {
            throw new Error("ratioKey is missing (query and payload.input.aspect_ratio both absent).");
        }

        const outputUrl = adImageServerAPI.extractFirstOutputUrl(replicatePayload.output);

        if (!outputUrl || typeof outputUrl !== 'string') {
            throw new Error("No output URL found in replicate payload.");
        }

        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!batch) {
            throw new Error(`Batch not found: ${batchId}`);
        }

        const imageResponse = await fetch(outputUrl);

        if (!imageResponse.ok) {
            throw new Error(`Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const contentType = imageResponse.headers.get('content-type');
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        const fileExtension = adImageServerAPI.inferFileExtension(contentType, outputUrl);

        const filePath = adImageServerAPI.getAdResultImagePath(
            batch.user_id,
            batch.id,
            creativeIndex,
            effectiveRatioKey as AdRatioKey,
            fileExtension,
        );

        const supabase = createSupabaseServiceRoleClient();
        const uploadContentType = fileExtension === 'jpeg' ? 'image/jpeg' : fileExtension === 'png' ? 'image/png' : fileExtension === 'webp' ? 'image/webp' : `image/${fileExtension}`;

        const { error: uploadError } = await supabase.storage
            .from(AD_IMAGE_STORAGE_BUCKET)
            .upload(filePath, imageBuffer, {
                contentType: uploadContentType,
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Supabase Storage upload failed (${filePath}): ${uploadError.message}`);
        }

        await adGenerationBatchServerAPI.updateCreativeImageByRatioGenerationCompleted(
            batchId,
            creativeIndex,
            effectiveRatioKey,
            fileExtension,
        );

        // 파생 단계 개시 — 중립 실행자(ratios)가 모드를 스스로 판별한다
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/ad/image/generation/ratios?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}`,
            { method: "POST" },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Base image processed and ratio generation dispatched.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/image/process/base (batch=${batchId}, creative=${creativeIndex}):`, error);

        // fail-soft: process 예외도 배치 전체 failed로 전이하지 않음 — 500 반환으로 Replicate 재시도 없이 종료
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to process base image"
        });
    }
}
