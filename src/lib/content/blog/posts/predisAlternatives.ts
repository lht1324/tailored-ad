import type { BlogPostContent } from "@/lib/content/blog/types";

/**
 * [Blog] Predis.ai 대안 — 비교글 3번.
 *
 * 사실 검증 기준 (2026-10-25):
 * - predis.ai/pricing 공식 페이지: Core $19/mo(연간, ~~$32~~ 표기) · Rise $40/mo(~~$79~~) · Enterprise+ $212/mo(~~$249~~).
 *   promer.ai(9-23 확인) 기준 월간 결제 $32/$79/$249, 연간 $24/$55/$212. → 월간 결제가 $32/$79/$249로 기입, 연간 절감 병기.
 * - 크레딧: 통합 풀. 스태틱 광고·소셜 포스트·포토슈트 이미지 15크레딧, UGC 영상 200크레딧/8초 (promer).
 * - Rise 3,200크레딧/월 ≈ 이미지 800장 또는 영상 80개 (공식).
 * - 체험: 3일 무료, 카드 요구, 체험 종료 후 결제, 체험 후 환불 불가 (공식 pricing FAQ, promer 인용).
 *   구형 리뷰는 7일 체험 표기 — 바뀜.
 * - 채널: Core 10개(자동포스팅 없음) · Rise 20개(자동포스팅) · Enterprise+ 60개. 팀원 무제한 전 플랜.
 */
export const predisAlternativesPost: BlogPostContent = {
    slug: 'predis-alternatives',
    kind: 'comparison',
    metaTitle: 'Predis.ai alternative for ad stills — TailoredAd',
    metaDescription:
        'Predis.ai bundles a social calendar with ad generation on one shared credit pool. If you need ad stills with exact type, compare it with TailoredAd.',
    publishedAt: '2026-10-25',
    updatedAt: '2026-10-25',

    eyebrow: 'Predis.ai alternative',
    headline: 'Predis.ai alternative: when the job is ad stills, not another content calendar',
    subheadline:
        'Predis.ai is a social media tool that grew an ad generator: captions, scheduling, approvals, memes and ads on one bill. It is a good deal for the calendar half. The ad half is where this page gets specific.',

    quickAnswer: [
        'Predis.ai fits small teams that want social posting and ad creative from one tool. Checked October 25, 2026: Core at $32/month with 10 connected channels and no auto-posting, Rise at $79/month with auto-posting and 20 channels, Enterprise+ at $249/month. Annual billing cuts those to roughly $19, $40 and $212. Credits are one shared pool, and a static ad or social post costs 15 credits.',
        'TailoredAd fits when the job is ad stills. One layout exports as 1:1, 4:5, 9:16, 16:9 and 2:3. The headline, CTA and logo are placed by code rather than painted by the model, and billing is per finished image: $19/month for 100 images, $49 for 500, $99 for 1,000. Failed generations are free and unused images never expire.',
        'If the calendar is your bottleneck, Predis.ai is the better buy. If the ads themselves are the bottleneck, keep reading.',
    ],

    keyTakeaways: [
        'Predis.ai runs social publishing and ad generation on one shared credit pool. A static ad or social post costs 15 credits, and a UGC-style video costs 200 credits per 8 seconds. Videos drain the pool about thirteen times faster than stills.',
        'The free trial is 3 days, requires a card, and payments after the trial are non-refundable per the pricing page. Some older reviews still mention a 7-day trial.',
        'TailoredAd bills per finished image only: $19/100, $49/500, $99/1,000. There is no shared pool for posts and ads to compete over.',
    ],

    table: {
        caption: 'Monthly billing side by side. Prices checked October 25, 2026 on predis.ai/pricing.',
        columns: ['', 'Predis.ai', 'TailoredAd'],
        rows: [
            ['Entry paid plan', '$32/mo (Core, annual billing ≈ $19)', '$19/mo, 100 images'],
            ['Mid plan', '$79/mo (Rise, annual billing ≈ $40)', '$49/mo, 500 images'],
            ['Trial', '3 days free, card required, non-refundable after', '10 free images, no card required'],
            ['Main job', 'Social calendar plus ad generation', 'Ad stills only'],
            ['Credit pool', 'Shared: posts, ads, photos, videos', 'Images only'],
            ['Static ad cost', '15 credits', '1 finished image'],
            ['Auto posting', 'Rise plan and above', 'Not offered'],
            ['Type handling', 'Set inside templates', 'Composited pixel-exact'],
        ],
    },

    competitors: [
        {
            name: 'Predis.ai',
            bestFor: 'Small teams and agencies feeding many social channels from one tool',
            pricingFrom: '$32/mo (Core, monthly billing)',
            pros: [
                'Publishing to 10, 20 or 60 channels depending on plan, with auto-posting on Rise and above',
                'Approval workflow built in: clients review and sign off inside the app',
                'Catalog-to-ads for connected stores, plus UGC-style video',
                'Unlimited team members on every plan',
            ],
            cons: [
                'One shared credit pool: social posts, photos and ads compete for the same credits',
                'Trial is 3 days with a card, and payments after the trial are non-refundable',
                'Type and layout live inside templates, and some users report editing limits and duplicate output',
                'Ads and organic posts cost the same 15 credits, so paid work gets no priority',
            ],
        },
        {
            name: 'TailoredAd',
            bestFor: 'Teams shipping still ads that need exact typography and brand-consistent product shots',
            pricingFrom: '$19/mo (100 images, first month $9.50)',
            pros: [
                'Headlines, CTA and logo are composited deterministically, with no AI letter artifacts',
                'One layout renders into 1:1, 4:5, 9:16, 16:9 and 2:3',
                'Pay per finished image; failed generations are free',
                'Unused images never expire; downloads and edits are unlimited',
                'Product-only mode contains no synthetic people, so no AI-person tagging workflow',
            ],
            cons: [
                'Still images only, no video and no social publishing',
                'No scheduler, approvals or channel integrations',
                'Young product: smaller template library and shorter track record',
            ],
        },
    ],

    sections: [
        {
            heading: 'What Predis.ai does well',
            paragraphs: [
                'As a social media desk, Predis.ai covers a lot of ground for one price. You get a content calendar, AI captions and hashtags, a meme maker, blog-to-carousel conversion, quote posts and special-day content. On Rise and above it auto-posts to twenty channels, and clients can approve posts through a link without an account.',
                'The catalogue feature does real work for stores. Connect a product catalogue, and the tool builds ads across it, cloning a layout that already works onto new products. For a Shopify store with a hundred SKUs, that is leverage.',
            ],
        },
        {
            heading: 'Where the bill gets blurry',
            paragraphs: [
                'One credit pool funds two different jobs. A social post costs 15 credits, and so does a static ad. A UGC-style video costs 200 credits per eight seconds, which means a week of casual video posting can empty the pool that your paid ads were counting on. When two workloads share one budget, neither gets planned properly.',
                'The trial terms are also stricter than they look. Three days, card up front, charged automatically when the trial ends, and the pricing page states that payments after the trial are non-refundable. Reviews written a year ago still describe a seven-day trial, so check the current terms.',
                'Finally, the type. Layouts come from templates, and reviews from users mention editing limits and repeated output. If your ads live or die on a headline set in the right weight at the right position, template text is a constraint worth weighing.',
            ],
        },
        {
            heading: 'What TailoredAd does instead',
            paragraphs: [
                'TailoredAd does one job: ad stills. You upload a product photo and your logo, the system generates a batch of scene candidates, filters them through a quality gate, and renders the approved ones with the headline, CTA and logo placed by code.',
                'Every approved design exports as 1:1, 4:5, 9:16, 16:9 and 2:3 from the same composition. Billing is per finished image, failures are free, and unused images never expire. There is no shared pool, because there is no second job.',
            ],
        },
        {
            heading: 'Who should stay on Predis.ai',
            paragraphs: ['Keep it if your week looks like this:'],
            bullets: [
                'You feed five or more social channels on a schedule, every week.',
                'Client approvals are part of the workflow.',
                'Organic posts and ads carry similar weight in your plan.',
                'One bill covering both jobs beats two bills covering one each.',
            ],
        },
        {
            heading: 'A note on AI disclosure rules (2026)',
            paragraphs: [
                'Since July 2026, Amazon requires sellers to tag listing images and A+ content that contain photorealistic AI-generated people, following New York\u2019s synthetic-performer disclosure law. Images with AI-generated backgrounds, props or products, with no synthetic people in frame, are outside that requirement.',
                'Predis.ai\u2019s UGC avatars are synthetic people. TailoredAd\u2019s product-only mode contains no people at all, so its output has no tagging requirement; if you add a generated model to a scene, you own any disclosure your channel requires.',
            ],
        },
        {
            heading: 'How to choose',
            paragraphs: ['Two questions settle it:'],
            bullets: [
                'Is the bottleneck the calendar or the creative? The calendar belongs to Predis.ai. The creative belongs here.',
                'Do you want one bill for both jobs, or one tool per job done properly? Neither answer is wrong. They are different budgets.',
            ],
        },
    ],

    faq: [
        {
            question: 'Is TailoredAd a full Predis.ai replacement?',
            answer: [
                'No. TailoredAd has no scheduling, no social publishing and no approval workflow. It makes ad stills. If the calendar half matters to you, keep Predis.ai or a similar scheduler alongside.',
            ],
        },
        {
            question: 'How is billing calculated?',
            answer: [
                'You pay for the images you generate, not downloads. Every batch is quality-gated. Failures are on us.',
            ],
        },
        {
            question: 'Do unused images expire?',
            answer: [
                'No. Images you paid for never expire. Not at the end of the billing period. Not after cancellation.',
            ],
        },
        {
            question: 'Which ad sizes do you support?',
            answer: [
                'Every layout renders into 1:1, 4:5, 9:16, 16:9 and 2:3 from the same design. Downloads are unlimited and free.',
            ],
        },
        {
            question: 'Do I need to label AI-generated images on Amazon?',
            answer: [
                'Since July 2026, Amazon requires IPTC tagging for listing images and A+ content that contain photorealistic AI-generated people. TailoredAd\u2019s product-only mode contains no people, so its output carries no such requirement. If you add a generated model to a scene, you are responsible for the disclosure your channel requires.',
            ],
        },
        {
            question: 'What does "doesn\u2019t look like AI stock" mean?',
            answer: [
                'We generate candidate batches and quality-gate them before you ever see them. Then we composite headline and logo deterministically instead of asking the model to paint them.',
                'The result is a controlled, brand-consistent look. Not a generic AI rendering.',
            ],
        },
    ],

    ctaLabel: 'Create your first ad',
    relatedSlugs: ['adcreative-ai-alternatives', 'best-ai-ad-tools'],
};
