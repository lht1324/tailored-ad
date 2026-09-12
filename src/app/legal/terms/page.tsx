import LegalPageServer from "@/components/page/legal/LegalPageServer";
import { Metadata } from "next";
import { LegalDataType } from "@/components/page/legal/LegalDataType";

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Read TailoredAd Terms of Service. User rights and responsibilities.',
    openGraph: {
        title: 'Terms of Service - TailoredAd',
        description: 'Read TailoredAd Terms of Service. User rights and responsibilities.',
        url: 'https://tailoredad.com/legal/terms',
    },
    alternates: {
        canonical: 'https://tailoredad.com/legal/terms',
    },
    robots: {
        index: true,
        follow: true,
    }
};

// 2. 페이지 컴포넌트
export default async function LegalTermsPage() {
    return <LegalPageServer legalDataType={LegalDataType.TERMS}/>;
}
