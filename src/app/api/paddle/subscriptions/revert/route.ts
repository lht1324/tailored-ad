import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPaddleClient } from "@/lib/paddleClient";
import { getPaddlePriceId, PLAN_IMAGE_LIMIT, type PaidPlan } from "@/lib/paddle";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Paddle 예약 되돌리기 — POST /api/paddle/subscriptions/revert
 * body {what}: 'plan-change' (다음 사이클 적용 예약 취소) |
 *             'cancellation' (기간 말 해지 철회, 갱신 재개).
 * Paddle scheduled_change는 update({scheduledChange: null})로 제거한다.
 * 되돌리기는 과금 없음 — 웹훅 updated가 와도 잔액 변동 없음 (차액 0 → 스킵).
 */
type RevertTarget = 'plan-change' | 'cancellation';

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
            error: "Forbidden. You can only revert your own subscription."
        });
    }

    let what: string;
    try {
        ({ what } = await request.json());
    } catch {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid request body.",
        });
    }

    if (what !== 'plan-change' && what !== 'cancellation') {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: `Unsupported revert target: ${what}`,
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
            error: "No active subscription.",
        });
    }

    try {
        const paddle = await getPaddleClient();
        const subscription = await paddle.subscriptions.get(user.subscription_id);
        const scheduled = subscription.scheduledChange as unknown as { action?: string } | null;

        if ((what as RevertTarget) === 'plan-change') {
            // 다운그레이드 예약은 scheduled_change를 만들지 않고 items만 교체한다 (실측).
            // 되돌리기 = 현재 DB 플랜 가격으로 items를 되돌려 다음 사이클 과금을 원복.
            const dbPlan = user.plan as PaidPlan | null;
            if (!dbPlan || !(Object.values(SubscriptionPlan) as string[]).includes(dbPlan)
                || !(PLAN_IMAGE_LIMIT[dbPlan] > 0)) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "No scheduled plan change to revert.",
                });
            }
            let restorePriceId: string;
            try {
                restorePriceId = getPaddlePriceId(dbPlan);
            } catch {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "No scheduled plan change to revert.",
                });
            }
            await paddle.subscriptions.update(user.subscription_id, {
                items: [{ priceId: restorePriceId, quantity: 1 }],
                prorationBillingMode: 'prorated_next_billing_period',
                customData: { userId, plan: dbPlan },
            });
            await usersServerAPI.patchUserByUserId(userId, {
                downgrade_target_plan_id: null,
                scheduled_downgrade_at: null,
            }).catch(() => {});
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Scheduled plan change reverted. Your current plan stays.",
            });
        }

        if (scheduled?.action !== 'cancel') {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Subscription is not scheduled to cancel.",
            });
        }
        await paddle.subscriptions.update(user.subscription_id, {
            scheduledChange: null,
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Cancellation reverted. Your subscription will renew normally.",
        });
    } catch (error) {
        console.error("Error in POST /api/paddle/subscriptions/revert:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to revert."
        });
    }
}
