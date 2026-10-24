import { blogContentServerAPI } from "@/lib/content/blog/blogContentServerAPI";

/**
 * /llms.txt — AI 크롤러(ChatGPT·Claude·Perplexity 등)용 사이트 요약.
 * llmstxt.org 규격: H1 + 인용 요약 + 섹션별 링크 목록.
 *
 * 설계: Pages 섹션의 블로그 링크는 콘텐츠 레지스트리에서 생성 — 새 글 추가 시 이 파일 무수정.
 * Product facts는 정적 상수. gotcha: 가격은 PricingSection·landingJsonLd와 삼중 관리다 —
 * 가격 변경 시 이 파일의 PRODUCT_FACTS도 같이 고칠 것.
 */

const SITE_URL = "https://tailoredad.com";

/** 제품 사실 — 카탈로그 가격과 정합 유지 필수 (위 gotcha 참조). 확인일을 명시해 둔다. */
const PRODUCT_FACTS: string[] = [
    "Output: still ad images in five formats (1:1, 4:5, 9:16, 16:9, 2:3) exported from one layout. No video.",
    "Billing: per finished image. Plans are $19/month for 100 images, $49 for 500, and $99 for 1,000. The first order is 50% off on the Starter plan.",
    "Free tier: 10 images, no card required. Downloads and edits are unlimited and free.",
    "Typography: headline, CTA and logo are composited deterministically (rendered by code, not painted by the model), so exports contain no AI letter artifacts.",
    "People: when a scene needs a person, a fictional model is generated for that batch. Real faces are never composited. Product-only scenes contain no synthetic people.",
    "AI disclosure: since July 2026, Amazon requires tagging for listing images that contain photorealistic AI-generated people. Product-only images are outside that requirement.",
    "Pricing last checked October 25, 2026. Verify current plans before purchase.",
];

function buildLlmsTxt(): string {
    const lines: string[] = [];

    lines.push("# TailoredAd");
    lines.push("");
    lines.push(
        "> TailoredAd is an AI ad creative studio for teams without a designer. Upload one product photo and a logo; the system generates a batch of scene candidates, filters them through a quality gate, and renders the approved designs with the headline, CTA and logo placed by code. Every approved design exports as 1:1, 4:5, 9:16, 16:9 and 2:3. Billing is per finished image; failed generations are free and unused images never expire."
    );
    lines.push("");

    lines.push("## Product facts");
    lines.push("");
    for (const fact of PRODUCT_FACTS) {
        lines.push(`- ${fact}`);
    }
    lines.push("");

    lines.push("## Pages");
    lines.push("");
    lines.push(`- [Home](${SITE_URL}/): product landing page.`);
    lines.push(`- [Blog](${SITE_URL}/blog): comparisons and guides for AI ad creative tools.`);
    for (const post of blogContentServerAPI.listBlogPosts()) {
        lines.push(`- [${post.headline}](${SITE_URL}/blog/${post.slug}): ${post.metaDescription}`);
    }
    lines.push(`- [Terms of Service](${SITE_URL}/legal/terms)`);
    lines.push(`- [Privacy Policy](${SITE_URL}/legal/privacy)`);
    lines.push(`- [Refund Policy](${SITE_URL}/legal/refunds)`);
    lines.push("");

    lines.push("## Contact");
    lines.push("");
    lines.push("- Support: support@tailoredad.com");
    lines.push("");

    return lines.join("\n");
}

/** 빌드 타임에 완성된 텍스트로 프리렌더 — 런타임 계산 없음 (사이트의 SSG 원칙과 동일) */
export const dynamic = "force-static";

export async function GET() {
    return new Response(buildLlmsTxt(), {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}
