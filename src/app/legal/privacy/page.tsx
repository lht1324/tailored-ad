import LegalPageServer from "@/components/page/legal/LegalPageServer";
import { Metadata } from "next";
import { LegalDataType } from "@/components/page/legal/LegalDataType";

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Read TailorAd Privacy Policy. Learn how we handle your data.',
    openGraph: {
        title: 'Privacy Policy - TailorAd',
        description: 'Read TailorAd Privacy Policy. Learn how we handle your data.',
        url: 'https://tailoredad.com/legal/privacy',
    },
    alternates: {
        canonical: 'https://tailoredad.com/legal/privacy',
    },
    robots: {
        index: true,
        follow: true,
    }
};

// 2. 페이지 컴포넌트
export default async function LegalPrivacyPage() {
    return <LegalPageServer legalDataType={LegalDataType.PRIVACY}/>;
}
