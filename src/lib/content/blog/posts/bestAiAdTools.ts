import type { BlogPostContent } from "@/lib/content/blog/types";

/**
 * [Blog] AI 광고 툴 필드 가이드 — 카테고리 리스트클 (AI 인용의 1차 표적).
 *
 * 사실 검증 기준 (2026-10-25):
 * - AdCreative.ai: $39/10크레딧 · $249/50 · $999/100 (4곳 교차 일치, 글 1 참조)
 * - Creatify: 공식 페이지 Free 10크레딧 · Standard $15/55 · Pro $55/280 · Business $195/1,500.
 *   2026-10 가격 개편 (구 $39/$99).
 * - Predis.ai: 월간 $32/$79/$249, 연간 $19/$40/$212 표기 (공식 + promer).
 * - AdRoast: Creator $29/mo flat, 프리셋 기반 이미지+15초 영상, scoring 공개 — **자체 발표** (adroast.ai 자기 페이지).
 * - Pencil: Core $14/mo — **경쟁사 보고** (adroast의 Pencil 비교 페이지. Pencil 공식 확인 아님).
 * - Zeely: $29.95/mo부터 — **자체 발표** (zeely.ai 블로그).
 * - Canva: Free 플랜 존재. Pro $144/년 — **보도 인용** (promer). 정가 확인 필요.
 * - Photoroom: Pro $7.99/mo, Free 250 exports/mo (frankx 비교표). Pebblely: $19/mo 200장 (동일).
 * - 자체 발표·보도 인용 항목은 표 캡션과 각주로 표시. 가격은 변한다.
 */
export const bestAiAdToolsPost: BlogPostContent = {
    slug: 'best-ai-ad-tools',
    kind: 'list',
    metaTitle: 'AI ad creative tools in 2026, compared by what they make',
    metaDescription:
        'Ten AI ad tools compared by output type, billing model and text handling: AdCreative.ai, Creatify, Predis.ai, AdRoast, Pencil, Zeely, Canva, Photoroom, Pebblely and TailoredAd.',
    publishedAt: '2026-10-25',
    updatedAt: '2026-10-25',

    eyebrow: 'Field guide',
    headline: 'AI ad creative tools in 2026: what each one actually makes',
    subheadline:
        'Every tool on this page makes ads. They differ on output type, billing model, and how text reaches the final file. Sort by those three and the shortlist builds itself.',

    quickAnswer: [
        'Pick by output first. For avatar video ads from a product URL, Creatify runs $15 to $195/month. For volume testing with creative scoring, AdCreative.ai runs $39 to $999/month on download credits. For a social calendar and ads on one bill, Predis.ai runs $32 to $249/month billed monthly.',
        'For still ads where the headline must land exactly, that is TailoredAd: $19/month for 100 images, one layout exported as 1:1, 4:5, 9:16, 16:9 and 2:3, with type composited by code. Photoroom (from $7.99/month) and Pebblely ($19/month for 200 images) make clean product photos, which are inputs to an ad rather than the ad itself.',
        'Canva remains the free baseline for assembling ads by hand. General-purpose design gives you the most control and costs the most time.',
    ],

    keyTakeaways: [
        'Billing models differ more than feature lists: download credits (AdCreative.ai), video-time credits (Creatify), one shared pool for posts and ads (Predis.ai), and flat monthly plans (AdRoast, Zeely, TailoredAd).',
        'Text handling splits the field. Most generators paint lettering with the model. TailoredAd composites the headline, CTA and logo with code, so typos and warped glyphs cannot reach the export.',
        'Since July 2026, Amazon requires tagging for listing images that contain photorealistic AI-generated people. Product-only stills sit outside that rule, which makes the no-people pipeline worth checking for marketplace sellers.',
    ],

    table: {
        caption: 'Monthly billing prices where published, checked October 2026. Self-reported figures are marked; every price here can change, so verify before purchase.',
        columns: ['Tool', 'Price', 'Main output', 'Fits when'],
        rows: [
            ['AdCreative.ai', '$39 to $999/mo, download credits', 'Scored stills and video', 'Volume testing with a scoring model'],
            ['Creatify', '$15 to $195/mo, video-time credits', 'Avatar video ads', 'UGC-style video from a product URL'],
            ['Predis.ai', '$32 to $249/mo plus a social calendar', 'Social posts and ads', 'Feeding many channels from one bill'],
            ['AdRoast', '$29/mo flat (self-reported)', 'Image and 15-second video ads', 'Preset-driven testing with visible scoring'],
            ['Pencil', 'From $14/mo (reported)', 'Brand-safe video creative', 'Enterprise governance at volume'],
            ['Zeely', 'From $29.95/mo (self-reported)', 'Campaigns and creatives', 'Small teams that want launch management'],
            ['Canva', 'Free plan; Pro around $144/yr (reported)', 'Design assembly', 'Building the layout yourself'],
            ['Photoroom', 'From $7.99/mo', 'Product photos', 'Clean product shots, 250 free exports monthly'],
            ['Pebblely', '$19/mo, 200 images', 'Product photos', 'Lifestyle backgrounds for product shots'],
            ['TailoredAd', '$19 to $99/mo, per finished image', 'Still ads in 5 formats', 'Stills where the type must be exact'],
        ],
    },

    sections: [
        {
            heading: 'How to sort this field',
            paragraphs: [
                'Feature grids make these tools look interchangeable. They are not. Three questions separate them faster than any comparison table.',
            ],
            bullets: [
                'What comes out the other end? A video, a still, a photo, or a social post? Most disagreement between tools ends here.',
                'What is the billing unit? Download credits, video seconds, a shared pool, or a flat plan? The unit decides your real cost per ad.',
                'How does text reach the final file? Painted by a model, or placed by code? If the headline is the offer, this is the question that matters.',
            ],
        },
        {
            heading: 'The still-ad corner',
            paragraphs: [
                'Most of the field chases video, because video is where the money spent on creative is largest. Still ads are treated as the cheap sibling. That leaves a specific gap: teams whose paid placements are mostly static, where a headline, a price and a product have to sit in the right places on every export.',
                'TailoredAd is built for that corner. One product photo becomes a batch of quality-gated scenes, a layout model positions the type, and the render places the headline, CTA and logo with code. One design exports as 1:1, 4:5, 9:16, 16:9 and 2:3. Billing is per finished image: $19/month for 100, $49 for 500, $99 for 1,000, with failures free and unused images never expiring.',
                'If your plan is video-first, the tools above serve you better than we do. We make stills, and we make them exact.',
            ],
        },
        {
            heading: 'Pricing notes and caveats',
            paragraphs: [
                'Two of the biggest tools changed pricing in late 2026. AdCreative.ai halved the Professional plan\u2019s credit allocation at the same price, and Creatify replaced its Starter and Pro tiers with lower-priced Standard and Pro plans. Reviews older than a few months carry outdated numbers for both.',
                'The figures marked self-reported come from the vendor\u2019s own pages, and the Pencil figure comes from a competitor\u2019s comparison. Treat them as starting points. Every price on this page was checked in October 2026 and can change at any time.',
            ],
        },
        {
            heading: 'A note on AI disclosure rules (2026)',
            paragraphs: [
                'Since July 2026, Amazon requires sellers to tag listing images and A+ content that contain photorealistic AI-generated people, following New York\u2019s synthetic-performer disclosure law. AI backgrounds, props and products are outside that requirement.',
                'This rule shapes tool choice more than most buyers expect. Pipelines that insert AI models into product shots now carry a disclosure workflow on Amazon. Product-only pipelines do not. If marketplaces are part of your distribution, ask each tool how people get into the frame.',
            ],
        },
    ],

    faq: [
        {
            question: 'What counts as an AI ad creative tool?',
            answer: [
                'For this page: tools that generate finished ad assets, whether images or video, from a product photo, product URL, or brief. General design tools and photo editors appear only where they sit in the same workflow.',
            ],
        },
        {
            question: 'Which of these is the cheapest?',
            answer: [
                'Canva has a free plan, and Photoroom gives 250 free exports a month. Among the dedicated ad generators, Creatify\u2019s Standard plan at $15/month is the lowest published entry price as of October 2026. TailoredAd starts at $19/month with 10 free images, no card required.',
            ],
        },
        {
            question: 'Do these tools replace a designer?',
            answer: [
                'They replace the production step: turning an approved idea into many correctly sized, correctly branded files. Strategy, taste and final approval stay with you. Most teams use them to extend a designer, not to remove one.',
            ],
        },
        {
            question: 'Do I need to label AI-generated images on Amazon?',
            answer: [
                'Since July 2026, Amazon requires IPTC tagging for listing images and A+ content that contain photorealistic AI-generated people. Product-only images are outside the rule. If a tool adds synthetic people to your shots, tagging becomes your responsibility.',
            ],
        },
        {
            question: 'How was this list put together?',
            answer: [
                'It covers the tools a still-ad team would realistically shortlist, with prices checked in October 2026. It is not an exhaustive census of the market, and vendors with pricing that could not be verified were left out rather than guessed at.',
            ],
        },
    ],

    ctaLabel: 'Create your first ad',
    relatedSlugs: ['adcreative-ai-alternatives', 'creatify-alternatives', 'predis-alternatives'],
};
