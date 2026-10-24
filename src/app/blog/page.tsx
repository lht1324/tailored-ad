import type { Metadata } from "next";
import BlogIndexPageServer from "@/components/page/blog/BlogIndexPageServer";

export const metadata: Metadata = {
    title: "Blog — TailoredAd",
    description:
        "Side-by-side comparisons of AI ad creative tools: verified prices, listed weaknesses, and a clear note on who each tool fits.",
    alternates: {
        canonical: "https://tailoredad.com/blog",
    },
    openGraph: {
        type: "website",
        url: "https://tailoredad.com/blog",
        title: "Blog — TailoredAd",
        description:
            "Side-by-side comparisons of AI ad creative tools: verified prices, listed weaknesses, and a clear note on who each tool fits.",
        siteName: "TailoredAd",
    },
};

/** /blog 목록 — 콘텐츠 레지스트리에서 자동 생성된다 */
export default function BlogIndexPage() {
    return <BlogIndexPageServer />;
}
