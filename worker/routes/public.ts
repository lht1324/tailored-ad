import { Hono } from "hono";
import { getDodoClient } from "@worker/lib/dodoClient";
import { getDodoProductList } from "@worker/lib/dodoProducts";
import { getBaseResponse } from "@worker/lib/utils/getBaseResponse";
import type { AppEnv } from "../env";

/**
 * 인증이 필요 없는 공개 API.
 *
 * ⚠️ 이 라우터는 `requireSession` **앞에** 마운트한다 (`worker/index.ts` 참고).
 *    여기 넣는 것은 "비로그인 방문자에게 보여줘도 되는 정보"뿐이다.
 *
 * 지금은 상품 카탈로그 하나뿐 — 랜딩·가격 섹션이 로그인 전에 가격을 보여줘야 한다.
 * (Dodo 상품 목록은 마케팅 정보이고 비밀이 아니다)
 */
const publicRoutes = new Hono<{ Bindings: AppEnv }>();

/** 판매 중 구독 상품 목록 — `GET /api/dodo/products` */
publicRoutes.get("/dodo/products", async () => {
    try {
        // getDodoClient()를 먼저 불러 설정 누락을 조기에 드러낸다 (상품 목록만 보는 경로라도 키는 필요).
        await getDodoClient();
        const productList = await getDodoProductList();

        const response = getBaseResponse({
            success: true,
            status: 200,
            data: { productList },
            message: "Successfully fetched products.",
        });
        // 브라우저 캐시 3분 — 랜딩 재방문 시 왕복 생략. 카탈로그 변경은 최대 3분 지연 허용.
        response.headers.set("Cache-Control", "private, max-age=180");
        return response;
    } catch (error) {
        console.error("Error in GET /api/dodo/products:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch products from Dodo.",
        });
    }
});

export default publicRoutes;
