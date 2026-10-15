import { getDodoClient } from "@/lib/dodoClient";
import type { DodoPaidPlan } from "@/lib/dodo";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Dodo 상품 해석 — 서버 전용. ID 하드코딩 없음.
 * 키가 고른 환경의 recurring 상품을 가격 오름차순으로 Starter/Growth/Pro에 매핑.
 * 3건이 아니면 loudly 실패 (상품 추가·삭제·가격 변경 시 오결제 방지).
 */

interface DodoProductLite {
    id: string;
    price: number; // cents
}

const MANAGED_PLANS: DodoPaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

let cached: { at: number; byPlan: Record<DodoPaidPlan, string> } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function resolveMapping(): Promise<Record<DodoPaidPlan, string>> {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.byPlan;
    }
    const dodo = await getDodoClient();
    const products = await dodo.products.list({ recurring: true });
    const items: DodoProductLite[] = [];
    for await (const product of products) {
        const p = product as unknown as {
            product_id?: string; id?: string; price?: number;
        };
        const id = p.product_id ?? p.id ?? '';
        if (id) {
            items.push({ id, price: Number(p.price ?? 0) || 0 });
        }
    }
    items.sort((a, b) => a.price - b.price);
    if (items.length !== MANAGED_PLANS.length) {
        throw new Error(`Dodo product count mismatch (expected=${MANAGED_PLANS.length}, got=${items.length}).`);
    }
    const byPlan = {} as Record<DodoPaidPlan, string>;
    MANAGED_PLANS.forEach((plan, index) => {
        byPlan[plan] = items[index].id;
    });
    cached = { at: Date.now(), byPlan };
    return byPlan;
}

/** 플랜 → product ID (매핑 실패 시 throw — 400으로 변환) */
export async function resolveDodoProductId(plan: DodoPaidPlan): Promise<string> {
    const id = (await resolveMapping())[plan];
    if (!id) {
        throw new Error(`Dodo product not mapped (plan=${plan}).`);
    }
    return id;
}

/** product ID → 플랜 (미등록이면 null) */
export async function resolveDodoPlan(productId: string): Promise<DodoPaidPlan | null> {
    const byPlan = await resolveMapping();
    return (MANAGED_PLANS.find((plan) => byPlan[plan] === productId)) ?? null;
}
