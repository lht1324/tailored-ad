import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPolarClient } from "@/lib/polarClient";
import { getPolarProductId, PLAN_IMAGE_LIMIT, type PaidPlan } from "@/lib/polar";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Polar 플랜 변경 — POST /api/polar/subscriptions/change
 * body는 {newPlan}만 받는다. 상품 매핑은 서버 상수(getPolarProductId)가 진실원천.
 *
 * 업그레이드: 즉시 적용 + 차액 즉시 청구 (prorationBehavior invoice).
 *   잔액 차액 부여는 웹훅(subscription.updated)이 담당 — 여기서 직접 찍지 않는다 (멱등).
 * 다운그레이드: 다음 사이클 적용 예약 (prorationBehavior next_period). cron 불필요.
 * 필요 스코프: subscriptions:read, subscriptions:write
 */
const VALID_PLANS: PaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

export async function POST(request: NextRequest) {
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
            error: "Forbidden. You can only change your own subscription."
        });
    }

    let newPlan: string;
    try {
        ({ newPlan } = await request.json());
    } catch {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid request body.",
        });
    }

    if (!VALID_PLANS.includes(newPlan as PaidPlan)) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: `Unsupported plan: ${newPlan}`,
        });
    }

    let newProductId: string;
    try {
        newProductId = getPolarProductId(newPlan as PaidPlan);
    } catch (err) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: err instanceof Error ? err.message : `No product mapped for plan: ${newPlan}`,
        });
    }

    const user = await usersServerAPI.getUserByUserId(userId);
    if (!user) {
        return getNextBaseResponse({
            success: false,
            status: 404,
            error: "User not found.",
        });
    }
    if (!user.subscription_id) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "No active subscription. Subscribe via checkout first.",
        });
    }

    try {
        const polar = await getPolarClient();
        const subscription = await polar.subscriptions.get({
            id: user.subscription_id,
        });

        // 취소 예약된 구독은 플랜 변경 불가 — 먼저 예약을 풀어야 함
        if (subscription.cancelAtPeriodEnd) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Subscription is scheduled to cancel. Reactivate it before changing plans.",
            });
        }

        if (subscription.productId === newProductId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Already on this plan.",
            });
        }

        // 업/다운 판정은 월 부여 장수 순서 (PLAN_1 < PLAN_2 < PLAN_3)
        const planOrder = (plan: PaidPlan): number => PLAN_IMAGE_LIMIT[plan];
        const isUpgrade = planOrder(newPlan as PaidPlan) > planOrder(
            planFromProduct(subscription.productId) ?? SubscriptionPlan.PLAN_1,
        );

        if (isUpgrade) {
            await polar.subscriptions.update({
                id: subscription.id,
                subscriptionUpdate: {
                    productId: newProductId,
                    prorationBehavior: "invoice",
                },
            });
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Subscription upgraded successfully. The difference was charged immediately.",
            });
        }

        await polar.subscriptions.update({
            id: subscription.id,
            subscriptionUpdate: {
                productId: newProductId,
                prorationBehavior: "next_period",
            },
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Downgrade scheduled successfully. It will be applied at the start of the next billing cycle.",
        });
    } catch (error) {
        console.error("Error in POST /api/polar/subscriptions/change:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to change subscription plan."
        });
    }
}

/** Polar product ID → 플랜 (환경별 매핑 역조회. 미등록이면 null) */
function planFromProduct(productId: string): PaidPlan | null {
    const found = (Object.keys(PLAN_IMAGE_LIMIT) as PaidPlan[]).find((plan) => {
        try {
            return getPolarProductId(plan) === productId;
        } catch {
            return false;
        }
    });
    return found ?? null;
}
