import { Metadata } from "next";
import CheckoutSuccessClient from "@/components/page/checkout/CheckoutSuccessClient";

export const metadata: Metadata = {
    title: "Checkout success",
    description: "Confirm your TailoredAd subscription payment.",
    // 결제 확인 화면 — 검색 색인 대상 아님 (기능 페이지)
    robots: {
        index: false,
        follow: false,
    },
};

export default function CheckoutSuccessPage() {
    return <CheckoutSuccessClient />;
}
