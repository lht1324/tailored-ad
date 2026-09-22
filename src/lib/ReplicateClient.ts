import Replicate, { WebhookEventType } from "replicate";
import { acquireReplicateSlot } from "@/lib/replicateRateLimit";
import { getServerEnv } from "@/lib/serverEnv";
import {
    buildReplicateImageInput,
    resolveImageInputTags,
    ReplicateModelId,
    type ImageInputTag,
} from "@/lib/replicateInputMapper";

/**
 * Replicate 클라이언트 — ad 이미지 생성(prediction 제출) 전용 래퍼.
 *
 * - 제출은 비동기(async mode): prediction을 만들고 webhook_url만 지정한 뒤 즉시 반환한다.
 *   완료 신호는 webhook(completed 이벤트)으로 도착하며, 실패/취소도 completed에 포함된다.
 *   (replicate가 재시도를 하므로 웹훅 핸들러는 멱등해야 한다)
 * - 참조 이미지는 Supabase Storage signed URL(24h)로 전달한다.
 */

/**
 * 모델 식별·입력 조립·태그 치환은 replicateInputMapper가 전담.
 * 이 파일은 제출(비동기 prediction + 웹훅 + 레이트리밋)만 한다.
 */

/** prediction 완료(성공·실패·취소 전부) 때만 웹훅을 받는다 */
const WEBHOOK_EVENTS_FILTER: WebhookEventType[] = ["completed"];

async function createReplicateInstance(): Promise<Replicate> {
    const apiToken = await getServerEnv('REPLICATE_API_TOKEN');

    if (!apiToken) {
        throw new Error("REPLICATE_API_TOKEN is not configured.");
    }

    return new Replicate({
        auth: apiToken,
    });
}

export interface AdImageEditPredictionParams {
    /** I2I 지시문 — creative의 프롬프트(creativePrompt) */
    prompt: string;
    /** 참조 이미지 URL 목록 — [원본 상품/인물] 또는 [기준 이미지 + 원본] */
    imageUrls: string[];
    /** 출력 비율 ('9_16' → '9:16' 형태로 변환해서 전달) */
    aspectRatio?: string;
    /** 배치 단위 판정 모델 (selectImageModel) — 미지정 시 5.0 Lite */
    model?: ReplicateModelId;
    /** image_input 배열의 태그 순서 — 캡션 내 태그 치환용. 미지정 시 치환 생략. */
    imageTags?: ImageInputTag[];
    /** 완료 웹훅 URL — batch_id·creative_index 등 식별자를 query로 붙여서 전달 */
    webhookUrl: string;
}

export interface ReplicatePredictionSubmission {
    predictionId: string;
    status: string;
}

export interface ReplicatePredictionResult {
    predictionId: string;
    status: string;
    outputUrls: string[];
    error: string | null;
}

/**
 * prediction.output 정규화 — 모델/버전에 따라 문자열·문자열 배열·FileOutput 등이 올 수 있어
 * URL 문자열 배열로 통일한다.
 */
function collectOutputUrls(output: unknown): string[] {
    if (!output) {
        return [];
    }

    if (typeof output === 'string') {
        return [output];
    }

    if (Array.isArray(output)) {
        return output.filter((item): item is string => typeof item === 'string');
    }

    // FileOutput 형태 (useFileOutput 활성 시) 대비 — url 속성 추출
    if (typeof output === 'object' && 'url' in output && typeof (output as { url: unknown }).url === 'string') {
        return [(output as { url: string }).url];
    }

    return [];
}

/** 429 판별 — SDK 버전별 에러 형태 차이 대비 */
function isRateLimitError(error: unknown): boolean {
    const direct = (error as { status?: unknown })?.status;
    if (direct === 429) return true;
    const nested = (error as { response?: { status?: unknown } })?.response?.status;
    return nested === 429;
}

/** 서버가 준 Retry-After(초) 존중, 상한 10초 (waitUntil 30초 천장과 겹치지 않게) */
function getRetryDelayMs(error: unknown, fallbackMs: number): number {
    const CAP_MS = 10_000;
    try {
        const headers = (error as { response?: { headers?: unknown } })?.response?.headers;
        let raw: string | null = null;
        if (headers && typeof (headers as Headers).get === "function") {
            raw = (headers as Headers).get("retry-after");
        } else if (headers && typeof headers === "object") {
            const record = headers as Record<string, unknown>;
            const value = record["retry-after"] ?? record["Retry-After"];
            if (typeof value === "string") raw = value;
        }
        const seconds = raw != null ? Number.parseInt(raw, 10) : Number.NaN;
        if (!Number.isNaN(seconds) && seconds > 0) return Math.min(seconds * 1000, CAP_MS);
    } catch {
        /* header parse 실패 → fallback */
    }
    return fallbackMs;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_SUBMIT_ATTEMPTS = 3; // 최초 1회 + 429 재시도 2회

export const replicateClient = {
    /**
     * I2I 편집 prediction 제출 — 생성을 기다리지 않고 즉시 반환한다.
     * 완료는 webhookUrl로 도착한다.
     *
     * 제출 전 Upstash 스로틀 슬롯을 확보하고(429 사전 방지),
     * 그래도 429를 맞으면 Retry-After를 존중해 최대 2회 재시도한다.
     */
    async postAdImageEditPrediction(params: AdImageEditPredictionParams): Promise<ReplicatePredictionSubmission> {
        const replicate = await createReplicateInstance();

        const resolvedPrompt = params.imageTags
            ? resolveImageInputTags(params.prompt, params.imageTags)
            : params.prompt;
        const model = params.model ?? ReplicateModelId.SEEDREAM_5_LITE;
        const input = buildReplicateImageInput(model, {
            prompt: resolvedPrompt,
            imageUrls: params.imageUrls,
            aspectRatio: params.aspectRatio,
        });

        await acquireReplicateSlot();

        let lastError: unknown = null;
        for (let attempt = 1; attempt <= MAX_SUBMIT_ATTEMPTS; attempt++) {
            try {
                const prediction = await replicate.predictions.create({
                    model: model,
                    input: input,
                    webhook: params.webhookUrl,
                    webhook_events_filter: WEBHOOK_EVENTS_FILTER,
                });

                return {
                    predictionId: prediction.id,
                    status: prediction.status,
                };
            } catch (error) {
                lastError = error;
                if (!isRateLimitError(error) || attempt === MAX_SUBMIT_ATTEMPTS) throw error;
                const waitMs = getRetryDelayMs(error, attempt === 1 ? 5000 : 10000);
                console.warn(`[replicate] 429 throttled, retrying submit in ${waitMs}ms (attempt ${attempt + 1}/${MAX_SUBMIT_ATTEMPTS})`);
                await sleep(waitMs);
            }
        }
        throw lastError;
    },

    /**
     * prediction 단건 조회 — 웹훅 유실 대비 수동 폴링/디버깅 용도.
     */
    async getAdImageEditPrediction(predictionId: string): Promise<ReplicatePredictionResult> {
        const replicate = await createReplicateInstance();

        const prediction = await replicate.predictions.get(predictionId);

        return {
            predictionId: prediction.id,
            status: prediction.status,
            outputUrls: collectOutputUrls(prediction.output),
            error: typeof prediction.error === 'string' ? prediction.error : null,
        };
    },
};
