/** Paddle 주문 1건 — 결제내역 표시용 최소 필드 */
export interface OrderData {
    productName: string;
    totalAmount: number; // cents
    currency: string;
    status: string;
    createdAt: string; // ISO
    /** purchase=정액 결제, upgrade=업그레이드 차액 (proration lines 존재) */
    kind: 'purchase' | 'upgrade';
}
