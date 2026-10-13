import { NextRequest } from "next/server";
import { getServerEnv } from "@/lib/serverEnv";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getDodoClient } from "@/lib/dodoClient";
import { getDodoProductId, DODO_FIRST_ORDER_DISCOUNT_CODE, type DodoPaidPlan } from "@/lib/dodo";
import { PLAN_PRICE_USD } from "@/lib/dodo";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

const VALID_PLANS: DodoPaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

/**
 * Dodo 체크아웃 세션 생성 — POST /api/dodo/checkouts
 * C2S 진입은 client-gateway 경유 (gateway가 세션 검증 + userId 주입).
 * body는 {plan}만 받는다. product 매핑은 서버 상수(getDodoProductId)가 진실원천.
 * 오버레이는 이 세션의 checkout_url을 표시만 한다 — 생성 주체는 서버.
 * 유저 매핑은 metadata {userId, plan} (웹훅 매칭용, 웹훅에서 금액-플랜 교차검증).
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
    let theme: string | undefined;
    try {
        ({ plan, theme } = await request.json());
    } catch {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid request body."
        });
    }

    if (!VALID_PLANS.includes(plan as DodoPaidPlan)) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: `Unsupported plan: ${plan}`
        });
    }
    let productId: string;
    try {
        productId = getDodoProductId(plan as DodoPaidPlan);
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
        const dodo = await getDodoClient();
        // return_url은 브라우저 귀환용이라 출발지 Origin 우선 (ngrok이 아닌 localhost로 복귀).
        // dev 웹훅 수신용 BASE_URL(ngrok)은 폴백. prod는 Origin=실도메인이라 동일 결과.
        const baseUrl = await getServerEnv('BASE_URL');
        const origin = request.headers.get('origin');
        const clientOrigin = origin && /^https?:\/\//.test(origin) ? origin : baseUrl;
        // 첫 유료 한정 자동 할인 — Starter 플랜만, 유료 이력 있으면 정가.
        let discountCode: string | undefined;
        let firstCharge: number | null = null;
        if (plan === SubscriptionPlan.PLAN_1) {
            try {
                if (!(await usageServerAPI.hasPaidGrant(userId))) {
                    discountCode = DODO_FIRST_ORDER_DISCOUNT_CODE;
                    firstCharge = PLAN_PRICE_USD[plan as DodoPaidPlan] / 2;
                }
            } catch (discountError) {
                console.error(`[dodo/checkouts] discount eligibility failed (user=${userId}) — full price:`, discountError);
            }
        }
        const session = await dodo.checkoutSessions.create({
            product_cart: [{ product_id: productId, quantity: 1 }],
            customer: { email: user.email, name: user.name ?? undefined },
            metadata: { userId, plan },
            return_url: `${clientOrigin}/checkout/success`,
            // USD 고정 — Adaptive Currency 토글과 무관 (대시보드 설정 무시).
            billing_currency: 'USD',
            // 앱 테마와 맞춤 (미지정 시 비즈니스 기본값). 클라가 .theme-light 유무로 판정.
            // theme은 customization 안에 넣어야 적용됨 (최상위 무시됨).
            ...(theme === 'light' || theme === 'dark' ? { customization: { theme } } : {}),
            ...(discountCode ? { discount_codes: [discountCode] } : {}),
        });
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                checkoutUrl: session.checkout_url,
                sessionId: session.session_id,
                discountApplied: discountCode != null,
                firstCharge,
            },
            message: "Dodo checkout session created.",
        });
    } catch (error) {
        console.error(`[dodo/checkouts] create failed (user=${userId}, plan=${plan}):`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create Dodo checkout session",
        });
    }
}
