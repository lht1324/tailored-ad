import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";
import { PLAN_IMAGE_LIMIT } from "@/lib/paddle";

/**
 * Fungies 상품 매핑 — 진실원천은 코드.
 * offer/element ID는 비밀값이 아니라서 .env가 아닌 여기에 박는다 (PC 이동 시 git으로 따라옴).
 * Paddle price ID와 달리 Fungies는 offer UUID + element UUID 2종을 쓴다.
 * 체크아웃은 element URL을 fungies.js 오버레이로 표시, 적립은 웹훅만 (Paddle과 동일 원칙).
 */

export type FungiesPaidPlan = Exclude<SubscriptionPlan, SubscriptionPlan.NONE>;

/** 플랜 → Fungies offer ID (stage — production 전환 시 교체) */
export const FUNGIES_OFFER_BY_PLAN: Record<FungiesPaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "da014edc-445d-4e2d-b192-1e3468d48513", // Starter ₩19000/mo
    [SubscriptionPlan.PLAN_2]: "bb1fd0bf-41d6-43bb-80ca-e940e0722e08", // Growth ₩69000/mo
    [SubscriptionPlan.PLAN_3]: "1dd18ae2-9c8b-4e63-9cbe-c1120e1a098c", // Pro ₩139000/mo
    [SubscriptionPlan.PLAN_4]: "", // 미사용 (예약)
};

/** 플랜 → 체크아웃 element ID (stage — 오퍼 1개씩 바인딩) */
export const FUNGIES_ELEMENT_BY_PLAN: Record<FungiesPaidPlan, string> = {
    [SubscriptionPlan.PLAN_1]: "524098e3-5a12-4c4c-aa76-44f9253d40fb",
    [SubscriptionPlan.PLAN_2]: "e3ffb74b-31e7-4f67-8490-d8eaabc7eb88",
    [SubscriptionPlan.PLAN_3]: "f8f8f1a3-d50b-410d-8f25-073a86017498",
    [SubscriptionPlan.PLAN_4]: "",
};

/** 체크아웃 element 베이스 (stage — production 전환 시 교체) */
export const FUNGIES_CHECKOUT_BASE_URL = "https://tailoredad-test.stage.fungies.net/checkout-element";

/** 플랜 → 체크아웃 element URL */
export function getFungiesCheckoutUrl(plan: FungiesPaidPlan): string {
    const id = FUNGIES_ELEMENT_BY_PLAN[plan];
    if (!id) {
        throw new Error(`Fungies element ID is not configured (plan=${plan}).`);
    }
    return `${FUNGIES_CHECKOUT_BASE_URL}/${id}`;
}

/** offer ID → 플랜 (미등록이면 null) */
export function getPlanByFungiesOffer(offerId: string): FungiesPaidPlan | null {
    const found = (Object.entries(FUNGIES_OFFER_BY_PLAN) as [FungiesPaidPlan, string][]).find(
        ([, id]) => id !== "" && id === offerId,
    );
    return found?.[0] ?? null;
}

/** 결제 금액(최소 단위) → 플랜 (stage KRW 근사치 — 웹훅 교차검증용) */
const STAGE_AMOUNT_BY_PLAN: Record<FungiesPaidPlan, number> = {
    [SubscriptionPlan.PLAN_1]: 19000,
    [SubscriptionPlan.PLAN_2]: 69000,
    [SubscriptionPlan.PLAN_3]: 139000,
    [SubscriptionPlan.PLAN_4]: 0,
};

export function getPlanByFungiesAmount(amount: number): FungiesPaidPlan | null {
    const found = (Object.entries(STAGE_AMOUNT_BY_PLAN) as [FungiesPaidPlan, number][]).find(
        ([, value]) => value !== 0 && value === amount,
    );
    return found?.[0] ?? null;
}

/** 플랜 → 월 부여 장수 (Paddle과 동일 값 — 과금 정책 단일 진실) */
export const FUNGIES_IMAGE_LIMIT = PLAN_IMAGE_LIMIT;

/** 체크아웃 custom field명 — userId 전달용 (대시보드에 동일 이름으로 정의 필요) */
export const FUNGIES_CUSTOM_FIELD_USER_ID = "user_id";
