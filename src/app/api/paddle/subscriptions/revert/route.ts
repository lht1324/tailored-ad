import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPaddleClient } from "@/lib/paddleClient";

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
            if (!scheduled) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "No scheduled change to revert.",
                });
            }
            await paddle.subscriptions.update(user.subscription_id, {
                scheduledChange: null,
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
