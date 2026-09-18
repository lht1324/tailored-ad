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
 * ad 이미지 생성 모델 — Black Forest Labs FLUX.2 Dev 단일.
 * {owner}/{name} 식별자로 최신 버전이 실행된다. 모델 교체는 이 상수 + buildFluxInput만 바꾸면 된다.
 */
const FLUX_IMAGE_MODEL = "black-forest-labs/flux-2-dev";

/**
 * FLUX.2 Dev 입력 조립 (실측 스키마 확인됨).
 * aspect 값("4:5" 등)과 웹훅·output 파싱은 공용 (collectOutputUrls가 형태 흡수).
 */
function buildFluxInput(
    prompt: string,
    imageUrls: string[],
    aspectRatio?: string,
    seed?: number,
): Record<string, unknown> {
    const input: Record<string, unknown> = {
        prompt,
        disable_safety_checker: true,
        // regular variant ($0.014/MP) — go_fast($0.012)는 최적화 경로라 최종 품질 우선으로 고정
        go_fast: false,
        // PNG 고정 — 원본 위에 글자를 얹으므로 JPEG 링잉 누적 방지 (표시용은 WebP 별도 변환)
        output_format: "png",
    };
    if (imageUrls.length > 0) input.input_images = imageUrls;
    const ratio = aspectRatio ? aspectRatio.replace('_', ':') : undefined;
    if (ratio) input.aspect_ratio = ratio;
    // 재현성 — spec.seed가 DB에 보관되므로 Regenerate 시 동일 결과 재현 가능
    if (seed !== undefined) input.seed = seed;
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
    /** 재현용 시드 — creativeSpec.seed (DB 보관됨) */
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

        const input = buildFluxInput(
            params.prompt,
            params.imageUrls,
            params.aspectRatio,
            params.seed,
        );

        await acquireReplicateSlot();

        let lastError: unknown = null;
        for (let attempt = 1; attempt <= MAX_SUBMIT_ATTEMPTS; attempt++) {
            try {
                const prediction = await replicate.predictions.create({
                    model: FLUX_IMAGE_MODEL,
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
