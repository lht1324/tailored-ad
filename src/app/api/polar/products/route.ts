import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getPolarClient } from "@/lib/polarClient";
import type { ProductData } from "@/lib/api/types/api/polar/products/ProductData";

/**
 * Polar 판매 중 구독 상품 목록 — GET /api/polar/products
 * C2S 진입은 client-gateway 경유 (세션 검증 + userId 주입).
 * 플랜 변경 모달의 선택지용. 가격은 참고 표시, 과금은 서버 매핑이 진실원천.
 * 필요 스코프: products:read
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
        const polar = await getPolarClient();
        const result = await polar.products.list({
            isArchived: false,
            isRecurring: true,
        });

        const productList: ProductData[] = result.result.items
            .filter((product) => {
                return product.recurringInterval === "month" || product.recurringInterval === "year";
            })
            .map((product) => {
                const firstPrice = product.prices[0];
                let price = 0;
                let currency = "USD";
                if (firstPrice) {
                    if ('priceAmount' in firstPrice && typeof firstPrice.priceAmount === 'number') {
                        price = firstPrice.priceAmount;
                    }
                    if ('priceCurrency' in firstPrice && typeof firstPrice.priceCurrency === 'string') {
                        currency = firstPrice.priceCurrency;
                    }
                }
                const metadata = (product.metadata ?? {}) as Record<string, unknown>;
                return {
                    id: product.id,
                    name: product.name,
                    price,
                    currency,
                    interval: product.recurringInterval as "month" | "year",
                    description: product.description ?? "",
                    planId: String(metadata.planId ?? ""),
                    isPopular: metadata.isPopular === true || metadata.isPopular === "true",
                } satisfies ProductData;
            });

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { productList },
            message: "Successfully fetched products.",
        });
    } catch (error) {
        console.error("Error in GET /api/polar/products:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch products from Polar."
        });
    }
}
