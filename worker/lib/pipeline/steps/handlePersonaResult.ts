import { adGenerationBatchServerAPI } from "@worker/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@worker/lib/api/server/ad/imageServerAPI";
import { StepError } from "@worker/lib/pipeline/types";
import type { ReplicateWebhookPayload } from "@worker/lib/workflows/batchPipelineClient";

/**
 * 페르소나 **후처리** 단계 — 원래 `api/image/process/persona`.
 *
 * 결과를 내려받아 `person_image` 슬롯에 저장하고 DB에 기록한다.
 * 이후 파이프라인(assignSpecs → prompt → base)은 **실사 업로드와 완전히 동일**하게 흐른다.
 * 과금 원장에는 기록하지 않는다 (저장 확정물이 아니라 입력 자산).
 */
export async function handlePersonaResult(input: {
    batchId: string;
    brief?: string | null;
    payload: ReplicateWebhookPayload;
}): Promise<{ stored: boolean }> {
    const { batchId, payload } = input;

    if (!payload || typeof payload.id !== "string" || typeof payload.status !== "string") {
        throw new StepError("STEP_INTERNAL_ERROR", "Invalid replicatePayload: missing id or status.");
    }
    if (payload.status !== "succeeded") {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            payload.error ?? `Replicate status ${payload.status}`,
        );
    }

    const outputUrl = adImageServerAPI.extractFirstOutputUrl(payload.output);
    if (!outputUrl || typeof outputUrl !== "string") {
        throw new StepError("STEP_INTERNAL_ERROR", "No output URL found in replicate payload.");
    }

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError("BATCH_NOT_FOUND", `Batch not found: ${batchId}`);
    }

    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            `Failed to download persona image: ${imageResponse.status} ${imageResponse.statusText}`,
        );
    }

    const fileExtension = adImageServerAPI.inferFileExtension(
        imageResponse.headers.get("content-type"),
        outputUrl,
    );
    const filePath = `${batch.user_id}/${batchId}/person_image.${fileExtension}`;
    const uploadContentType =
        fileExtension === "jpeg"
            ? "image/jpeg"
            : fileExtension === "png"
              ? "image/png"
              : fileExtension === "webp"
                ? "image/webp"
                : `image/${fileExtension}`;

    try {
        await adImageServerAPI.uploadObject(
            filePath,
            Buffer.from(await imageResponse.arrayBuffer()),
            uploadContentType,
        );
    } catch (uploadError) {
        throw new StepError(
            "STEP_INTERNAL_ERROR",
            `Persona upload failed (${filePath}): ${uploadError instanceof Error ? uploadError.message : "unknown"}`,
        );
    }

    // person_image 슬롯 점유 — brief는 note로 보관 (LLM grounding용)
    await adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, {
        person_image: {
            imageFileExtension: fileExtension,
            ...(input.brief ? { note: input.brief } : {}),
        },
    });

    return { stored: true };
}
