import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPaddleClient } from "@/lib/paddleClient";
import { getPaddlePriceId, getPlanByPaddlePrice, PLAN_IMAGE_LIMIT, type PaidPlan } from "@/lib/paddle";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Paddle 플랜 변경 — POST /api/paddle/subscriptions/change
 * body는 {newPlan}만 받는다. price 매핑은 서버 상수(getPaddlePriceId)가 진실원천.
 *
 * 업그레이드: 즉시 적용 + 차액 즉시 청구 (prorated_immediately).
 *   잔액 차액 부여는 웹훅(subscription.updated)이 담당 — 여기서 직접 찍지 않는다 (멱등).
 * 다운그레이드: 다음 사이클 적용 예약 (prorated_next_billing_period) + 목표 플랜을
 *   users.downgrade_target_plan_id에 저장 (Paddle scheduled_change에 목표가 안 담김).
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

    let newPriceId: string;
    try {
        newPriceId = getPaddlePriceId(newPlan as PaidPlan);
    } catch (err) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: err instanceof Error ? err.message : `No price mapped for plan: ${newPlan}`,
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
        const paddle = await getPaddleClient();
        const subscription = await paddle.subscriptions.get(user.subscription_id);

        // 취소 예약된 구독은 플랜 변경 불가 — 먼저 예약을 풀어야 함
        const scheduled = subscription.scheduledChange as unknown as { action?: string } | null;
        if (scheduled?.action === 'cancel') {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Subscription is scheduled to cancel. Reactivate it before changing plans.",
            });
        }

        const currentPriceId = subscription.items?.find((i) => i.recurring !== false)?.price?.id
            ?? subscription.items?.[0]?.price?.id
            ?? '';
        if (currentPriceId === newPriceId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Already on this plan.",
            });
        }

        // 업/다운 판정은 월 부여 장수 순서 (PLAN_1 < PLAN_2 < PLAN_3)
        const currentPlan = currentPriceId ? getPlanByPaddlePrice(currentPriceId) : null;
        const currentLimit = currentPlan ? PLAN_IMAGE_LIMIT[currentPlan] : PLAN_IMAGE_LIMIT[SubscriptionPlan.PLAN_1];
        const isUpgrade = PLAN_IMAGE_LIMIT[newPlan as PaidPlan] > currentLimit;

        if (isUpgrade) {
            await paddle.subscriptions.update(user.subscription_id, {
                items: [{ priceId: newPriceId, quantity: 1 }],
                prorationBillingMode: 'prorated_immediately',
                // customData도 함께 갱신 — 원 transaction 값이 영구 잔류하므로 (대시보드·웹훅 교차검증용)
                customData: { userId, plan: newPlan },
            });
            // 예약 흔적 정리 (이전 다운그레이드 예약이 있었다면 무효)
            await usersServerAPI.patchUserByUserId(userId, {
                downgrade_target_plan_id: null,
                scheduled_downgrade_at: null,
            }).catch(() => {});
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Subscription upgraded successfully. The difference was charged immediately.",
            });
        }

        await paddle.subscriptions.update(user.subscription_id, {
            items: [{ priceId: newPriceId, quantity: 1 }],
            prorationBillingMode: 'prorated_next_billing_period',
            customData: { userId, plan: newPlan },
        });
        await usersServerAPI.patchUserByUserId(userId, {
            downgrade_target_plan_id: newPlan as PaidPlan,
            scheduled_downgrade_at: subscription.currentBillingPeriod?.endsAt ?? subscription.nextBilledAt ?? undefined,
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Downgrade scheduled successfully. It will be applied at the start of the next billing cycle.",
        });
    } catch (error) {
        console.error("Error in POST /api/paddle/subscriptions/change:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to change subscription plan."
        });
    }
}
