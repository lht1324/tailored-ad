import type { BlogPostContent } from "@/lib/content/blog/types";

/**
 * [Blog] 이커머스 업종 페이지 1번 — 멀티채널 셀링 관점.
 *
 * 사실 검증 기준 (2026-10-25):
 * - Amazon 대표이미지: 순백 RGB 255 · 상품 85% 이상 · 텍스트·로고·워터마크 금지 (Seller Central 공식).
 * - Amazon AI-person tagging: 2026-07-23부터 IPTC 태그 필수 (NY synthetic performer법, CNBC 확인).
 * - 채널 포맷: Meta 피드 1:1·4:5, 스토리/릴스 9:16, TikTok 9:16 등 — 업계 표준 (기능 명세 내 5비율).
 * - TailoredAd 수치: Dodo 카탈로그 ($19/100, $49/500, $99/1,000, 첫달 50%는 Starter 한정).
 */
export const ecommerceAdCreativePost: BlogPostContent = {
    slug: 'ecommerce-ad-creative',
    kind: 'industry',
    metaTitle: 'AI ad creative for ecommerce stores',
    metaDescription:
        'How an online store turns one product photo into ads for every channel: the format matrix, Amazon image rules, and per-finished-image pricing from $19/month.',
    publishedAt: '2026-10-25',
    updatedAt: '2026-10-25',

    eyebrow: 'For ecommerce',
    headline: 'Ad creative for ecommerce stores: one product photo, five placements',
    subheadline:
        'An online store does not need one ad. It needs the same ad in every size its channels ask for, with the same brand type on all of them. This page covers that workload and one way to run it.',

    quickAnswer: [
        'Most stores juggle three ad surfaces: Meta and Instagram feeds (1:1 and 4:5), stories and TikTok (9:16), and wide placements (16:9) for display or YouTube. A single product launch across five formats is five files before anyone optimizes anything. A catalog of twenty products, refreshed for a season, is a hundred.',
        'TailoredAd turns one product photo into a batch of scene candidates, filters them through a quality gate, and exports every approved design as 1:1, 4:5, 9:16, 16:9 and 2:3. Billing is per finished image: $19/month for 100, $49 for 500, $99 for 1,000. A twenty-product catalog refreshed across five formats fits the Growth plan.',
        'Two marketplace rules shape what AI can make: Amazon main images must be pure white with no text, and since July 2026, listing images containing photorealistic AI-generated people must be tagged. Product-only scenes avoid both problems.',
    ],

    keyTakeaways: [
        'The format matrix is the hidden workload. Five standard placements per design, multiplied by every product, promotion and season, is where the real file count lives.',
        'Amazon main images require a pure white background, the product filling most of the frame, and no text or logos. Lifestyle scenes belong in secondary images.',
        'Per-finished-image billing matches catalog math: failed generations are free, unused images never expire, and downloads plus edits are unlimited.',
    ],

    table: {
        caption: 'TailoredAd plans. Images are billed as finished renders only; failed generations are free.',
        columns: ['', 'Starter', 'Growth', 'Scale'],
        rows: [
            ['Monthly price', '$19', '$49', '$99'],
            ['Images per month', '100', '500', '1,000'],
            ['Price per image', '$0.190', '$0.098', '$0.099'],
            ['First month', '$9.50 (first order only)', 'Regular price', 'Regular price'],
        ],
    },

    sections: [
        {
            heading: 'The still-ad workload behind an online store',
            paragraphs: [
                'The visible part of ecommerce creative is the launch post. The real volume sits underneath it: the same product needs a square for the feed, a portrait for stories, a vertical for TikTok, a wide banner for display, and a fresh set every time there is a promotion. Each channel crops differently, so a single image exported once is rarely enough.',
                'Consistency is the second cost. When variants are made by hand or by different tools, the bottle drifts: a slightly different color here, a different cap there, a logo that wanders between sizes. Shoppers read that drift as a different brand, or worse, a different product.',
            ],
        },
        {
            heading: 'Channel rules that shape the assets',
            paragraphs: [
                'Marketplaces are the strictest. Amazon\u2019s main image must sit on a pure white background, show the product filling most of the frame, and contain no text, logos or props. Lifestyle scenes belong in secondary images, where there is room to work.',
                'The AI rules arrived in 2026. Amazon now requires sellers to tag listing images and A+ content that contain photorealistic AI-generated people, following New York\u2019s synthetic-performer disclosure law. AI backgrounds, props and products are outside the rule, so a scene with just your product carries no tagging workflow. Meta and TikTok run their own AI-content policies, which are worth checking per channel before a launch.',
            ],
        },
        {
            heading: 'How a TailoredAd batch runs',
            paragraphs: [
                'You upload one product photo and your logo. Optionally, you add a short note about the mood or setting. The system generates a batch of scene candidates around your product, filters them through a quality gate, and shows you only the ones worth keeping.',
                'A layout model then places the headline, call to action and logo, and the render composites that text with code, so the same campaign reads identically in every size. Each approved creative exports as 1:1, 4:5, 9:16, 16:9 and 2:3. Edits and downloads are unlimited and free; only generation consumes the balance.',
            ],
        },
        {
            heading: 'What AI should not decide for you',
            paragraphs: [
                'A fair guide says what the tool stays out of. Claims are yours: ingredient promises, pricing claims, comparison language and anything a regulator could read are brand decisions, not generation outputs. Product selection is yours. So is the definition of on-brand.',
                'What the tool carries is the production: scenes, formats, type placement and consistency across the set. Treat every render as a draft until a person has looked at it, the same way you would treat a freelancer\u2019s output.',
            ],
        },
        {
            heading: 'A pricing note for catalogs',
            paragraphs: [
                'Per-image billing lines up with how catalog work actually arrives, in bursts around launches and seasons. Failed generations are free, so a bad batch costs nothing but time. Unused images never expire, so a quiet month does not erase the balance.',
                'The math, roughly: twenty products refreshed across five formats is a hundred images, which fits the Growth plan at $49. The Starter plan at $19 covers a single-product store running a standing campaign.',
            ],
        },
    ],

    faq: [
        {
            question: 'Does this replace my product photographer?',
            answer: [
                'No, and this is worth saying plainly. A photographer\u2019s hero shots are hard to beat for your main listing images. What AI covers well is the long tail: seasonal variants, promotion scenes, channel sizes and the extra angles a launch needs. Most stores use both.',
            ],
        },
        {
            question: 'Can I use the output as an Amazon main image?',
            answer: [
                'No. Amazon main images require a pure white background with no text or logos, which is a different asset type from an ad. TailoredAd output belongs in secondary images, A+ content and paid placements, where lifestyle scenes are allowed.',
            ],
        },
        {
            question: 'Do I need to label AI-generated images on Amazon?',
            answer: [
                'Since July 2026, Amazon requires IPTC tagging for listing images and A+ content that contain photorealistic AI-generated people. TailoredAd\u2019s product-only mode contains no people, so its output carries no such requirement. If you add a generated model to a scene, you are responsible for the disclosure your channel requires.',
            ],
        },
        {
            question: 'How is billing calculated?',
            answer: [
                'You pay for the images you generate, not downloads. Every batch is quality-gated. Failures are on us.',
            ],
        },
        {
            question: 'Will my product look identical in every scene?',
            answer: [
                'The pipeline is built to preserve product identity: shape, color and material are locked to your uploaded photo, and the logo is composited pixel-exact. Generated scenes still deserve a human check before they run, which is why the quality gate exists.',
            ],
        },
        {
            question: 'Which ad sizes do you support?',
            answer: [
                'Every layout renders into 1:1, 4:5, 9:16, 16:9 and 2:3 from the same design. Downloads are unlimited and free.',
            ],
        },
    ],

    ctaLabel: 'Create your first ad',
    relatedSlugs: ['best-ai-ad-tools', 'skincare-ad-creative'],
};
