import type { AdGenerationBatch } from "@shared/types/supabase/ad/AdGenerationBatch";

/**
 * 생성 요청 프롬프트 래퍼 — 참조 이미지의 역할과 '쓰임'을 문장 앞에서 고정한다.
 *
 * 왜 필요한가: Replicate에는 캡션 + 이미지 배열만 간다. 배열 순서를 글로 지목하지
 * 않으면 모델은 두 참조를 '별개 물체'로 취급하고, 상품 사진의 화면 점유율을 그대로
 * 옮겨 사람 옆에 거대한 제품을 놓는다. 그래서 역할(1번=상품, 2번=인물)과
 * 접지·실물 크기를 캡션 앞에서 한 번 더 못 박는다.
 *
 * base 생성과 비율 재시도가 같은 문구를 쓰도록 한 곳에 둔다.
 */
export function buildCaptionWrapper(batch: AdGenerationBatch, caption: string): string {
    const refLines: string[] = [];
    let refIndex = 1;
    if (batch.product_image) {
        refLines.push(`image ${refIndex++} is the product — keep its shape, color, material and markings.`);
    }
    if (batch.person_image) {
        refLines.push(`image ${refIndex++} is the person — keep the face and build.`);
    }

    const headerParts: string[] = [];
    if (refLines.length > 0) {
        headerParts.push(
            `REFERENCE IMAGES: ${refLines.join(' ')} Use them ONLY for identity. Do not copy their background, floor, shadows or wall — recreate them with clean edges on the new scene below.`,
        );
    }
    if (batch.person_image) {
        headerParts.push(
            "STAGING: A person is attached, so the product is worn, held, or in use by that person at real-world scale. It must touch them and cast a contact shadow. Never render it as a separate object placed beside them, and never carry over the reference photo's frame coverage.",
        );
    }

    return `${headerParts.join('\n\n')}\n\nSCENE: ${caption}`;
}
