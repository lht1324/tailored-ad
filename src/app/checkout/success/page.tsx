import { Metadata } from "next";
import CheckoutSuccessClient from "@/components/page/checkout/CheckoutSuccessClient";

export const metadata: Metadata = {
    title: "Checkout success — TailoredAd",
    description: "Confirm your TailoredAd subscription payment.",
};

export default function CheckoutSuccessPage() {
    return <CheckoutSuccessClient />;
}
