import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Paddle 상품 매핑 — 진실원천은 코드.
 * price ID는 비밀값이 아니라서 .env가 아닌 여기에 박는다 (PC 이동 시 git으로 따라옴).
 * Paddle 대시보드 custom_data(plan/imageLimit)와 일치해야 함.
 */

export type PaidPlan = Exclude<SubscriptionPlan, SubscriptionPlan.NONE>;

/** 플랜 → Paddle price ID (프로덕션 — 상품 생성 후 기입) */
export const PADDLE_PRICE_BY_PLAN: Record<PaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "",
    [SubscriptionPlan.PLAN_2]: "",
    [SubscriptionPlan.PLAN_3]: "",
    [SubscriptionPlan.PLAN_4]: "", // 미사용 (예약)
};

/** 샌드박스 price ID (dev 테스트용, 2026-09-24 생성) */
export const PADDLE_SANDBOX_PRICE_BY_PLAN: Record<PaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "pri_01m398qxs8085ht083q6ns326k", // Starter $19
    [SubscriptionPlan.PLAN_2]: "pri_01m398qy9z318dw92xdc7xx1ke", // Growth $49
    [SubscriptionPlan.PLAN_3]: "pri_01m398qytz14gev4d3j48yxgv3", // Pro $99
    [SubscriptionPlan.PLAN_4]: "",
};

/** Paddle 환경 — Next가 자동 설정 (dev=sandbox, build/start=production) */
export function getPaddleEnvironment(): 'production' | 'sandbox' {
    return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}

/** 플랜 → 월 요금 USD (표시·할인 계산용. 실제 청구는 Paddle price 기준) */
export const PLAN_PRICE_USD: Record<PaidPlan, number> = {
    [SubscriptionPlan.PLAN_1]: 19,
    [SubscriptionPlan.PLAN_2]: 49,
    [SubscriptionPlan.PLAN_3]: 99,
    [SubscriptionPlan.PLAN_4]: 0,
};

/** 플랜 → 월 부여 장수 (Paddle custom_data imageLimit과 동일) */
export const PLAN_IMAGE_LIMIT: Record<PaidPlan, number> = {
    [SubscriptionPlan.PLAN_1]: 100,
    [SubscriptionPlan.PLAN_2]: 500,
    [SubscriptionPlan.PLAN_3]: 1000,
    [SubscriptionPlan.PLAN_4]: 0,
};

/** 플랜 → 바깥 노출 표시명 (헤더 등. plan-4 미사용이라 원값 폴백) */
export const PLAN_DISPLAY_NAME: Record<string, string> = {
    [SubscriptionPlan.NONE]: "Free plan",
    [SubscriptionPlan.PLAN_1]: "Starter",
    [SubscriptionPlan.PLAN_2]: "Growth",
    [SubscriptionPlan.PLAN_3]: "Pro",
};

function activePriceMap(): Record<PaidPlan, string> {
    return getPaddleEnvironment() === 'production' ? PADDLE_PRICE_BY_PLAN : PADDLE_SANDBOX_PRICE_BY_PLAN;
}

/** 환경에 맞는 price ID (미기입이면 throw — 400으로 변환) */
export function getPaddlePriceId(plan: PaidPlan): string {
    const id = activePriceMap()[plan];
    if (!id) {
        throw new Error(`Paddle price ID is not configured (plan=${plan}, env=${getPaddleEnvironment()}).`);
    }
    return id;
}

/** 환경에 맞는 price ID → 플랜 (미등록이면 null) */
export function getPlanByPaddlePrice(priceId: string): PaidPlan | null {
    const found = (Object.entries(activePriceMap()) as [PaidPlan, string][]).find(
        ([, id]) => id !== "" && id === priceId,
    );
    return found?.[0] ?? null;
}
