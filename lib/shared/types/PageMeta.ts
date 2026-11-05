/**
 * 페이지 메타데이터 — **프리렌더가 `<head>`에 주입**하는 값.
 *
 * 왜 컴포넌트 안이 아니라 별도 export인가:
 * SPA에는 Next의 `export const metadata`가 없다. 프리렌더 스크립트가
 * "이 경로는 무슨 제목·설명·canonical인가"를 알아야 HTML을 구울 수 있다.
 * 그래서 라우트 표(`src/routes/publicRoutes.tsx`)에 meta를 같이 적어둔다.
 *
 * ⚠️ 값은 **외부 노출 문구(영어)** 다.
 */
export interface PageMeta {
    /** `<title>` */
    title: string;
    /** `<meta name="description">` */
    description: string;
    /** `<link rel="canonical">` — 절대 URL */
    canonical: string;
    robots?: {
        index: boolean;
        follow: boolean;
    };
    openGraph?: {
        title: string;
        description: string;
        url: string;
        type?: "website" | "article";
        siteName?: string;
        image?: {
            url: string;
            width: number;
            height: number;
            alt: string;
        };
    };
    twitter?: {
        card: "summary" | "summary_large_image";
        title: string;
        description: string;
        image?: string;
    };
}
