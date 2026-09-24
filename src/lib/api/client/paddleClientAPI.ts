import { postFetch } from "@/lib/api/client/baseFetch";
import type { PaidPlan } from "@/lib/paddle";

export const paddleClientAPI = {
    /** 서버 생성 트랜잭션 (오버레이 표시용 ID) */
    async createTransaction(plan: PaidPlan): Promise<string | null> {
        try {
            const response = await postFetch(`/api/paddle/checkouts`, { plan });
            const result = await response.json();
            if (!result.success || !result.data?.transactionId) {
                throw new Error(result.error ?? 'Failed to create transaction');
            }
            return result.data.transactionId as string;
        } catch (error) {
            console.error('Error creating Paddle transaction:', error);
            return null;
        }
    },
};
