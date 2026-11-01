import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "@/context/AuthContext";
import { PUBLIC_ROUTES } from "@/routes/publicRoutes";
import type { PageMeta } from "@shared/types/PageMeta";

/**
 * 프리렌더 진입점 — **빌드 타임에만** 실행된다 (브라우저/워커 번들에는 안 들어간다).
 *
 * 각 공개 경로를 `renderToString`으로 구워 HTML 문자열을 만든다.
 * 라우트 표(`src/routes/publicRoutes.tsx`)를 그대로 읽으므로 화면과 meta가 어긋나지 않는다.
 *
 * ## 왜 감싸는가
 * - `MemoryRouter`: `Link`가 Router 컨텍스트를 요구한다
 * - `AuthProvider`: 헤더가 `useAuth()`를 부른다 (없으면 throw)
 * - 바깥 div: 구 `layout.tsx`의 `font-satoshi` 래퍼와 동일해야 서체가 맞는다
 */

export interface PrerenderResult {
    html: string;
    meta: PageMeta;
}

export function renderPage(path: string): PrerenderResult | null {
    const route = PUBLIC_ROUTES.find((candidate) => candidate.path === path);
    if (!route) return null;

    const html = renderToString(
        <MemoryRouter>
            <AuthProvider>
                <div className="min-h-screen bg-canvas text-text1 font-satoshi">{route.element}</div>
            </AuthProvider>
        </MemoryRouter>,
    );

    return { html, meta: route.meta };
}

/** 프리렌더할 경로 목록 */
export const PRERENDER_PATHS: string[] = PUBLIC_ROUTES.map((route) => route.path);
