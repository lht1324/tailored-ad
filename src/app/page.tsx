import type { Metadata } from "next";
import LandingPageServer from "@/components/page/ad/landing/LandingPageServer";
import { FAQ_ITEMS_JSON_LD, ORGANIZATION_JSON_LD, SOFTWARE_JSON_LD } from "@/lib/landingJsonLd";

export const metadata: Metadata = {
    title: "TailoredAd — AI ad creatives that don’t look like AI stock",
    description: "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
    alternates: {
        canonical: 'https://tailoredad.com',
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://tailoredad.com',
        title: "TailoredAd — AI ad creatives that don’t look like AI stock",
        description: "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
        siteName: 'TailoredAd',
        images: [
            {
                url: 'https://tailoredad.com/og/og.jpg',
                width: 1200,
                height: 630,
                alt: 'TailoredAd — AI ad creatives that do not look like AI stock',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: "TailoredAd — AI ad creatives that don’t look like AI stock",
        description: "Brand-consistent ad creatives for growth teams without a designer.",
        images: ['https://tailoredad.com/og/og.jpg'],
    },
};

/**
 * 구조화 데이터 (JSON-LD) — AI 요약·검색 인용 가독성용.
 * 카피·가격은 아래 상수와 PAGE 카피가 이중으로 들어가므로, 값 변경 시 양쪽을 같이 고칠 것.
 * (Google FAQ rich results는 대상 축소됐지만 AI 추출기는 FAQPage 구조를 그대로 파싱한다.)
 */
export default function AdPage() {
    return (
        <>
            <LandingPageServer />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_ITEMS_JSON_LD) }}
            />
        </>
    );
}