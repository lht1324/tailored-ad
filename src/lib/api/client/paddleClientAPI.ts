import { postFetch } from "@/lib/api/client/baseFetch";
import type { PaidPlan } from "@/lib/paddle";

export const paddleClientAPI = {
    /** 서버 생성 트랜잭션 (오버레이 표시용 ID + 서버 판정 첫달가) */
    async createTransaction(plan: PaidPlan): Promise<{ transactionId: string; discountApplied: boolean; firstCharge: number } | null> {
        try {
            const response = await postFetch(`/api/paddle/checkouts`, { plan });
            const result = await response.json();
            if (!result.success || !result.data?.transactionId) {
                throw new Error(result.error ?? 'Failed to create transaction');
            }
            return {
                transactionId: result.data.transactionId as string,
                discountApplied: Boolean(result.data.discountApplied),
                firstCharge: Number(result.data.firstCharge),
            };
        } catch (error) {
            console.error('Error creating Paddle transaction:', error);
            return null;
        }
    },
};
