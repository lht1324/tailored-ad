import { Metadata } from "next";
import LandingPageServer from "@/components/page/ad/landing/LandingPageServer";

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

export default function AdPage() {
    return <LandingPageServer />;
}
