/** Polar 활성 구독 1건 — 프로필 구독 카드 표시용 최소 필드 */
export interface SubscriptionData {
    id: string;
    status: string;
    productId: string;
    productName: string;
    productDescription?: string;
    amount: number; // cents
    currency: string;
    billingCycle: string;
    billingInterval: number;
    currentPeriodStart: string; // ISO
    currentPeriodEnd?: string; // ISO
    cancelAtPeriodEnd: boolean;
    canceledAt?: string; // ISO
    createdAt: string; // ISO
}
