import type { ReactElement } from "react";
import LandingPage from "@/components/page/ad/landing/LandingPage";
import LegalPageClient from "@/components/page/legal/LegalPageClient";
import { LegalDataType } from "@/components/page/legal/LegalDataType";
import type { PageMeta } from "@shared/types/PageMeta";

/**
 * **공개 라우트 표** — 화면 + 메타데이터를 한 곳에 모은다.
 *
 * 이 표는 두 곳에서 쓰인다.
 * 1. 클라 런타임: `<Routes>`를 이 표로 만든다
 * 2. 프리렌더 스크립트: 각 경로를 `renderToString`으로 구워 HTML 파일을 만든다
 *
 * 그래서 화면과 meta를 **같은 파일에 붙여** 두면 둘이 어긋날 일이 없다.
 * 새 공개 페이지(블로그 등)는 여기에 추가하면 프리렌더에 자동으로 포함된다.
 */

const SITE_URL = "https://tailoredad.com";
const OG_IMAGE = {
    url: `${SITE_URL}/og/og.jpg`,
    width: 1200,
    height: 630,
    alt: "TailoredAd — AI ad creatives that do not look like AI stock",
};

export interface PublicRoute {
    path: string;
    element: ReactElement;
    meta: PageMeta;
}

export const PUBLIC_ROUTES: PublicRoute[] = [
    {
        path: "/",
        element: <LandingPage />,
        meta: {
            title: "TailoredAd — AI ad creatives that don't look like AI stock",
            description:
                "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
            canonical: SITE_URL,
            openGraph: {
                type: "website",
                url: SITE_URL,
                title: "TailoredAd — AI ad creatives that don't look like AI stock",
                description:
                    "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
                siteName: "TailoredAd",
                image: OG_IMAGE,
            },
            twitter: {
                card: "summary_large_image",
                title: "TailoredAd — AI ad creatives that don't look like AI stock",
                description: "Brand-consistent ad creatives for growth teams without a designer.",
                image: OG_IMAGE.url,
            },
        },
    },
    {
        path: "/legal/terms",
        element: <LegalPageClient legalDataType={LegalDataType.TERMS} />,
        meta: {
            title: "Terms of Service",
            description: "Read TailoredAd Terms of Service. User rights and responsibilities.",
            canonical: `${SITE_URL}/legal/terms`,
            robots: { index: true, follow: true },
            openGraph: {
                title: "Terms of Service - TailoredAd",
                description: "Read TailoredAd Terms of Service. User rights and responsibilities.",
                url: `${SITE_URL}/legal/terms`,
            },
        },
    },
    {
        path: "/legal/privacy",
        element: <LegalPageClient legalDataType={LegalDataType.PRIVACY} />,
        meta: {
            title: "Privacy Policy",
            description: "Read TailoredAd Privacy Policy. Learn how we handle your data.",
            canonical: `${SITE_URL}/legal/privacy`,
            robots: { index: true, follow: true },
            openGraph: {
                title: "Privacy Policy - TailoredAd",
                description: "Read TailoredAd Privacy Policy. Learn how we handle your data.",
                url: `${SITE_URL}/legal/privacy`,
            },
        },
    },
    {
        path: "/legal/refunds",
        element: <LegalPageClient legalDataType={LegalDataType.REFUNDS} />,
        meta: {
            title: "Refund Policy",
            description: "Read TailoredAd Refund Policy. Cancellations and pro-rata refunds.",
            canonical: `${SITE_URL}/legal/refunds`,
            robots: { index: true, follow: true },
            openGraph: {
                title: "Refund Policy - TailoredAd",
                description: "Read TailoredAd Refund Policy. Cancellations and pro-rata refunds.",
                url: `${SITE_URL}/legal/refunds`,
            },
        },
    },
];
