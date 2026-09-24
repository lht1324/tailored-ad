import LegalPageServer from "@/components/page/legal/LegalPageServer";
import { Metadata } from "next";
import { LegalDataType } from "@/components/page/legal/LegalDataType";

export const metadata: Metadata = {
    title: 'Refund Policy',
    description: 'Read TailoredAd Refund Policy. Cancellations and pro-rata refunds.',
    openGraph: {
        title: 'Refund Policy - TailoredAd',
        description: 'Read TailoredAd Refund Policy. Cancellations and pro-rata refunds.',
        url: 'https://tailoredad.com/legal/refunds',
    },
    alternates: {
        canonical: 'https://tailoredad.com/legal/refunds',
    },
    robots: {
        index: true,
        follow: true,
    }
};

// 2. 페이지 컴포넌트
export default async function LegalRefundsPage() {
    return <LegalPageServer legalDataType={LegalDataType.REFUNDS}/>;
}
