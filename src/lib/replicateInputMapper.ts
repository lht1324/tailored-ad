/**
 * Replicate 입력 매퍼 — 모델별 input 조립 전담 (1:1 switch-case).
 * ReplicateClient(제출 전담)는 이 매퍼를 호출만 한다. 새 모델 추가 = enum + case 1개.
 * 모델 따라 조건문으로 필드 끼워넣기 금지 — 각 case가 해당 모델 스키마 통째로 반환한다.
 */

/**
 * ad 이미지 생성 모델 — Seedream 하이브리드 (ByteDance).
 * - 5.0 Lite (`bytedance/seedream-5-lite`, $0.035/장 고정): 기본. 4:5 미지원.
 * - 4.5 (`bytedance/seedream-4.5`, $0.04/장 고정): 배치에 4:5 포함 시 통째로.
 * 비율 단위 분기는 금지 — 같은 creative 내 모델 혼재 시 "같은 개념" 보장이 깨짐.
 */
export enum ReplicateModelId {
    SEEDREAM_5_LITE = "bytedance/seedream-5-lite",
    SEEDREAM_4_5 = "bytedance/seedream-4.5",
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
 * 배치 단위 모델 판정 — aspect_ratios에 4_5가 하나라도 있으면 배치 전체 4.5.
 * 호출마다 같은 답이 나오므로 base·ratios 어디서 호출해도 일관.
 */
export function selectImageModel(aspectRatios: string[]): ReplicateModelId {
    return aspectRatios.includes("4_5") ? ReplicateModelId.SEEDREAM_4_5 : ReplicateModelId.SEEDREAM_5_LITE;
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
        case ReplicateModelId.SEEDREAM_5_LITE:
            return {
                prompt,
                size: "2K",
                sequential_image_generation: "disabled",
                max_images: 1,
                ...(imageUrls.length > 0 && { image_input: imageUrls }),
                ...(ratio && { aspect_ratio: ratio }),
                output_format: "png",
            };

        case ReplicateModelId.SEEDREAM_4_5:
            return {
                prompt,
                size: "2K",
                sequential_image_generation: "disabled",
                max_images: 1,
                ...(imageUrls.length > 0 && { image_input: imageUrls }),
                ...(ratio && { aspect_ratio: ratio }),
                disable_safety_checker: false,
            };

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
