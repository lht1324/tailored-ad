import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getDodoClient } from "@/lib/dodoClient";
import { getPlanByDodoProduct, PLAN_DISPLAY_NAME } from "@/lib/dodo";
import type { OrderData } from "@/lib/api/types/api/dodo/orders/OrderData";

/**
 * Dodo 결제내역 조회 — GET /api/dodo/orders?email=
 * C2S 진입은 client-gateway 경유 (gateway가 userId 주입, 본인 확인용).
 * 이메일로 고객을 찾아 결제 목록 반환. 고객 없으면 빈 목록 (정상).
 */
export async function GET(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "email is required and must be a string."
        });
    }

    try {
        const dodo = await getDodoClient();

        let customerId: string | null = null;
        const customers = await dodo.customers.list({ email });
        for await (const c of customers) {
            const cand = c as unknown as { customer_id?: string; id?: string; email?: string };
            if ((cand.email ?? '').toLowerCase() === email.toLowerCase()) {
                customerId = cand.customer_id ?? cand.id ?? null;
                break;
            }
        }
        if (!customerId) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { orderList: [] },
                message: "No customer found with the provided email."
            });
        }

        const payments = await dodo.payments.list({ customer_id: customerId, status: 'succeeded' });
        const orderList: OrderData[] = [];
        for await (const pay of payments) {
            const p = pay as unknown as {
                total_amount?: number; currency?: string; status?: string; created_at?: string;
                subscription_ids?: string[];
            };
            // 상품명: 연결된 구독 → product 역매핑 (없으면 TailoredAd)
            let productName = 'TailoredAd';
            const kind: 'purchase' | 'upgrade' = 'purchase';
            const subId = p.subscription_ids?.[0];
            if (subId) {
                try {
                    const sub = await dodo.subscriptions.retrieve(subId) as unknown as { product_id?: string };
                    const plan = sub.product_id ? getPlanByDodoProduct(sub.product_id) : null;
                    if (plan) productName = PLAN_DISPLAY_NAME[plan] ?? plan;
                } catch {
                    /* 구독 조회 실패 — 기본 표시 유지 */
                }
            }
            const rawStatus = String(p.status ?? '').toLowerCase();
            orderList.push({
                productName,
                totalAmount: Number(p.total_amount ?? 0) || 0,
                currency: p.currency ?? 'USD',
                status: ['succeeded', 'paid', 'completed', 'billed'].includes(rawStatus) ? 'paid' : rawStatus,
                createdAt: p.created_at ?? new Date().toISOString(),
                kind,
            });
        }
        orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { orderList },
            message: "Successfully fetched orders from Dodo."
        });
    } catch (error) {
        console.error("Error in GET /api/dodo/orders:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch orders from Dodo."
        });
    }
}
