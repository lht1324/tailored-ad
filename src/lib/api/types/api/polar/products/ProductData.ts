/**
 * Polar 제품 데이터 — 클라이언트 친화 매핑.
 * Polar API 응답을 그대로 내리지 않고 필요한 필드만 내려준다.
 * metadata(planId/isPopular)는 대시보드 입력값과 일치해야 함 (lib/polar.ts 참조).
 */
export interface ProductData {
    id: string;
    name: string;
    price: number; // cents
    currency: string;
    interval: "month" | "year";
    description: string;
    planId: string;
    isPopular: boolean;
}
