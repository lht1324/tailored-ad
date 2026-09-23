import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getPolarClient } from "@/lib/polarClient";
import type { SubscriptionData } from "@/lib/api/types/api/polar/subscriptions/SubscriptionData";

/**
 * Polar 활성 구독 조회 — GET /api/polar/subscriptions?email=
 * C2S 진입은 client-gateway 경유 (gateway가 userId 주입, 본인 확인용).
 * 이메일로 고객을 찾아 최신 활성 구독 1건 반환. 없으면 subscriptionData: null (정상).
 * 필요 스코프: customers:read, subscriptions:read
 */
export async function GET(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "email is required and must be a string."
        });
    }

    try {
        const polar = await getPolarClient();

        const customerResult = await polar.customers.list({
            email: email,
            limit: 1,
        });
        if (!customerResult.result || customerResult.result.items.length === 0) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { subscriptionData: null },
                message: "No customer found with the provided email."
            });
        }

        const customerId = customerResult.result.items[0].id;
        const subscriptionsResult = await polar.subscriptions.list({
            customerId: customerId,
            active: true,
        });

        const sorted = subscriptionsResult.result.items.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        if (sorted.length === 0) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { subscriptionData: null },
                message: "No active subscription found."
            });
        }

        const subscription = sorted[0];
        const subscriptionData: SubscriptionData = {
            id: subscription.id,
            status: subscription.status,
            productId: subscription.product.id,
            productName: subscription.product.name,
            productDescription: subscription.product.description ?? undefined,
            amount: subscription.amount,
            currency: subscription.currency,
            billingCycle: subscription.recurringInterval,
            billingInterval: subscription.recurringIntervalCount,
            currentPeriodStart: subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt?.toISOString(),
            createdAt: subscription.createdAt.toISOString(),
        };

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { subscriptionData },
            message: "Successfully fetched subscription."
        });
    } catch (error) {
        console.error("Error in GET /api/polar/subscriptions:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch subscription from Polar."
        });
    }
}
