import Replicate, { WebhookEventType } from "replicate";
import { acquireReplicateSlot } from "@/lib/replicateRateLimit";

/**
 * Replicate 클라이언트 — ad 이미지 생성(prediction 제출) 전용 래퍼.
 *
 * - 제출은 비동기(async mode): prediction을 만들고 webhook_url만 지정한 뒤 즉시 반환한다.
 *   완료 신호는 webhook(completed 이벤트)으로 도착하며, 실패/취소도 completed에 포함된다.
 *   (replicate가 재시도를 하므로 웹훅 핸들러는 멱등해야 한다)
 * - 참조 이미지는 Supabase Storage signed URL(24h)로 전달한다.
 */

/**
 * ad 이미지 생성 모델 — Seedream 하이브리드 (ByteDance).
 * - 5.0 Lite (`bytedance/seedream-5-lite`, $0.035/장 고정): 기본. 4:5 미지원.
 * - 4.5 (`bytedance/seedream-4.5`, $0.04/장 고정): 배치에 4:5 포함 시 통째로.
 * 비율 단위 분기는 금지 — 같은 creative 내 모델 혼재 시 "같은 개념" 보장이 깨짐.
 * (FLUX.2 Dev에서 이전: MP 과금이라 base $0.04/ratio $0.06 실측 → 정액제로 교체)
 */
export const SEEDREAM_5_LITE = "bytedance/seedream-5-lite";
export const SEEDREAM_4_5 = "bytedance/seedream-4.5";

export type SeedreamModel = typeof SEEDREAM_5_LITE | typeof SEEDREAM_4_5;

/**
 * 배치 단위 모델 판정 — aspect_ratios에 4_5가 하나라도 있으면 배치 전체 4.5.
 * 호출마다 같은 답이 나오므로 base·ratios 어디서 호출해도 일관.
 */
export function selectImageModel(aspectRatios: string[]): SeedreamModel {
    return aspectRatios.includes("4_5") ? SEEDREAM_4_5 : SEEDREAM_5_LITE;
}

/**
 * Seedream 입력 조립 (4.5·5.0 공통 분모만 사용).
 * - seed: 양쪽 스키마 미지원이라 input에 넣지 않음. params 배선만 유지 중 (PoC 확정 후 제거).
 * - output_format=png는 5.0에만 (4.5 스키마 없음 → 오는 대로 받고 inferFileExtension이 흡수).
 * - disable_safety_checker=false는 4.5에만 (5.0 스키마 없음).
 */
function buildSeedreamInput(
    prompt: string,
    imageUrls: string[],
    aspectRatio?: string,
    model: SeedreamModel = SEEDREAM_5_LITE,
): Record<string, unknown> {
    const input: Record<string, unknown> = {
        prompt,
        size: "2K",
        sequential_image_generation: "disabled",
        max_images: 1,
    };
    if (imageUrls.length > 0) input.image_input = imageUrls;
    const ratio = aspectRatio ? aspectRatio.replace('_', ':') : undefined;
    if (ratio) input.aspect_ratio = ratio;
    if (model === SEEDREAM_4_5) {
        input.disable_safety_checker = false;
    } else {
        input.output_format = "png";
    }
    return input;
}

/** prediction 완료(성공·실패·취소 전부) 때만 웹훅을 받는다 */
const WEBHOOK_EVENTS_FILTER: WebhookEventType[] = ["completed"];

function createReplicateInstance(): Replicate {
    const apiToken = process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
        throw new Error("REPLICATE_API_TOKEN is not configured.");
    }

    return new Replicate({
        auth: apiToken,
    });
}

export interface AdImageEditPredictionParams {
    /** I2I 지시문 — creative의 캡션(imagePromptRecord) */
    prompt: string;
    /** 참조 이미지 URL 목록 — [원본 상품/인물] 또는 [기준 이미지 + 원본] */
    imageUrls: string[];
    /** 출력 비율 ('9_16' → '9:16' 형태로 변환해서 전달) */
    aspectRatio?: string;
    /** 배치 단위 판정 모델 (selectImageModel) — 미지정 시 5.0 Lite */
    model?: SeedreamModel;
    /** 재현용 시드 — 스키마 미지원이라 현재 미전송, 배선만 유지 (PoC 확정 후 제거) */
    seed?: number;
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
        const replicate = createReplicateInstance();

        const input = buildSeedreamInput(
            params.prompt,
            params.imageUrls,
            params.aspectRatio,
            params.model,
        );

        await acquireReplicateSlot();

        let lastError: unknown = null;
        for (let attempt = 1; attempt <= MAX_SUBMIT_ATTEMPTS; attempt++) {
            try {
                const prediction = await replicate.predictions.create({
                    model: params.model ?? SEEDREAM_5_LITE,
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
        const replicate = createReplicateInstance();

        const prediction = await replicate.predictions.get(predictionId);

        return {
            predictionId: prediction.id,
            status: prediction.status,
            outputUrls: collectOutputUrls(prediction.output),
            error: typeof prediction.error === 'string' ? prediction.error : null,
        };
    },
};
