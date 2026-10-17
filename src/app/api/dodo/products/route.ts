import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getDodoClient } from "@/lib/dodoClient";
import { getDodoProductList } from "@/lib/dodoProducts";
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
        const productList = await getDodoProductList();
        // 브라우저 캐시 3분 — 랜딩 재방문 시 네트워크 왕복 생략. 카탈로그 변경은 최대 3분 지연 허용.
        const response = getNextBaseResponse({
            success: true,
            status: 200,
            data: { productList },
            message: "Successfully fetched products.",
        });
        response.headers.set('Cache-Control', 'private, max-age=180');
        return response;
    } catch (error) {
        console.error("Error in GET /api/dodo/products:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch products from Dodo."
        });
    }
}
