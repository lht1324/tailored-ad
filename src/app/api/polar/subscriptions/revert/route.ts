import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPolarClient } from "@/lib/polarClient";

/**
 * Polar 예약 되돌리기 — POST /api/polar/subscriptions/revert
 * body {what}: 'plan-change' (다음 사이클 적용 예약 취소) |
 *             'cancellation' (기간 말 해지 철회, 갱신 재개).
 * 되돌리기는 과금 없음 — 웹훅 updated가 와도 잔액 변동 없음 (차액 0 → 스킵).
 * 필요 스코프: subscriptions:read, subscriptions:write
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
        const polar = await getPolarClient();
        const subscription = await polar.subscriptions.get({
            id: user.subscription_id,
        });

        if ((what as RevertTarget) === 'plan-change') {
            if (!subscription.pendingUpdate?.productId) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "No scheduled plan change to revert.",
                });
            }
            await polar.subscriptions.update({
                id: subscription.id,
                subscriptionUpdate: {
                    pendingUpdate: null,
                },
            });
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Scheduled plan change reverted. Your current plan stays.",
            });
        }

        if (!subscription.cancelAtPeriodEnd) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Subscription is not scheduled to cancel.",
            });
        }
        await polar.subscriptions.update({
            id: subscription.id,
            subscriptionUpdate: {
                cancelAtPeriodEnd: false,
            },
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Cancellation reverted. Your subscription will renew normally.",
        });
    } catch (error) {
        console.error("Error in POST /api/polar/subscriptions/revert:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to revert."
        });
    }
}
