import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

export type DodoPaidPlan = Exclude<SubscriptionPlan, SubscriptionPlan.NONE>;

/**
 * Dodo 상품 매핑 — 진실원천은 코드.
 * product ID는 비밀값이 아니라서 .env가 아닌 여기에 박는다 (PC 이동 시 git으로 따라옴).
 */

/** 플랜 → Dodo product ID (test — 2026-10-03 생성) */
export const DODO_PRODUCT_BY_PLAN: Record<DodoPaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "pdt_0Nosm2WcXVkbgV28ndUWo", // Starter $19
    [SubscriptionPlan.PLAN_2]: "pdt_0Nosm2aXoSAV82rXZPcdo", // Growth $49
    [SubscriptionPlan.PLAN_3]: "pdt_0Nosm2d0QRwiOjT9Cp3mb", // Pro $99
    [SubscriptionPlan.PLAN_4]: "",
};

/** 플랜 → Dodo product ID (live — 카탈로그 생성 후 기입) */
export const DODO_PRODUCT_BY_PLAN_LIVE: Record<DodoPaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "",
    [SubscriptionPlan.PLAN_2]: "",
    [SubscriptionPlan.PLAN_3]: "",
    [SubscriptionPlan.PLAN_4]: "",
};

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

/** Dodo 환경 — NEXT_PUBLIC 한 개로 통일 (클라·서버 공용). 조용히 기본값 추론 금지 */
export function getDodoEnv(): 'test_mode' | 'live_mode' {
    const raw = process.env.NEXT_PUBLIC_DODO_ENV;
    if (raw === 'live') return 'live_mode';
    if (raw === 'test') return 'test_mode';
    throw new Error("NEXT_PUBLIC_DODO_ENV is not set (expected 'test' or 'live').");
}

function activeProductMap(): Record<DodoPaidPlan, string> {
    return getDodoEnv() === 'live_mode' ? DODO_PRODUCT_BY_PLAN_LIVE : DODO_PRODUCT_BY_PLAN;
}

/** 환경에 맞는 product ID (미기입이면 throw — 400으로 변환) */
export function getDodoProductId(plan: DodoPaidPlan): string {
    const id = activeProductMap()[plan];
    if (!id) {
        throw new Error(`Dodo product ID is not configured (plan=${plan}, env=${getDodoEnv()}).`);
    }
    return id;
}

/** product ID → 플랜 (미등록이면 null) */
export function getPlanByDodoProduct(productId: string): DodoPaidPlan | null {
    const found = (Object.entries(activeProductMap()) as [DodoPaidPlan, string][]).find(
        ([, id]) => id !== "" && id === productId,
    );
    return found?.[0] ?? null;
}
