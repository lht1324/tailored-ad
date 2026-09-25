import { deleteFetch, getFetch, postFetch } from "@/lib/api/client/baseFetch";
import type { PaidPlan } from "@/lib/paddle";
import type { ProductData } from "@/lib/api/types/api/paddle/products/ProductData";
import type { OrderData } from "@/lib/api/types/api/paddle/orders/OrderData";
import type { SubscriptionData } from "@/lib/api/types/api/paddle/subscriptions/SubscriptionData";

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

    async getProducts(): Promise<ProductData[] | null> {
        try {
            const response = await getFetch(`/api/paddle/products`);
            const result = await response.json();
            if (!result.success || !result.data?.productList) {
                throw new Error(result.error ?? 'Failed to fetch products');
            }
            return result.data.productList as ProductData[];
        } catch (error) {
            console.error('Error fetching Paddle products:', error);
            return null;
        }
    },

    async getOrders(email: string): Promise<OrderData[] | null> {
        try {
            const response = await getFetch(`/api/paddle/orders?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            if (!result.success || !result.data?.orderList) {
                throw new Error(result.error ?? 'Failed to fetch orders');
            }
            return result.data.orderList as OrderData[];
        } catch (error) {
            console.error('Error fetching Paddle orders:', error);
            return null;
        }
    },

    async getSubscription(email: string): Promise<SubscriptionData | null> {
        try {
            const response = await getFetch(`/api/paddle/subscriptions?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to fetch subscription');
            }
            return (result.data?.subscriptionData ?? null) as SubscriptionData | null;
        } catch (error) {
            console.error('Error fetching Paddle subscription:', error);
            return null;
        }
    },

    async changePlan(newPlan: PaidPlan): Promise<boolean> {
        try {
            const response = await postFetch(`/api/paddle/subscriptions/change`, { newPlan });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to change plan');
            }
            return true;
        } catch (error) {
            console.error('Error changing Paddle subscription plan:', error);
            return false;
        }
    },

    async cancelSubscription(subscriptionId: string): Promise<boolean> {
        try {
            const response = await deleteFetch(`/api/paddle/subscriptions/cancel?subscriptionId=${encodeURIComponent(subscriptionId)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to cancel subscription');
            }
            return true;
        } catch (error) {
            console.error('Error canceling Paddle subscription:', error);
            return false;
        }
    },

    async revertScheduled(what: 'plan-change' | 'cancellation'): Promise<boolean> {
        try {
            const response = await postFetch(`/api/paddle/subscriptions/revert`, { what });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to revert');
            }
            return true;
        } catch (error) {
            console.error('Error reverting Paddle scheduled change:', error);
            return false;
        }
    },
};
