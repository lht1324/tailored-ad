import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPaddleClient } from "@/lib/paddleClient";

/**
 * Paddle 구독 해지 — DELETE /api/paddle/subscriptions/cancel?subscriptionId=
 * 기간 말 해지 (당장은 유지, 다음 사이클부터 갱신 없음).
 * 잔액제라 남은 잔액은 계속 사용 가능 (웹훅 canceled가 플랜 표시만 해제).
 * DB subscription_id와 대조해 본인 구독만 해지 가능.
 */
export async function DELETE(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const subscriptionId = request.nextUrl.searchParams.get('subscriptionId');
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only cancel your own subscription."
        });
    }
    if (!subscriptionId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "subscriptionId is required as a query parameter."
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
    if (user.subscription_id !== subscriptionId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "You do not have permission to cancel this subscription."
        });
    }

    try {
        const paddle = await getPaddleClient();
        await paddle.subscriptions.cancel(subscriptionId, {
            effectiveFrom: 'next_billing_period',
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Subscription canceled successfully. It will remain active until the end of the current billing period."
        });
    } catch (error) {
        console.error("Error in DELETE /api/paddle/subscriptions/cancel:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to cancel subscription."
        });
    }
}
