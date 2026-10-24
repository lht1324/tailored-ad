import type { BlogPostContent } from "@/lib/content/blog/types";

/**
 * [Blog] Creatify 대안 — 비교글 2번.
 *
 * 사실 검증 기준 (2026-10-25):
 * - creatify.ai/pricing 공식 페이지: Free 10크레딧(워터마크) · Standard $15/mo(55크레딧) ·
 *   Pro $55/mo(280크레딧) · Max $95(730) · Business $195(1,500). 연간 결제 할인 표기.
 * - 가격이 2026년 10월에 바뀜: 구 리뷰(adroast 9-23, wireflow, zeely)는 Starter $39/100 · Pro $99/300.
 *   → 카피에 "pricing changed in October 2026" 명시 + 확인일 기입.
 * - 크레딧율: 영상 5크레딧/15초 (help center, adroast·reloop 일치). 수정은 Starter 3크레딧/15초, Pro 조건부 무료.
 * - Free 플랜: 300 AI actors, 워터마크. Pro: 커스텀 아바타 3개 + Ad Launcher(Meta/TikTok/AppLovin).
 */
export const creatifyAlternativesPost: BlogPostContent = {
    slug: 'creatify-alternatives',
    kind: 'comparison',
    metaTitle: 'Creatify alternative for still ads — TailoredAd',
    metaDescription:
        'Creatify turns a product URL into avatar-led video ads. If you ship still ads, compare it with TailoredAd: one layout, five formats, pay per finished image.',
    publishedAt: '2026-10-25',
    updatedAt: '2026-10-25',

    eyebrow: 'Creatify alternative',
    headline: 'Creatify alternative: still ads without a video pipeline',
    subheadline:
        'Creatify turns a product URL into avatar-led video ads. That is its whole shape. If what you need is still images with exact type, read this before you pick a plan.',

    quickAnswer: [
        'Creatify fits advertisers whose main output is video: avatar-led ads generated from a product URL, with an ad launcher for Meta, TikTok and AppLovin on the Pro plan. Checked October 25, 2026: a free plan with 10 credits and a watermark, Standard at $15/month for 55 credits, Pro at $55/month for 280 credits. Video costs 5 credits per 15 seconds.',
        'TailoredAd fits advertisers whose main output is still images. One layout exports as 1:1, 4:5, 9:16, 16:9 and 2:3. The headline, CTA and logo are placed by code rather than painted by the model, and billing is per finished image: $19/month for 100 images, $49 for 500, $99 for 1,000. The first month is half price.',
        'The choice comes down to output. If your campaign plan says video, try Creatify. If it says stills across five placements, that is what TailoredAd builds.',
    ],

    keyTakeaways: [
        'Creatify pricing changed in October 2026. Older reviews list Starter at $39 and Pro at $99; the current page lists Standard at $15/month (55 credits) and Pro at $55/month (280 credits). Verify before you buy.',
        'Video is the billing unit: 5 credits per 15 seconds of video, and revisions cost 3 credits per 15 seconds on the lower tier. Image ads exist, but the pipeline and templates are built around video.',
        'TailoredAd makes stills only. Failed generations are free, unused images never expire, and downloads plus edits are unlimited.',
    ],

    table: {
        caption: 'Monthly billing side by side. Prices checked October 25, 2026 on creatify.ai/pricing.',
        columns: ['', 'Creatify', 'TailoredAd'],
        rows: [
            ['Entry paid plan', '$15/mo, 55 credits (Standard)', '$19/mo, 100 images'],
            ['Mid plan', '$55/mo, 280 credits (Pro)', '$49/mo, 500 images'],
            ['Free tier', '10 credits/mo, watermarked exports', '10 images, no card required'],
            ['Main output', 'Avatar video ads from a product URL', 'Still ads from a product photo'],
            ['Image ads', 'Available', 'The whole product'],
            ['Ad launching', 'Meta / TikTok / AppLovin launcher on Pro', 'Not offered'],
            ['Type handling', 'Rendered with the video frames', 'Composited pixel-exact'],
            ['Unused allowance', 'Credits renew monthly', 'Never expires'],
        ],
    },

    competitors: [
        {
            name: 'Creatify',
            bestFor: 'Teams whose main output is avatar-led video ads, generated from a product URL',
            pricingFrom: '$15/mo (Standard, 55 credits). Pricing revised October 2026',
            pros: [
                'URL-to-video pipeline purpose-built for UGC-style ads',
                '300 AI actors on every paid plan; 3 custom avatars on Pro',
                'Ad Launcher for Meta, TikTok and AppLovin on Pro',
                'Voiceover in 75+ languages',
            ],
            cons: [
                'Video-first: credits, templates and launchers are all video-denominated',
                'Pricing changed in October 2026, so older reviews show different numbers',
                'The useful team features (custom avatars, launcher, tracker) sit on Pro',
                'Lettering rides on generated frames, so text glitches are possible',
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
                'Still images only, no video ads',
                'No avatar library, ad launcher, or competitor tracking',
                'Young product: smaller template library and shorter track record',
            ],
        },
    ],

    sections: [
        {
            heading: 'What Creatify is good at',
            paragraphs: [
                'Creatify solves one problem well: turning a product URL into video ads that look like someone filmed them. You paste a link, pick an actor from the AI library, and the tool writes a script, generates the video, and adds a voiceover. On Pro it can push the result straight into Meta, TikTok or AppLovin.',
                'The actor library is the draw. Three hundred stock personas on the entry plan, fifteen hundred on Pro, plus a few custom avatars you can train on Pro. For teams that want UGC-style video without hiring creators, this is a reasonable way to get it.',
            ],
        },
        {
            heading: 'Why still-first teams look elsewhere',
            paragraphs: [
                'Everything at Creatify is priced in video time. Five credits buy fifteen seconds of video, and a revision costs three more on the lower tier. That accounting makes sense for video. For still images it is a strange unit: you are buying seconds when what you want is one good frame.',
                'Image ads exist in the product, but they ride along. The templates, the launcher, the actor library and the pricing all assume your deliverable moves. If your deliverable is a fixed image with a headline on it, most of what you pay for goes unused.',
                'There is also the text problem. In a generated video, every letter is painted by the model. That is inherent to the medium, and it means a garbled word can slip through into a paid placement.',
            ],
        },
        {
            heading: 'What TailoredAd does instead',
            paragraphs: [
                'TailoredAd starts from a product photo instead of a URL. You upload the photo and your logo, the system generates a batch of scene candidates, filters them through a quality gate, and shows you the ones worth using.',
                'A layout model then decides where the headline, call to action and logo sit, and the final render places that text with code, the same way a browser renders a page. Every approved design exports as 1:1, 4:5, 9:16, 16:9 and 2:3.',
                'Billing follows the deliverable: you pay per finished image, failures are free, and unused images never expire. Ten images are free to start, with no card.',
            ],
        },
        {
            heading: 'Who should stay on Creatify',
            paragraphs: ['Some teams should stay. If two or more of these describe you, Creatify is the right tool:'],
            bullets: [
                'Video is your primary format, not an occasional add-on.',
                'You want ads pushed into Meta, TikTok or AppLovin from the same tool that makes them.',
                'A consistent AI presenter across videos matters to your brand.',
                'You need voiceover in many languages.',
            ],
        },
        {
            heading: 'A note on AI disclosure rules (2026)',
            paragraphs: [
                'Since July 2026, Amazon requires sellers to tag listing images and A+ content that contain photorealistic AI-generated people, following New York\u2019s synthetic-performer disclosure law. Images with AI-generated backgrounds, props or products, with no synthetic people in frame, are outside that requirement.',
                'Both tools here can put synthetic people in front of your product. Creatify does it with AI actors in video; TailoredAd does it with a generated persona when you ask for one. Ad platforms each run their own AI-content policies, so check the current rule for every channel you launch on. Product-only stills carry no such tagging workflow.',
            ],
        },
        {
            heading: 'How to choose',
            paragraphs: ['Answer four questions and the decision makes itself:'],
            bullets: [
                'Is the deliverable a video or an image? This one question settles most of it.',
                'How does the headline reach the final file? Rendered by code, or painted by a model?',
                'What happens to allowance you did not spend this month?',
                'Which tool survives a test with your own product? Both have free tiers. Run the same product through both.',
            ],
        },
    ],

    faq: [
        {
            question: 'Is TailoredAd a full Creatify replacement?',
            answer: [
                'No. TailoredAd makes still images only. There are no video ads, no avatar library, and no ad launcher. For still-image workflows it covers the full loop: product photo to batch, quality gate, typeset layout, and five export formats.',
            ],
        },
        {
            question: 'Why do other reviews list different Creatify prices?',
            answer: [
                'Creatify changed its plans in October 2026. Reviews from September 2026 and earlier list Starter at $39/month for 100 credits and Pro at $99/month for 300. The current pricing page lists Standard at $15/month for 55 credits and Pro at $55/month for 280. Always check the live pricing page.',
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
