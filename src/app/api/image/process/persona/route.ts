import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import {
    adImageServerAPI,
} from "@/lib/api/server/ad/imageServerAPI";

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

        const uploadContentType = fileExtension === 'jpeg'
            ? 'image/jpeg'
            : fileExtension === 'png'
                ? 'image/png'
                : fileExtension === 'webp'
                    ? 'image/webp'
                    : `image/${fileExtension}`;

        try {
            await adImageServerAPI.uploadObject(filePath, imageBuffer, uploadContentType);
        } catch (uploadError) {
            const message = `Storage upload failed (${filePath}): ${uploadError instanceof Error ? uploadError.message : 'unknown'}`;
            await failBatch(message);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: message,
            });
        }

        // person_image 슬롯 점유 — brief는 note로 보관 (LLM grounding용)
        await adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, {
            person_image: {
                imageFileExtension: fileExtension,
                ...(brief ? { note: brief } : {}),
            },
        });

        // ⚠️ W1 임시: 조합 배분은 이제 워크플로가 소유한다. persona 경로는 W3에서 이관 예정이며,
        //   그때까지 이 체인은 동작하지 않는다(대상 라우트 `/api/creative/specs` 삭제됨).
        //   persona 배치를 쓰기 전에 W3를 먼저 끝낼 것.
        console.warn(`[process/persona] persona→specs chaining is disabled until W3 (batch=${batchId})`);

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
