import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Polar 상품 매핑 — 진실원천은 코드.
 * product ID는 비밀값이 아니라서 .env가 아닌 여기에 박는다 (PC 이동 시 git으로 따라옴).
 * Polar 대시보드 metadata(planId/imageLimit/isPopular)와 일치해야 함.
 */

export type PaidPlan = Exclude<SubscriptionPlan, SubscriptionPlan.NONE>;

/** 플랜 → Polar product ID */
export const POLAR_PRODUCT_BY_PLAN: Record<PaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "66953e34-6773-488a-8478-958233a10f31", // Starter
    [SubscriptionPlan.PLAN_2]: "6d55ba76-70dc-4ba7-bf28-9e3ff9bcb799", // Growth
    [SubscriptionPlan.PLAN_3]: "b8d38860-fab7-4abe-830a-c1bd183c5a71", // Pro
    [SubscriptionPlan.PLAN_4]: "", // 미사용 (예약)
};

/** Polar product ID → 플랜 (웹훅 매칭용) */
export const PLAN_BY_POLAR_PRODUCT: Record<string, PaidPlan> = Object.fromEntries(
    Object.entries(POLAR_PRODUCT_BY_PLAN).filter(([, productId]) => productId !== ""),
) as Record<string, PaidPlan>;

/** 플랜 → 월 부여 장수 (Polar metadata imageLimit과 동일) */
export const PLAN_IMAGE_LIMIT: Record<PaidPlan, number> = {
    [SubscriptionPlan.PLAN_1]: 100,
    [SubscriptionPlan.PLAN_2]: 500,
    [SubscriptionPlan.PLAN_3]: 1000,
    [SubscriptionPlan.PLAN_4]: 0,
};
