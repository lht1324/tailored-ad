import type { BlogPostContent, BlogPostFaqItem } from "@/lib/content/blog/types";

/**
 * 블로그 글별 JSON-LD — 랜딩(landingJsonLd.ts 상수)과 달리 글마다 달라져서 함수로 제공.
 * AI 추출기·검색 인용 가독성용. 값은 posts/* 데이터에서만 나오므로 이중 관리 없음.
 */

const SITE_URL = "https://tailoredad.com";

/** Article — 글 자체의 구조화 표현 */
export function buildArticleJsonLd(post: BlogPostContent) {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.headline,
        description: post.metaDescription,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: {
            "@type": "Organization",
            name: "TailoredAd",
            url: SITE_URL,
        },
        publisher: {
            "@type": "Organization",
            name: "TailoredAd",
            url: SITE_URL,
            logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/logo/logo-512.png`,
            },
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${SITE_URL}/blog/${post.slug}`,
        },
    } as const;
}

/** BreadcrumbList — Home > Blog > 글 (검색 결과 경로 표시용) */
export function buildBreadcrumbJsonLd(post: BlogPostContent) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
            {
                "@type": "ListItem",
                position: 3,
                name: post.headline,
                item: `${SITE_URL}/blog/${post.slug}`,
            },
        ],
    } as const;
}

/** FAQPage — 글 본문 FAQ와 동일 데이터에서 생성 (랜딩의 이중 관리 문제 구조적으로 차단) */
export function buildFaqPageJsonLd(items: BlogPostFaqItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer.join(" "),
            },
        })),
    } as const;
}
