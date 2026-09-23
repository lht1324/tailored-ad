import { getServerEnv } from "@/lib/serverEnv";
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

/**
 * 페르소나 후처리 — 웹훅 배달부(webhook/.../persona)에서 전달받아 실행.
 * 결과 다운로드 → person_image 슬롯에 저장 → DB person_image 기록 → specs 체이닝.
 * 이후 파이프라인은 실사 업로드와 완전히 동일하다 (슬롯 점유 설계).
 * 실패는 배치 failed (얼굴 없이 진행 불가). 과금 원장 기록 없음 (저장 확정물 아님).
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
    const brief = request.nextUrl.searchParams.get('brief');

    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: batchId"
        });
    }

    const failBatch = async (message: string) => {
        console.error(`[process/persona] ${message} (batch=${batchId})`);
        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});
    };

    try {
        const {
            replicatePayload,
        } = await request.json();

        if (!replicatePayload || typeof replicatePayload.id !== 'string' || typeof replicatePayload.status !== 'string') {
            await failBatch("Invalid replicatePayload: missing id or status.");
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: "Invalid replicatePayload: missing id or status."
            });
        }

        if (replicatePayload.status !== 'succeeded') {
            const errorMessage = replicatePayload.error ?? `Replicate status ${replicatePayload.status}`;
            await failBatch(`prediction failed: ${errorMessage}`);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: errorMessage,
            });
        }

        const outputUrl = adImageServerAPI.extractFirstOutputUrl(replicatePayload.output);

        if (!outputUrl || typeof outputUrl !== 'string') {
            await failBatch("No output URL found in replicate payload.");
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: "No output URL found in replicate payload."
            });
        }

        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!batch) {
            await failBatch("Batch not found.");
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: `Batch not found: ${batchId}`,
            });
        }

        const imageResponse = await fetch(outputUrl);

        if (!imageResponse.ok) {
            await failBatch(`Failed to download image from Replicate: ${imageResponse.status}`);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: `Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`
            });
        }

        const contentType = imageResponse.headers.get('content-type');
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        const fileExtension = adImageServerAPI.inferFileExtension(contentType, outputUrl);
        const filePath = `${batch.user_id}/${batchId}/person_image.${fileExtension}`;

        const supabase = await createSupabaseServiceRoleClient();
        const uploadContentType = fileExtension === 'jpeg'
            ? 'image/jpeg'
            : fileExtension === 'png'
                ? 'image/png'
                : fileExtension === 'webp'
                    ? 'image/webp'
                    : `image/${fileExtension}`;

        const { error: uploadError } = await supabase.storage
            .from(AD_IMAGE_STORAGE_BUCKET)
            .upload(filePath, imageBuffer, {
                contentType: uploadContentType,
                upsert: true,
            });

        if (uploadError) {
            await failBatch(`Supabase Storage upload failed: ${uploadError.message}`);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: `Supabase Storage upload failed (${filePath}): ${uploadError.message}`
            });
        }

        // person_image 슬롯 점유 — brief는 note로 보관 (LLM grounding용)
        await adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, {
            person_image: {
                imageFileExtension: fileExtension,
                ...(brief ? { note: brief } : {}),
            },
        });

        // 조합 배분 단계로 체이닝 (페르소나 파일 존재 보장됨)
        internalFireAndForgetFetch(
            `${await getServerEnv('BASE_URL')}/api/creative/specs?batchId=${batchId}`,
            { method: "POST" },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Persona stored and specs dispatched.",
        });
    } catch (error) {
        await failBatch(error instanceof Error ? error.message : "Failed to process persona image");
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to process persona image"
        });
    }
}
