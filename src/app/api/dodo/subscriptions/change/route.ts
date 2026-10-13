import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getDodoClient } from "@/lib/dodoClient";
import { getDodoProductId, getPlanByDodoProduct, PLAN_IMAGE_LIMIT, type DodoPaidPlan } from "@/lib/dodo";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Dodo 플랜 변경 — POST /api/dodo/subscriptions/change
 * body는 {newPlan}만 받는다. product 매핑은 서버 상수(getDodoProductId)가 진실원천.
 *
 * 업그레이드: 즉시 적용 + 차액 즉시 청구 (prorated_immediately).
 *   잔액 차액 부여는 웹훅(subscription.updated)이 담당 — 여기서 직접 찍지 않는다 (멱등).
 * 다운그레이드: 다음 사이클 적용 예약 (effective_at next_billing_date) + 목표 플랜을
 *   users.downgrade_target_plan_id에 저장.
 */
const VALID_PLANS: DodoPaidPlan[] = [
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

    if (!VALID_PLANS.includes(newPlan as DodoPaidPlan)) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: `Unsupported plan: ${newPlan}`
        });
    }

    let newProductId: string;
    try {
        newProductId = getDodoProductId(newPlan as DodoPaidPlan);
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
        const dodo = await getDodoClient();
        const subscription = await dodo.subscriptions.retrieve(user.subscription_id) as unknown as {
            cancel_at_next_billing_date?: boolean; product_id?: string;
        };

        // 취소 예약된 구독은 플랜 변경 불가 — 먼저 예약을 풀어야 함
        if (subscription.cancel_at_next_billing_date) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Subscription is scheduled to cancel. Reactivate it before changing plans.",
            });
        }

        const currentProductId = subscription.product_id ?? '';
        // 판정 잣대는 DB(현재 과금 진실)
        const dbPlan = (Object.values(SubscriptionPlan) as string[]).includes(user.plan ?? '')
            && user.plan !== SubscriptionPlan.NONE
            ? (user.plan as DodoPaidPlan)
            : null;
        const baselinePlan = dbPlan ?? (currentProductId ? getPlanByDodoProduct(currentProductId) : null);
        if (!baselinePlan) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Current plan unknown. Refresh and try again.",
            });
        }
        if (newPlan === baselinePlan) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Already on this plan.",
            });
        }
        if (currentProductId === newProductId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Already scheduled to this plan.",
            });
        }

        // 업/다운 판정은 월 부여 장수 순서 (PLAN_1 < PLAN_2 < PLAN_3), DB 기준
        const isUpgrade = PLAN_IMAGE_LIMIT[newPlan as DodoPaidPlan] > PLAN_IMAGE_LIMIT[baselinePlan];

        if (isUpgrade) {
            await dodo.subscriptions.changePlan(user.subscription_id, {
                product_id: newProductId,
                proration_billing_mode: 'prorated_immediately',
                quantity: 1,
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

        await dodo.subscriptions.changePlan(user.subscription_id, {
            product_id: newProductId,
            proration_billing_mode: 'prorated_immediately',
            effective_at: 'next_billing_date',
            quantity: 1,
        });
        const subAfter = await dodo.subscriptions.retrieve(user.subscription_id) as unknown as {
            next_billing_date?: string;
        };
        await usersServerAPI.patchUserByUserId(userId, {
            downgrade_target_plan_id: newPlan as DodoPaidPlan,
            scheduled_downgrade_at: subAfter.next_billing_date ?? undefined,
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Downgrade scheduled successfully. It will be applied at the start of the next billing cycle.",
        });
    } catch (error) {
        console.error("Error in POST /api/dodo/subscriptions/change:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to change subscription plan."
        });
    }
}
