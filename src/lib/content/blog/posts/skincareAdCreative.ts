import type { BlogPostContent } from "@/lib/content/blog/types";

/**
 * [Blog] 스킨케어 업종 페이지 2번.
 *
 * 사실 검증 기준 (2026-10-25):
 * - Amazon AI-person tagging (2026-07-23, IPTC) — 글 1·4와 동일 출처.
 * - 실사 얼굴 금지 정책은 자사 결정 (09-25 확정, Enterprise 예외). "Real faces are never composited"는
 *   랜딩 HowItWorks Step 03 카피와 일치.
 * - 클레임·컴플라이언스는 브랜드 몫 — 법률 조언 아님을 문구로 명시.
 * - TailoredAd 수치: Dodo 카탈로그.
 */
export const skincareAdCreativePost: BlogPostContent = {
    slug: 'skincare-ad-creative',
    kind: 'industry',
    metaTitle: 'AI ad creative for skincare brands — TailoredAd',
    metaDescription:
        'Skincare ad creative with AI: clean scenes, texture close-ups, a bottle that stays consistent, and the disclosure rules for generated models. From $19/month.',
    publishedAt: '2026-10-25',
    updatedAt: '2026-10-25',

    eyebrow: 'For skincare brands',
    headline: 'Ad creative for skincare brands: clean scenes without a studio day',
    subheadline:
        'Skincare lives on look. Clean light, texture, and a bottle that stays the same color in every shot. This page covers what AI can carry in a skincare workflow, and what it should not touch.',

    quickAnswer: [
        'Skincare ad stills lean on four repeating assets: the packshot, the texture shot, the lifestyle scene, and the ingredient callout. The hero assets deserve a studio. The long tail of variants for launches, promotions and placements is where AI earns its keep.',
        'TailoredAd generates batches of scenes around your product photo and logo, quality-gates the results, and exports every approved design as 1:1, 4:5, 9:16, 16:9 and 2:3. Billing is per finished image, from $19/month for 100. When a scene needs a person, a fictional model is generated for it. Real faces are never composited.',
        'Two boundaries to know: Amazon tags listing images containing photorealistic AI-generated people since July 2026, and product claims stay with the brand. AI makes the pictures. The ingredient promises must come from you.',
    ],

    keyTakeaways: [
        'Consistency is the skincare bottleneck. The same bottle, cap and shade across every scene is what separates a brand from a reseller, and drift between renders is what shoppers notice first.',
        'Generated models are fictional by design. Product-only images avoid Amazon\u2019s AI-person tagging rule, and images with synthetic people carry disclosure requirements.',
        'Claims and compliance are not AI\u2019s job. Ingredient promises, before-and-after language and regulatory wording stay with the brand, in every market it sells to.',
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
            heading: 'The skincare image set',
            paragraphs: [
                'A skincare brand reuses the same four shots constantly. The packshot: the product alone, clean background, label readable. The texture shot: cream, serum or foam at close range, because texture is how buyers judge a product they cannot touch. The lifestyle scene: the product in a bathroom, on a shelf, in someone\u2019s hand. The callout: an ingredient or benefit set in type over a quiet background.',
                'The packshots and hero textures deserve a real shoot. They appear everywhere, they get scrutinized, and a photographer will beat a generated image on the frame that has to carry the brand. The variants are a different story. Every launch, seasonal set, promotion and placement needs more scenes than any shoot schedule survives, and that volume is where generated batches fit.',
            ],
        },
        {
            heading: 'Where consistency breaks, and how this pipeline holds it',
            paragraphs: [
                'The usual failure is drift. A generated scene nails the bottle in one image and bends the label in the next. The cap changes color. The shade goes from soft amber to bright orange between exports. In skincare, where the product itself is the promise, shoppers read that drift as a reformulation or a fake listing.',
                'TailoredAd locks the product to your uploaded photo: shape, color and material are preserved as references across every scene, and the palette is applied consistently. The logo is composited pixel-exact rather than drawn, so it cannot wander. Generated scenes still deserve a human check before they run, which is why every batch passes through a quality gate first.',
            ],
        },
        {
            heading: 'People in skincare ads',
            paragraphs: [
                'Faces sell skincare, and this is where the rules tightened in 2026. Amazon now requires sellers to tag listing images and A+ content that contain photorealistic AI-generated people, following New York\u2019s synthetic-performer disclosure law. Meta and TikTok run their own AI-content policies, which are worth checking per channel.',
                'TailoredAd takes a defined position. When a scene calls for a person, the pipeline casts a fictional model for that batch, described and generated from scratch. Real faces are never composited into scenes, so there is no likeness to misrepresent. Product-only scenes contain no people at all, which keeps them outside Amazon\u2019s tagging rule. If you do use a generated model, the disclosure your channel requires is yours to manage.',
            ],
        },
        {
            heading: 'What stays with the brand',
            paragraphs: [
                'AI should not write your promises. Ingredient claims, before-and-after language, SPF numbers and regulatory wording are legal statements about a product people put on their skin, and no generation pipeline should be trusted with them. The tool places the type; the words are yours to approve.',
                'Shade honesty belongs in the same bucket. The pipeline preserves the product\u2019s identity from your photo, but color is the one property shoppers scrutinize most in this category. Check the render against the real product before it runs, and pull the render if it drifts.',
            ],
        },
        {
            heading: 'A seasonal rhythm that fits AI',
            paragraphs: [
                'Skincare calendars are dense: a launch in spring, a repackaging in summer, a gift set in winter, plus the promotions in between. Each event multiplies the same product across placements and moods. Shooting every variant is how budgets vanish; reusing three hero assets across dozens of generated scenes is how small brands keep pace.',
                'A practical loop: shoot the hero assets once per season, upload the packshot and logo, generate batches per campaign, and let the quality gate do the first pass of review. Ten images are free to start, with no card.',
            ],
        },
    ],

    faq: [
        {
            question: 'Will the bottle look the same in every scene?',
            answer: [
                'The pipeline preserves product identity from your uploaded photo: shape, color and material are held as references across scenes, and the logo is composited pixel-exact. Color is also the one thing worth checking by eye, because shade accuracy is the most scrutinized detail in this category.',
            ],
        },
        {
            question: 'Do I need to label AI-generated images on Amazon?',
            answer: [
                'Since July 2026, Amazon requires IPTC tagging for listing images and A+ content that contain photorealistic AI-generated people. Product-only images are outside the rule. Images with a generated model carry the requirement, and the disclosure is your responsibility.',
            ],
        },
        {
            question: 'Are the models real people?',
            answer: [
                'No. When a scene needs a person, TailoredAd casts a fictional model and generates the face for that batch. Real faces are never composited, which removes likeness risk and keeps the workflow consistent with marketplace disclosure rules.',
            ],
        },
        {
            question: 'Can AI write my ingredient claims?',
            answer: [
                'It should not, and the pipeline does not try. Claims are legal statements about a product people apply to their skin. The tool composites the type you approve; the words come from the brand, ideally with a compliance check.',
            ],
        },
        {
            question: 'Does this replace my product photographer?',
            answer: [
                'For hero packshots and texture shots, no. For the variants around them, seasonal scenes, promotion sets and channel sizes, generated batches cover the volume a shoot schedule cannot. Most brands run both.',
            ],
        },
        {
            question: 'How is billing calculated?',
            answer: [
                'You pay for the images you generate, not downloads. Every batch is quality-gated. Failures are on us, and unused images never expire.',
            ],
        },
    ],

    ctaLabel: 'Create your first ad',
    relatedSlugs: ['best-ai-ad-tools', 'ecommerce-ad-creative'],
};
