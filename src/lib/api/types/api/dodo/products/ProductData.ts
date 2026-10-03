/**
 * Dodo 제품 데이터 — 클라이언트 친화 매핑.
 * planId는 product ID → plan 역매핑 (서버가 부여).
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
