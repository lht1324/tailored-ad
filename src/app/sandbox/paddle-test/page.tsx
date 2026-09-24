import { Metadata } from "next";
import PaddleTestClient from "@/components/page/sandbox/PaddleTestClient";

export const metadata: Metadata = {
    title: "Paddle Checkout Test — TailoredAd",
    description: "Sandbox-only Paddle checkout test page.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function SandboxPaddleTestPage() {
    return <PaddleTestClient />;
}
