import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getDodoClient } from "@/lib/dodoClient";
import { getPlanByDodoProduct } from "@/lib/dodo";
import type { ProductData } from "@/lib/api/types/api/dodo/products/ProductData";

/**
 * Dodo 판매 중 구독 상품 목록 — GET /api/dodo/products
 * C2S 진입은 client-gateway 경유. 플랜 변경 모달의 선택지용.
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
        const dodo = await getDodoClient();
        const products = await dodo.products.list({ recurring: true });

        const productList: ProductData[] = [];
        for await (const product of products) {
            const p = product as unknown as {
                product_id?: string; id?: string; name?: string;
                price?: number; currency?: string; description?: string | null;
            };
            const id = p.product_id ?? p.id ?? '';
            productList.push({
                id,
                name: p.name ?? '',
                price: Number(p.price ?? 0) || 0,
                currency: p.currency ?? 'USD',
                interval: 'month',
                description: p.description ?? '',
                planId: getPlanByDodoProduct(id) ?? '',
                isPopular: false,
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { productList },
            message: "Successfully fetched products.",
        });
    } catch (error) {
        console.error("Error in GET /api/dodo/products:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch products from Dodo."
        });
    }
}
