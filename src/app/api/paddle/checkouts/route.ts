import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPaddleClient, getPaddleEnvironment } from "@/lib/paddleClient";
import { getPaddlePriceId, type PaidPlan } from "@/lib/paddle";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

const VALID_PLANS: PaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

/**
 * Paddle 트랜잭션 생성 — POST /api/paddle/checkouts
 * C2S 진입은 client-gateway 경유 (gateway가 세션 검증 + userId 주입).
 * body는 {plan}만 받는다. price 매핑은 환경별 서버 상수(getPaddlePriceId)가 진실원천.
 * 오버레이는 이 트랜잭션을 표시만 한다 (transactionId 오픈) — 생성 주체는 서버.
 * 유저 매핑은 custom_data {userId, plan} (웹훅 매칭용, 웹훅에서 금액-플랜 교차검증).
 */
export async function POST(request: NextRequest) {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId."
        });
    }

    let plan: string;
    try {
        ({ plan } = await request.json());
    } catch {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid request body.",
        });
    }

    if (!VALID_PLANS.includes(plan as PaidPlan)) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: `Unsupported plan: ${plan}`,
        });
    }
    let priceId: string;
    try {
        priceId = getPaddlePriceId(plan as PaidPlan);
    } catch (err) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: err instanceof Error ? err.message : `No price mapped for plan: ${plan}`,
        });
    }

    const user = await usersServerAPI.getUserByUserId(userId);
    if (!user) {
        return getNextBaseResponse({
            success: false,
            status: 404,
            error: "User not found",
        });
    }

    try {
        const paddle = await getPaddleClient();
        const transaction = await paddle.transactions.create({
            items: [{ priceId, quantity: 1 }],
            customer: { email: user.email },
            customData: { userId, plan },
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                transactionId: transaction.id,
            },
            message: "Paddle transaction created.",
        });
    } catch (error) {
        console.error(`[paddle/checkouts] create failed (user=${userId}, plan=${plan}, env=${await getPaddleEnvironment().catch(() => 'unknown')}):`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create Paddle transaction",
        });
    }
}
