import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { getPolarClient } from "@/lib/polarClient";
import { getPolarEnvironment, getPolarProductId, type PaidPlan } from "@/lib/polar";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

const VALID_PLANS: PaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

// dev(ngrok 경유 결제) → 결제한 브라우저 세션이 있는 로컬 클라로 복귀.
// prod → 실도메인. origin이 갈리면 세션이 안 보여서 분기 필수.
const isProd = process.env.NODE_ENV === "production";
const SUCCESS_URL = isProd
    ? `${process.env.BASE_URL}/checkout/success`
    : "http://localhost:3000/checkout/success";

/**
 * Polar 체크아웃 세션 생성 — POST /api/polar/checkouts
 * C2S 진입은 client-gateway 경유 (gateway가 세션 검증 + userId 주입).
 * body는 {plan}만 받는다. 상품 ID 매핑은 환경별 서버 상수(getPolarProductId)가 진실원천.
 * 유저 매핑은 externalCustomerId + metadata.userId 이중 기록 (웹훅 매칭용).
 */
export async function POST(request: NextRequest) {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!getIsValidRequestS2S(request)) {
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
    let productId: string;
    try {
        productId = getPolarProductId(plan as PaidPlan);
    } catch (err) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: err instanceof Error ? err.message : `No product mapped for plan: ${plan}`,
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
        // 첫 유료 한정 자동 할인 — Starter 플랜만, 유료 이력 있으면 정가. ID는 env (없으면 정가로 진행)
        const firstOrderDiscountId = process.env.POLAR_FIRST_ORDER_DISCOUNT_ID;
        let discountId: string | undefined;
        if (firstOrderDiscountId && plan === SubscriptionPlan.PLAN_1) {
            try {
                if (!(await usageServerAPI.hasPaidGrant(userId))) {
                    discountId = firstOrderDiscountId;
                }
            } catch (discountError) {
                console.error(`[polar/checkouts] discount eligibility failed (user=${userId}) — full price:`, discountError);
            }
        }
        const checkout = await getPolarClient().checkouts.create({
            products: [productId],
            externalCustomerId: userId,
            customerEmail: user.email,
            customerMetadata: { userId },
            metadata: { userId },
            successUrl: SUCCESS_URL,
            allowTrial: false,
            ...(discountId ? { discountId } : {}),
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                checkoutUrl: checkout.url,
            },
            message: "Checkout session created.",
        });
    } catch (error) {
        console.error(`[polar/checkouts] create failed (user=${userId}, plan=${plan}, env=${getPolarEnvironment()}):`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create checkout session",
        });
    }
}
