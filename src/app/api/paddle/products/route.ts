import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getPaddleClient } from "@/lib/paddleClient";
import type { ProductData } from "@/lib/api/types/api/paddle/products/ProductData";

/**
 * Paddle 판매 중 구독 상품 목록 — GET /api/paddle/products
 * C2S 진입은 client-gateway 경유. 플랜 변경 모달의 선택지용.
 * 필요 스코프: product.read (price 포함)
 */
export async function GET(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const paddle = await getPaddleClient();
        const products = paddle.products.list({ include: ['prices'] });

        const productList: ProductData[] = [];
        for await (const product of products) {
            for (const price of product.prices ?? []) {
                const custom = (price.customData ?? {}) as Record<string, unknown>;
                const amount = Number(price.unitPrice?.amount ?? 0);
                const currency = price.unitPrice?.currencyCode ?? "USD";
                const interval = price.billingCycle?.interval === 'year' ? 'year' as const : 'month' as const;
                productList.push({
                    id: price.id,
                    name: product.name,
                    price: Number.isFinite(amount) ? amount : 0,
                    currency,
                    interval,
                    description: product.description ?? "",
                    planId: typeof custom.plan === 'string' ? custom.plan : "",
                    isPopular: false,
                });
            }
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { productList },
            message: "Successfully fetched products.",
        });
    } catch (error) {
        console.error("Error in GET /api/paddle/products:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch products from Paddle."
        });
    }
}
