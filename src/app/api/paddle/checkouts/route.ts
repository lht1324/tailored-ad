import { NextRequest } from "next/server";
import { getServerEnv } from "@/lib/serverEnv";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { getPaddleClient, getPaddleEnvironment } from "@/lib/paddleClient";
import { getPaddlePriceId, PLAN_PRICE_USD, type PaidPlan } from "@/lib/paddle";
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
        priceId = await getPaddlePriceId(plan as PaidPlan);
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
        // 첫 유료 한정 자동 할인 — Starter 플랜만, 유료 이력 있으면 정가. ID는 env (없으면 정가로 진행)
        const firstOrderDiscountId = await getServerEnv('PADDLE_FIRST_ORDER_DISCOUNT_ID');
        let discountId: string | undefined;
        if (firstOrderDiscountId && plan === SubscriptionPlan.PLAN_1) {
            try {
                if (!(await usageServerAPI.hasPaidGrant(userId))) {
                    discountId = firstOrderDiscountId;
                }
            } catch (discountError) {
                console.error(`[paddle/checkouts] discount eligibility failed (user=${userId}) — full price:`, discountError);
            }
        }
        // 이메일→고객 확정 (없으면 생성) — 트랜잭션은 customerId 지정 (customer 객체 직접 지정 불가)
        let customerId: string | null = null;
        const existing = await paddle.customers.list({ search: user.email, perPage: 1 });
        for await (const c of existing) {
            if (c.email.toLowerCase() === user.email.toLowerCase()) {
                customerId = c.id;
                break;
            }
        }
        if (!customerId) {
            const created = await paddle.customers.create({ email: user.email, name: user.name });
            customerId = created.id;
        }
        const transaction = await paddle.transactions.create({
            customerId,
            items: [{ priceId, quantity: 1 }],
            customData: { userId, plan },
            ...(discountId ? { discountId } : {}),
            // successUrl 미지원 (SDK에 없음) — 풀페이지 복귀는 대시보드 기본 결제 링크로.
            // 오버레이 정상 동작 시 eventCallback이 /checkout/success로 보낸다.
        });
        // 모달 표시용 첫달가 — 서버 판정 그대로 (클라 추측 금지)
        const basePrice = PLAN_PRICE_USD[plan as PaidPlan];
        const firstCharge = discountId ? basePrice / 2 : basePrice;
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                transactionId: transaction.id,
                discountApplied: Boolean(discountId),
                firstCharge,
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
