import { getDodoClient } from "@/lib/dodoClient";
import type { DodoPaidPlan } from "@/lib/dodo";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Dodo 상품 해석 — 서버 전용. ID 하드코딩 없음.
 * 상품 metadata의 planId(plan-1/2/3)로 매핑. plan 키도 예비로 인정.
 * 3 플랜이 정확히 1개씩이어야 통과 (누락·중복은 loudly 실패 — 오결제 방지).
 * metadata 없는 상품은 무시 (향후 티어 추가돼도 안 깨짐).
 */

const MANAGED_PLANS: DodoPaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

function readPlanKey(product: unknown): string {
    const meta = (product as { metadata?: unknown }).metadata;
    if (!meta || typeof meta !== 'object') return '';
    const m = meta as Record<string, unknown>;
    const v = m.planId ?? m.plan;
    return typeof v === 'string' ? v.trim() : '';
}

let cached: { at: number; byPlan: Record<DodoPaidPlan, string> } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function resolveMapping(): Promise<Record<DodoPaidPlan, string>> {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.byPlan;
    }
    const dodo = await getDodoClient();
    const products = await dodo.products.list({ recurring: true });
    const byPlan = {} as Record<DodoPaidPlan, string>;
    const seen = new Set<string>();
    for await (const product of products) {
        const p = product as unknown as {
            product_id?: string; id?: string;
        };
        const id = p.product_id ?? p.id ?? '';
        const plan = readPlanKey(product);
        if (!id || !MANAGED_PLANS.includes(plan as DodoPaidPlan)) continue;
        if (seen.has(plan)) {
            throw new Error(`Dodo product duplicated (plan=${plan}).`);
        }
        seen.add(plan);
        byPlan[plan as DodoPaidPlan] = id;
    }
    const missing = MANAGED_PLANS.filter((plan) => !byPlan[plan]);
    if (missing.length > 0) {
        throw new Error(`Dodo product missing metadata (plan=${missing.join(',')}).`);
    }
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
