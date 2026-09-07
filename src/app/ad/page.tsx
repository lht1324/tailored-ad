import { Metadata } from "next";
import AdPageServer from "@/components/page/ad/AdPageServer";

export const metadata: Metadata = {
    title: "ShortReal Ad | AI Ad Creatives That Don't Look Like AI Stock",
    description: "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
    alternates: {
        canonical: 'https://shortreal.ai/ad',
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://shortreal.ai/ad',
        title: "ShortReal Ad | AI Ad Creatives That Don't Look Like AI Stock",
        description: "Brand-consistent ad creatives for growth teams without a designer. Harnessed AI generation, deterministic typography, and platform-ready sizes — every time.",
        siteName: 'ShortReal Ad',
        images: [
            {
                url: 'https://shortreal.ai/preview/demo_main_center.webp',
                width: 378,
                height: 672,
                alt: 'ShortReal Ad creative example',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: "ShortReal Ad | AI Ad Creatives That Don't Look Like AI Stock",
        description: "Brand-consistent ad creatives for growth teams without a designer.",
        images: ['https://shortreal.ai/preview/demo_main_center.webp'],
    },
};

export default function AdPage() {
    return <AdPageServer />;
}
