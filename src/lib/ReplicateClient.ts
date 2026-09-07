import Replicate, { WebhookEventType } from "replicate";

/**
 * Replicate 클라이언트 — ad 이미지 생성(prediction 제출) 전용 래퍼.
 *
 * - 제출은 비동기(async mode): prediction을 만들고 webhook_url만 지정한 뒤 즉시 반환한다.
 *   완료 신호는 webhook(completed 이벤트)으로 도착하며, 실패/취소도 completed에 포함된다.
 *   (replicate가 재시도를 하므로 웹훅 핸들러는 멱등해야 한다)
 * - 참조 이미지는 Supabase Storage signed URL(24h)로 전달한다.
 */

/**
 * ad 이미지 편집에 쓰는 모델 — google 공식 모델은 {owner}/{name} 식별자로 최신 버전이 실행된다.
 * 모델 교체는 이 enum이면 충분하도록 입력 조립을 여기서 캡슐화한다.
 */

export enum ReplicateImageModelId {
    /** Gemini 2.5 Flash Image — 원본. aspect_ratio 지원 */
    NANO_BANANA = "google/nano-banana",
    /** Gemini 3 Pro Image — SOTA. aspect_ratio·해상도(최대 4K) 지원 */
    NANO_BANANA_PRO = "google/nano-banana-pro",
    /** Gemini 3.1 Flash Image — 현재 올라운드 주력. aspect_ratio 지원 */
    NANO_BANANA_2 = "google/nano-banana-2",
    /** Gemini 3.1 Flash-Lite Image — 최저가·최저지연, 1K 출력 한정. aspect_ratio 지원 */
    NANO_BANANA_2_LITE = "google/nano-banana-2-lite",
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
    /** 사용 모델 — 미지정 시 원본 nano-banana */
    model?: ReplicateImageModelId;
    /** I2I 지시문 — creative의 캡션(imagePromptRecord) */
    prompt: string;
    /** 참조 이미지 URL 목록 — [원본 상품/인물] 또는 [기준 이미지 + 원본] */
    imageUrls: string[];
    /** 출력 비율 ('9_16' → '9:16' 형태로 변환해서 전달) */
    aspectRatio?: string;
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

export const replicateClient = {
    /**
     * I2I 편집 prediction 제출 — 생성을 기다리지 않고 즉시 반환한다.
     * 완료는 webhookUrl로 도착한다.
     */
    async postAdImageEditPrediction(params: AdImageEditPredictionParams): Promise<ReplicatePredictionSubmission> {
        const replicate = createReplicateInstance();

        const input: Record<string, unknown> = {
            prompt: params.prompt,
        };

        if (params.imageUrls.length > 0) {
            input.image_input = params.imageUrls;
        }

        if (params.aspectRatio) {
            input.aspect_ratio = params.aspectRatio.replace('_', ':');
        }

        const prediction = await replicate.predictions.create({
            model: params.model ?? ReplicateImageModelId.NANO_BANANA,
            input: input,
            webhook: params.webhookUrl,
            webhook_events_filter: WEBHOOK_EVENTS_FILTER,
        });

        return {
            predictionId: prediction.id,
            status: prediction.status,
        };
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
