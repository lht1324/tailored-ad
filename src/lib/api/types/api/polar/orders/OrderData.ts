/** Polar 주문 1건 — 결제내역 표시용 최소 필드 */
export interface OrderData {
    productName: string;
    totalAmount: number; // cents
    currency: string;
    status: string;
    createdAt: string; // ISO
}
