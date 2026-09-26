import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getPaddleClient } from "@/lib/paddleClient";
import { getPlanByPaddlePrice, PLAN_DISPLAY_NAME } from "@/lib/paddle";
import type { OrderData } from "@/lib/api/types/api/paddle/orders/OrderData";

/**
 * Paddle 결제내역 조회 — GET /api/paddle/orders?email=
 * C2S 진입은 client-gateway 경유 (gateway가 userId 주입, 본인 확인용).
 * 이메일로 고객을 찾아 트랜잭션 목록 반환. 고객 없으면 빈 목록 (정상).
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
        const paddle = await getPaddleClient();

        let customerId: string | null = null;
        const customers = await paddle.customers.list({ search: email, perPage: 1 });
        for await (const c of customers) {
            if (c.email.toLowerCase() === email.toLowerCase()) {
                customerId = c.id;
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

        const transactions = await paddle.transactions.list({ customerId: [customerId], status: ['completed', 'paid'], perPage: 50 });
        const orderList: OrderData[] = [];
        for await (const txn of transactions) {
            const totals = txn.details?.totals as unknown as { total?: string | number; currencyCode?: string } | null;
            // 라인 항목은 details.line_items 우선 (proration·음수 라인 포함), 없으면 items 폴백
            const detailLines = (txn.details as unknown as {
                line_items?: Array<{ price_id?: string; quantity?: number; totals?: { total?: string | number } | null; proration?: unknown }>;
            } | null)?.line_items ?? [];
            const topItems = (txn.items ?? []) as Array<{ priceId?: string; price?: { id?: string } }>;
            // 차액 표시: 마이너스 라인이나 proration이 있으면 업그레이드 top-up.
            // 플랜명은 양수 라인(목표 플랜) 기준.
            const isUpgrade = detailLines.some((i) => (i.quantity ?? 1) < 0 || i.proration != null);
            const namedDetail = detailLines.find((i) => Number(i.totals?.total ?? 0) > 0);
            const priceId = namedDetail?.price_id
                ?? topItems[0]?.priceId
                ?? topItems[0]?.price?.id
                ?? '';
            const plan = priceId ? await getPlanByPaddlePrice(priceId) : null;
            const rawStatus = String(txn.status ?? '').toLowerCase();
            const status = ['completed', 'billed', 'paid'].includes(rawStatus)
                ? 'paid'
                : rawStatus === 'past_due' ? 'pending' : rawStatus;
            orderList.push({
                productName: plan ? (PLAN_DISPLAY_NAME[plan] ?? plan) : 'TailoredAd',
                totalAmount: Number(totals?.total ?? 0) || 0,
                currency: totals?.currencyCode ?? 'USD',
                status,
                createdAt: txn.createdAt,
                kind: isUpgrade ? 'upgrade' : 'purchase',
            });
        }
        orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { orderList },
            message: "Successfully fetched orders from Paddle."
        });
    } catch (error) {
        console.error("Error in GET /api/paddle/orders:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch orders from Paddle."
        });
    }
}
