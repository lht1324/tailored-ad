import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getPolarClient } from "@/lib/polarClient";
import type { OrderData } from "@/lib/api/types/api/polar/orders/OrderData";

/**
 * Polar 결제내역 조회 — GET /api/polar/orders?email=
 * C2S 진입은 client-gateway 경유 (gateway가 userId 주입, 본인 확인용).
 * 이메일로 고객을 찾아 주문 목록 반환. 고객 없으면 빈 목록 (정상).
 * 필요 스코프: customers:read, orders:read
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
        const polar = await getPolarClient();

        const customerResult = await polar.customers.list({
            email: email,
            limit: 1,
        });
        if (!customerResult.result || customerResult.result.items.length === 0) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { orderList: [] },
                message: "No customer found with the provided email."
            });
        }

        const customerId = customerResult.result.items[0].id;
        const ordersResult = await polar.orders.list({
            customerId: customerId,
        });

        const orderList: OrderData[] = ordersResult.result.items.map((order) => ({
            productName: order.product?.name ?? "-",
            totalAmount: order.totalAmount,
            currency: order.currency,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
        }));

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { orderList },
            message: "Successfully fetched orders from Polar."
        });
    } catch (error) {
        console.error("Error in GET /api/polar/orders:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch orders from Polar."
        });
    }
}
