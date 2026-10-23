import type { Metadata } from "next";
import BlogIndexPageServer from "@/components/page/blog/BlogIndexPageServer";

export const metadata: Metadata = {
    title: "Blog — TailoredAd",
    description:
        "Honest comparisons and guides for AI ad creative tools: what they cost, where each fits, and who should stay away. Written to be quoted.",
    alternates: {
        canonical: "https://tailoredad.com/blog",
    },
    openGraph: {
        type: "website",
        url: "https://tailoredad.com/blog",
        title: "Blog — TailoredAd",
        description:
            "Honest comparisons and guides for AI ad creative tools: what they cost, where each fits, and who should stay away.",
        siteName: "TailoredAd",
    },
};

/** /blog 목록 — 콘텐츠 레지스트리에서 자동 생성된다 */
export default function BlogIndexPage() {
    return <BlogIndexPageServer />;
}
