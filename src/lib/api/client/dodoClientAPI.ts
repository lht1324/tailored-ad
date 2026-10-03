import { deleteFetch, getFetch, postFetch } from "@/lib/api/client/baseFetch";
import type { DodoPaidPlan } from "@/lib/dodo";
import type { ProductData } from "@/lib/api/types/api/dodo/products/ProductData";
import type { OrderData } from "@/lib/api/types/api/dodo/orders/OrderData";
import type { SubscriptionData } from "@/lib/api/types/api/dodo/subscriptions/SubscriptionData";

export const dodoClientAPI = {
    /** 서버 생성 체크아웃 세션 (오버레이 표시용 URL + 서버 판정 첫달가) */
    async createCheckoutSession(plan: DodoPaidPlan, theme?: 'light' | 'dark'): Promise<{ checkoutUrl: string; sessionId: string; discountApplied: boolean; firstCharge: number | null } | null> {
        try {
            const response = await postFetch(`/api/dodo/checkouts`, { plan, ...(theme ? { theme } : {}) });
            const result = await response.json();
            if (!result.success || !result.data?.checkoutUrl) {
                throw new Error(result.error ?? 'Failed to create checkout session');
            }
            return {
                checkoutUrl: result.data.checkoutUrl as string,
                sessionId: result.data.sessionId as string,
                discountApplied: Boolean(result.data.discountApplied),
                firstCharge: typeof result.data.firstCharge === 'number' ? result.data.firstCharge : null,
            };
        } catch (error) {
            console.error('Error creating Dodo checkout session:', error);
            return null;
        }
    },

    async getProducts(): Promise<ProductData[] | null> {
        try {
            const response = await getFetch(`/api/dodo/products`);
            const result = await response.json();
            if (!result.success || !result.data?.productList) {
                throw new Error(result.error ?? 'Failed to fetch products');
            }
            return result.data.productList as ProductData[];
        } catch (error) {
            console.error('Error fetching Dodo products:', error);
            return null;
        }
    },

    async getOrders(email: string): Promise<OrderData[] | null> {
        try {
            const response = await getFetch(`/api/dodo/orders?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            if (!result.success || !result.data?.orderList) {
                throw new Error(result.error ?? 'Failed to fetch orders');
            }
            return result.data.orderList as OrderData[];
        } catch (error) {
            console.error('Error fetching Dodo orders:', error);
            return null;
        }
    },

    async getSubscription(email: string): Promise<SubscriptionData | null> {
        try {
            const response = await getFetch(`/api/dodo/subscriptions?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to fetch subscription');
            }
            return (result.data?.subscriptionData ?? null) as SubscriptionData | null;
        } catch (error) {
            console.error('Error fetching Dodo subscription:', error);
            return null;
        }
    },

    async changePlan(newPlan: DodoPaidPlan): Promise<boolean> {
        try {
            const response = await postFetch(`/api/dodo/subscriptions/change`, { newPlan });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to change plan');
            }
            return true;
        } catch (error) {
            console.error('Error changing Dodo subscription plan:', error);
            return false;
        }
    },

    async cancelSubscription(subscriptionId: string): Promise<boolean> {
        try {
            const response = await deleteFetch(`/api/dodo/subscriptions/cancel?subscriptionId=${encodeURIComponent(subscriptionId)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to cancel subscription');
            }
            return true;
        } catch (error) {
            console.error('Error canceling Dodo subscription:', error);
            return false;
        }
    },

    async revertScheduled(what: 'plan-change' | 'cancellation'): Promise<boolean> {
        try {
            const response = await postFetch(`/api/dodo/subscriptions/revert`, { what });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to revert');
            }
            return true;
        } catch (error) {
            console.error('Error reverting Dodo scheduled change:', error);
            return false;
        }
    },
};
