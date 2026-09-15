import { postFetch } from "@/lib/api/client/baseFetch";
import type { PaidPlan } from "@/lib/polar";

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
};
