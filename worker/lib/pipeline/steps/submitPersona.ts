import { adGenerationBatchServerAPI } from "@worker/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@worker/lib/api/server/ad/imageServerAPI";
import { llmServerAPI } from "@worker/lib/api/server/ad/llmServerAPI";
import { replicateClient } from "@worker/lib/ReplicateClient";
import { selectImageModel } from "@worker/lib/replicateInputMapper";
import { requireServerEnv } from "@worker/lib/serverEnv";
import { buildSignedWebhookUrl } from "@worker/lib/webhooks/signature";
import { StepError } from "@worker/lib/pipeline/types";

/**
 * 페르소나 생성 **제출** 단계 — 원래 `api/image/generation/persona`.
 *
 * 인물 사진을 올리지 않은 배치에서, 가상 모델을 한 명 생성한다 (배치당 1회).
 * LLM이 묘사(T2I 프롬프트)를 만들고 Seedream에 제출하면, 완료는 웹훅으로 돌아온다.
 * 결과는 `person_image` 슬롯에 저장돼 **실사 업로드와 완전히 동일하게** 취급된다.
 *
 * ⚠️ 이 단계는 **워크플로 첫머리**에서만 실행된다 (batch.status === 'queued' 일 때).
 * 중복 발화를 막기 위해 상태를 검사한다.
 */

export interface SubmitPersonaInput {
    batchId: string;
    /** 사용자가 입력한 묘사 (비어 있으면 LLM이 seed로 창작) */
    personaBrief?: string | null;
}

export interface SubmitPersonaOutput {
    submitted: boolean;
    /** 이미 시작된 배치라 건너뛴 경우 */
    skipped?: boolean;
}

/** 배치 단위 결정적 seed — 저장 컬럼 없이 batchId에서 파생 */
function derivePersonaSeed(batchId: string): number {
    let hash = 0;
    for (let i = 0; i < batchId.length; i++) {
        hash = (hash * 31 + batchId.charCodeAt(i)) >>> 0;
    }
    return hash;
}

export async function submitPersona(input: SubmitPersonaInput): Promise<SubmitPersonaOutput> {
    const { batchId } = input;
    const personaBrief =
        typeof input.personaBrief === "string" && input.personaBrief.trim().length > 0
            ? input.personaBrief
            : null;

    const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);
    if (!batch) {
        throw new StepError("BATCH_NOT_FOUND", `Batch not found: ${batchId}`);
    }

    // 이중 발화 방어 — persona는 specs 이전 1회만
    if (batch.status !== "queued") {
        return { submitted: false, skipped: true };
    }

    // 1) 제품 원본 (있을 때만) — person 슬롯은 아직 비어 있어 [0]이 product
    let productImageBase64: string | null = null;
    if (batch.product_image) {
        try {
            const originalUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);
            const url = originalUrls[0];
            if (url) {
                const response = await fetch(url);
                if (response.ok) {
                    productImageBase64 = Buffer.from(await response.arrayBuffer()).toString("base64");
                }
            }
        } catch (error) {
            console.warn(`[submitPersona] product image fetch failed (batch=${batchId}):`, error);
        }
    }

    // 2) LLM T2I 프롬프트 1콜
    const llmResult = await llmServerAPI.postAdPersonaImagePrompt({
        brief: personaBrief,
        productNote: batch.product_image?.note ?? null,
        seed: derivePersonaSeed(batchId),
        productImageBase64,
    });

    if (!llmResult.success || !llmResult.t2iPrompt) {
        throw new StepError("STEP_INTERNAL_ERROR", llmResult.error?.message ?? "Persona T2I prompt failed");
    }

    // 3) Seedream T2I 제출 (참조 이미지 없음)
    const baseUrl = await requireServerEnv("BASE_URL");
    const webhookUrl = await buildSignedWebhookUrl(baseUrl, "/api/webhook/replicate/persona", {
        batchId,
        ...(personaBrief ? { brief: personaBrief } : {}),
    });

    await replicateClient.postAdImageEditPrediction({
        prompt: llmResult.t2iPrompt,
        imageUrls: [],
        aspectRatio: "1_1",
        model: selectImageModel(batch.aspect_ratios as string[]),
        imageTags: [],
        webhookUrl,
    });

    return { submitted: true };
}
