import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

export type DodoPaidPlan = Exclude<SubscriptionPlan, SubscriptionPlan.NONE>;

/** 플랜 → 월 부여 장수 (과금 정책 단일 진실) */
export const PLAN_IMAGE_LIMIT: Record<DodoPaidPlan, number> = {
    [SubscriptionPlan.PLAN_1]: 100,
    [SubscriptionPlan.PLAN_2]: 500,
    [SubscriptionPlan.PLAN_3]: 1000,
    [SubscriptionPlan.PLAN_4]: 0,
};

/** 플랜 → USD 정가 (표시·첫달가 계산용) */
export const PLAN_PRICE_USD: Record<DodoPaidPlan, number> = {
    [SubscriptionPlan.PLAN_1]: 19,
    [SubscriptionPlan.PLAN_2]: 49,
    [SubscriptionPlan.PLAN_3]: 99,
    [SubscriptionPlan.PLAN_4]: 0,
};

/** 플랜 표시명 (바깥 노출이라 영어 유지) */
export const PLAN_DISPLAY_NAME: Record<string, string> = {
    [SubscriptionPlan.NONE]: "Free plan",
    [SubscriptionPlan.PLAN_1]: "Starter",
    [SubscriptionPlan.PLAN_2]: "Growth",
    [SubscriptionPlan.PLAN_3]: "Pro",
};

/** 첫주문 할인 코드 (Starter 한정·1주기·신규고객 — 대시보드 설정과 일치해야 함) */
export const DODO_FIRST_ORDER_DISCOUNT_CODE = "FIRSTORDER50";
