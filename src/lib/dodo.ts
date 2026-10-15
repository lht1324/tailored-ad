import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";
import { getServerEnv } from "@/lib/serverEnv";

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

/** 플랜 → Dodo product ID (live — 10-13 카탈로그 실측 기입) */
export const DODO_PRODUCT_BY_PLAN_LIVE: Record<DodoPaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "pdt_0NpF9VQjYvFLc5jA9DFin", // Starter $19
    [SubscriptionPlan.PLAN_2]: "pdt_0NpF9VKMSYntkd0OciAJb", // Growth $49
    [SubscriptionPlan.PLAN_3]: "pdt_0NpF9VDKXhtpkIC6RHyfU", // Pro $99
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

/** Dodo 환경 — NEXT_PUBLIC 한 개로 통일 (클라·서버 공용). 조용히 기본값 추론 금지.
 *  주의: Workers에서 process.env는 빌드타임 값이라 prod 판정에 쓰면 안 됨.
 *  서버는 resolveDodoEnv() (런타임 우선)를 쓸 것. */
export function getDodoEnv(): 'test_mode' | 'live_mode' {
    const raw = process.env.NEXT_PUBLIC_DODO_ENV;
    if (raw === 'live') return 'live_mode';
    if (raw === 'test') return 'test_mode';
    throw new Error("NEXT_PUBLIC_DODO_ENV is not set (expected 'test' or 'live').");
}

/** 서버용 env 판정 — 런타임(대시보드/wrangler vars) 우선, 빌드타임 폴백 */
export async function resolveDodoEnv(): Promise<'test_mode' | 'live_mode'> {
    const raw = await getServerEnv('NEXT_PUBLIC_DODO_ENV');
    if (raw === 'live') return 'live_mode';
    if (raw === 'test') return 'test_mode';
    throw new Error("NEXT_PUBLIC_DODO_ENV is not set (expected 'test' or 'live').");
}

function activeProductMap(env: 'test_mode' | 'live_mode'): Record<DodoPaidPlan, string> {
    return env === 'live_mode' ? DODO_PRODUCT_BY_PLAN_LIVE : DODO_PRODUCT_BY_PLAN;
}

/** 환경에 맞는 product ID (미기입이면 throw — 400으로 변환) */
export async function getDodoProductId(plan: DodoPaidPlan): Promise<string> {
    const id = activeProductMap(await resolveDodoEnv())[plan];
    if (!id) {
        throw new Error(`Dodo product ID is not configured (plan=${plan}).`);
    }
    return id;
}

/** product ID → 플랜 (미등록이면 null) — test·live 양쪽 맵 조회 (환경 무관) */
export function getPlanByDodoProduct(productId: string): DodoPaidPlan | null {
    const all = [DODO_PRODUCT_BY_PLAN, DODO_PRODUCT_BY_PLAN_LIVE] as const;
    for (const map of all) {
        const found = (Object.entries(map) as [DodoPaidPlan, string][]).find(
            ([, id]) => id !== "" && id === productId,
        );
        if (found) return found[0];
    }
    return null;
}
