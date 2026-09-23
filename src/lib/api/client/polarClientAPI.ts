import { deleteFetch, getFetch, postFetch } from "@/lib/api/client/baseFetch";
import type { PaidPlan } from "@/lib/polar";
import type { ProductData } from "@/lib/api/types/api/polar/products/ProductData";
import type { OrderData } from "@/lib/api/types/api/polar/orders/OrderData";
import type { SubscriptionData } from "@/lib/api/types/api/polar/subscriptions/SubscriptionData";

export const polarClientAPI = {
    async createCheckout(plan: PaidPlan): Promise<string | null> {
        try {
            const response = await postFetch(`/api/polar/checkouts`, { plan });
            const result = await response.json();
            if (!result.success || !result.data?.checkoutUrl) {
                throw new Error(result.error ?? 'Checkout creation failed');
            }
            return result.data.checkoutUrl as string;
        } catch (error) {
            console.error('Error creating Polar checkout:', error);
            return null;
        }
    },

    async getProducts(): Promise<ProductData[] | null> {
        try {
            const response = await getFetch(`/api/polar/products`);
            const result = await response.json();
            if (!result.success || !result.data?.productList) {
                throw new Error(result.error ?? 'Failed to fetch products');
            }
            return result.data.productList as ProductData[];
        } catch (error) {
            console.error('Error fetching Polar products:', error);
            return null;
        }
    },

    async getOrders(email: string): Promise<OrderData[] | null> {
        try {
            const response = await getFetch(`/api/polar/orders?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            if (!result.success || !result.data?.orderList) {
                throw new Error(result.error ?? 'Failed to fetch orders');
            }
            return result.data.orderList as OrderData[];
        } catch (error) {
            console.error('Error fetching Polar orders:', error);
            return null;
        }
    },

    async getSubscription(email: string): Promise<SubscriptionData | null> {
        try {
            const response = await getFetch(`/api/polar/subscriptions?email=${encodeURIComponent(email)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to fetch subscription');
            }
            return (result.data?.subscriptionData ?? null) as SubscriptionData | null;
        } catch (error) {
            console.error('Error fetching Polar subscription:', error);
            return null;
        }
    },

    async changePlan(newPlan: PaidPlan): Promise<boolean> {
        try {
            const response = await postFetch(`/api/polar/subscriptions/change`, { newPlan });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to change plan');
            }
            return true;
        } catch (error) {
            console.error('Error changing Polar subscription plan:', error);
            return false;
        }
    },

    async cancelSubscription(subscriptionId: string): Promise<boolean> {        try {
            const response = await deleteFetch(`/api/polar/subscriptions/cancel?subscriptionId=${encodeURIComponent(subscriptionId)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to cancel subscription');
            }
            return true;
        } catch (error) {
            console.error('Error canceling Polar subscription:', error);
            return false;
        }
    },

    async revertScheduled(what: 'plan-change' | 'cancellation'): Promise<boolean> {
        try {
            const response = await postFetch(`/api/polar/subscriptions/revert`, { what });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error ?? 'Failed to revert');
            }
            return true;
        } catch (error) {
            console.error('Error reverting Polar scheduled change:', error);
            return false;
        }
    },
};
