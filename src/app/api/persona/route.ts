import { getServerEnv } from "@/lib/serverEnv";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { llmServerAPI } from "@/lib/api/server/ad/llmServerAPI";
import { replicateClient } from "@/lib/ReplicateClient";
import { selectImageModel } from "@/lib/replicateInputMapper";

/**
 * 페르소나 생성 단계 — 인물 포함 배치당 1회 호출 (POST /api/image 분기).
 * LLM 묘사 1콜 → Seedream T2I 제출 → 웹훅(webhook/replicate/persona)으로 완료 수신.
 * 결과물은 person_image 슬롯에 저장돼 하류(specs·prompt·base)가 실사 업로드와
 * 동일하게 취급한다. 제출·생성 실패는 배치 failed (얼굴 없이 진행 불가, fail-fast).
 */

/** 배치 단위 결정적 seed — 저장 컬럼 없이 batchId에서 파생 */
function derivePersonaSeed(batchId: string): number {
    let hash = 0;
    for (let i = 0; i < batchId.length; i++) {
        hash = (hash * 31 + batchId.charCodeAt(i)) >>> 0;
    }
    return hash;
}

/** T2I 고정 가드 — 가상 인물 선언 + 정면 초상 규격 (태그 금지: _IMAGE 단어 없음) */
function buildPersonaImagePrompt(description: string): string {
    return `${description} Fully fictional person, no real likeness. Front-facing studio portrait, head and shoulders, neutral background, square 1:1 canvas.`;
}

export async function POST(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const batchId = request.nextUrl.searchParams.get('batchId');

    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: batchId"
        });
    }

    let personaBrief: string | null = null;
    try {
        const body = await request.json().catch(() => ({})) as { personaBrief?: unknown };
        if (typeof body.personaBrief === 'string' && body.personaBrief.trim().length > 0) {
            personaBrief = body.personaBrief;
        }
    } catch {
        /* bodyなし → briefなし扱い */
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

        // 이중 발화 방어 — persona는 specs 이전 1회만
        if (batch.status !== 'queued') {
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Batch already started. Skipping duplicate persona request."
            });
        }

        // 1) LLM 묘사 1콜 (brief 반영, 없으면 seed 창작)
        const seed = derivePersonaSeed(batchId);
        const llmResult = await llmServerAPI.postPersonaDescription({
            brief: personaBrief,
            productNote: batch.product_image?.note ?? null,
            seed,
        });

        if (!llmResult.success || !llmResult.description) {
            throw new Error(llmResult.error?.message ?? "Persona description failed");
        }

        // 2) Seedream T2I 제출 (참조 이미지 없음 — image_input 생략)
        const baseUrl = await getServerEnv('BASE_URL');

        if (!baseUrl) {
            throw new Error("BASE_URL is not configured.");
        }

        const webhookUrl = `${baseUrl}/webhook/replicate/persona?batchId=${encodeURIComponent(batchId)}${personaBrief ? `&brief=${encodeURIComponent(personaBrief)}` : ""}`;

        await replicateClient.postAdImageEditPrediction({
            prompt: buildPersonaImagePrompt(llmResult.description),
            imageUrls: [],
            aspectRatio: '1_1',
            model: selectImageModel(batch.aspect_ratios as string[]),
            imageTags: [],
            webhookUrl,
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Persona generation submitted.",
        });
    } catch (error) {
        console.error(`Error in POST /api/persona (batch=${batchId}):`, error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to submit persona generation"
        });
    }
}
