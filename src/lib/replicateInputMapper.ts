/**
 * Replicate 입력 매퍼 — 모델별 input 조립 전담 (1:1 switch-case).
 * ReplicateClient(제출 전담)는 이 매퍼를 호출만 한다. 새 모델 추가 = enum + case 1개.
 * 모델 따라 조건문으로 필드 끼워넣기 금지 — 각 case가 해당 모델 스키마 통째로 반환한다.
 */

/**
 * ad 이미지 생성 모델 — FLUX 3 Image 단일화 (Black Forest Labs).
 * - `black-forest-labs/flux-3-image`: 4:5 포함 전부 네이티브 → 하이브리드 분기 삭제.
 * - ratios는 BRIA outpainting 유지 (생성이 아니라 확장이라 정체성 보존).
 * - base·persona·base재시도는 selectImageModel 하나로 자동 전환.
 */
export enum ReplicateModelId {
    FLUX_3_IMAGE = "black-forest-labs/flux-3-image",
    BRIA_EXPAND = "bria/expand-image",
}

/** 캡션 내 의미 태그 — 전송 직전 image_input[n]으로 치환. GLM은 순서 몰라도 됨. */
export type ImageInputTag = "PRODUCT_IMAGE" | "PERSON_IMAGE" | "BASE_IMAGE";

const IMAGE_TAG_PATTERN = /\b(PRODUCT_IMAGE|PERSON_IMAGE|BASE_IMAGE)\b/g;
/** 알려진 태그 외 대문자 _IMAGE (오타·환각) 검출용 */
const UNKNOWN_TAG_PATTERN = /\b[A-Z][A-Z0-9]*_IMAGE\b/g;

/**
 * 의미 태그 → image_input[n] 치환. order는 호출 시점 image_input 배열의 태그 순서.
 * 모르는 태그(오타·환각)는 전송 전 throw — 엉뚱한 이미지 참조 방지.
 */
export function resolveImageInputTags(prompt: string, order: ImageInputTag[]): string {
    const indexOf = new Map<ImageInputTag, number>(order.map((tag, i) => [tag, i] as const));
    const resolved = prompt.replace(IMAGE_TAG_PATTERN, (tag) => {
        const idx = indexOf.get(tag as ImageInputTag);
        if (idx === undefined) {
            throw new Error(`Image tag not in this call's order: ${tag} (order: ${order.join(",")})`);
        }
        return `image_input[${idx}]`;
    });
    const unknown = resolved.match(UNKNOWN_TAG_PATTERN);
    if (unknown) {
        throw new Error(`Unknown image tags in caption: ${unknown.join(",")}`);
    }
    return resolved;
}

/**
 * 배치 단위 모델 판정 — FLUX 3 단일화라 항상 동일 답.
 * 시그니처 유지 (호출부 무수정).
 */
export function selectImageModel(aspectRatios: string[]): ReplicateModelId {
    void aspectRatios;
    return ReplicateModelId.FLUX_3_IMAGE;
}

export interface ReplicateImageInputParams {
    /** I2I 지시문 — 태그 치환된 최종 프롬프트 */
    prompt: string;
    /** 참조 이미지 URL 목록 */
    imageUrls: string[];
    /** 출력 비율 ('9_16' → '9:16' 형태로 변환해서 전달) */
    aspectRatio?: string;
}

/**
 * 모델별 input 조립 — seed는 양쪽 스키마 미지원이라 받지 않음.
 * 빈 input 제출되면 돈만 나가므로 unknown 모델은 throw (fail-fast).
 */
export function buildReplicateImageInput(
    model: ReplicateModelId,
    params: ReplicateImageInputParams,
): Record<string, unknown> {
    const { prompt, imageUrls, aspectRatio } = params;
    const ratio = aspectRatio ? aspectRatio.replace('_', ':') : undefined;

    switch (model) {
        case ReplicateModelId.FLUX_3_IMAGE: {
            // FLUX 3는 images 배열 + 서술형 프롬프트. image_input[n] 토큰은
            // "reference image n"으로 번역 (가정 — PoC에서 검증).
            const fluxPrompt = prompt.replace(/image_input\[(\d+)\]/g, (_, n) => `reference image ${Number(n) + 1}`);
            return {
                prompt: fluxPrompt,
                ...(imageUrls.length > 0 && { images: imageUrls }),
                ...(ratio && { aspect_ratio: ratio }),
                resolution: "2k",
                grounding: true,
                safety_tolerance: 4,
                output_format: "png",
            };
        }

        case ReplicateModelId.BRIA_EXPAND: {
            // 전문 outpainting — 원본 앵커 고정 + 주변만 확장. prompt는 확장 영역 지시만.
            // "no new objects"는 배경 연장까지 막을 수 있어 구체 금지 목록으로 대체.
            const imageUrl = imageUrls[0];
            if (!imageUrl) {
                throw new Error("BRIA_EXPAND requires exactly 1 base image URL.");
            }
            return {
                image_url: imageUrl,
                ...(ratio && { aspect_ratio: ratio }),
                prompt: "extend the existing background naturally to fill the canvas",
                negative_prompt: "no people, no hands, no text, no new products",
                preserve_alpha: false,
                content_moderation: false,
                sync: false,
            };
        }

        default:
            throw new Error(`Unknown Replicate model: ${model as string}`);
    }
}
