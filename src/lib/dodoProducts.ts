import { getDodoClient } from "@/lib/dodoClient";
import { PLAN_DISPLAY_NAME, PLAN_PRICE_USD, type DodoPaidPlan } from "@/lib/dodo";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Dodo 상품 해석 — 서버 전용. ID 하드코딩 없음.
 * 키가 고른 환경의 목록을 이름+가격으로 매칭한다 (test/live 분기 없음).
 * 규칙: 이름 `TailoredAd {Starter|Growth|Pro}` + 가격(USD×100, cents) 둘 다 일치.
 * 0건·복수면 loudly 실패 (오결제보다 중단).
 */

interface DodoProductLite {
    id: string;
    name: string;
    price: number; // cents
}

const MANAGED_PLANS: DodoPaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

let cached: { at: number; items: DodoProductLite[] } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function listProducts(): Promise<DodoProductLite[]> {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.items;
    }
    const dodo = await getDodoClient();
    const products = await dodo.products.list({ recurring: true });
    const items: DodoProductLite[] = [];
    for await (const product of products) {
        const p = product as unknown as {
            product_id?: string; id?: string; name?: string; price?: number;
        };
        const id = p.product_id ?? p.id ?? '';
        if (id) {
            items.push({ id, name: p.name ?? '', price: Number(p.price ?? 0) || 0 });
        }
    }
    cached = { at: Date.now(), items };
    return items;
}

function matchesPlan(item: DodoProductLite, plan: DodoPaidPlan): boolean {
    return item.name === `TailoredAd ${PLAN_DISPLAY_NAME[plan]}`
        && item.price === PLAN_PRICE_USD[plan] * 100;
}

/** 플랜 → product ID (유일 매칭 아니면 throw — 400으로 변환) */
export async function resolveDodoProductId(plan: DodoPaidPlan): Promise<string> {
    const hits = (await listProducts()).filter((item) => matchesPlan(item, plan));
    if (hits.length !== 1) {
        throw new Error(`Dodo product not uniquely matched (plan=${plan}, hits=${hits.length}).`);
    }
    return hits[0].id;
}

/** product ID → 플랜 (미등록이면 null) */
export async function resolveDodoPlan(productId: string): Promise<DodoPaidPlan | null> {
    const hit = (await listProducts()).find((item) => item.id === productId);
    if (!hit) return null;
    return MANAGED_PLANS.find((plan) => matchesPlan(hit, plan)) ?? null;
}
