import { Metadata } from "next";
import CreatePageClient from "@/components/page/ad/create/CreatePageClient";

export const metadata: Metadata = {
    title: "Create — TailoredAd",
    description: "Compose your ad creative — upload assets, choose format, and generate candidates.",
};

export default function AdCreatePage() {
    return <CreatePageClient />;
}
