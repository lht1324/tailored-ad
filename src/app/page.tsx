import { Metadata } from "next";
import LandingPageServer from "@/components/page/ad/landing/LandingPageServer";

export const metadata: Metadata = {
    title: "TailoredAd | AI Ad Creatives That Don't Look Like AI Stock",
    description: "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
    alternates: {
        canonical: 'https://tailoredad.com',
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://tailoredad.com',
        title: "TailoredAd | AI Ad Creatives That Don't Look Like AI Stock",
        description: "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
        siteName: 'TailoredAd',
        images: [
            {
                url: 'https://shortreal.ai/preview/demo_main_center.webp',
                width: 378,
                height: 672,
                alt: 'TailoredAd creative example',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: "TailoredAd | AI Ad Creatives That Don't Look Like AI Stock",
        description: "Brand-consistent ad creatives for growth teams without a designer.",
        images: ['https://shortreal.ai/preview/demo_main_center.webp'],
    },
};

export default function AdPage() {
    return <LandingPageServer />;
}
