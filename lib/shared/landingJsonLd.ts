/**
 * 랜딩 구조화 데이터 (JSON-LD) — 서버 전용 상수. page.tsx에서 script로 주입.
 *
 * 왜: AI 요약·검색 인용은 RAG라 페이지에서 기계 파싱 가능한 구조를 찾는다.
 * 정적 카피만으로는 "무엇을 파는 서비스인지·얼마인지"를 추론해야 해서 인용 정확도가 떨어진다.
 *
 * gotcha: 가격·문구는 FAQSection·PricingSection 카피와 이중 관리다.
 * 값 변경 시 양쪽을 같이 고칠 것 (단일 소스화는 Dodo 카탈로그 연동이 필요해 별도 과제).
 */

const FAQ_ITEMS: { question: string; answer: string[] }[] = [
    {
        question: 'How is billing calculated?',
        answer: ['You pay for the images you generate, not downloads. Every batch is quality-gated. Failures are on us.'],
    },
    {
        question: 'Does editing cost images?',
        answer: ['No. Editor tweaks and re-exports are free and unlimited. Only AI generation uses your balance.'],
    },
    {
        question: 'Do unused images expire?',
        answer: ['No. Images you paid for never expire. Not at the end of the billing period. Not after cancellation.'],
    },
    {
        question: 'Can I use my own product photos and logo?',
        answer: [
            'Yes. Upload a product photo and your logo. Both are composited into the generated scene with consistent lighting and shadows. Your logo stays pixel-exact.',
        ],
    },
    {
        question: 'Which ad sizes do you support?',
        answer: ['Every layout renders into the formats your ad platforms need: 1:1, 4:5, 9:16, 16:9, Story, and display banner variants. All from the same design.'],
    },
    {
        question: 'What does "doesn\'t look like AI stock" mean?',
        answer: [
            'We generate candidate batches and quality-gate them before you ever see them. Then we composite headline and logo deterministically instead of asking the model to paint them.',
            'The result is a controlled, brand-consistent look. Not a generic AI rendering.',
        ],
    },
    {
        question: 'Can I cancel anytime?',
        answer: ['Yes. Cancel anytime. Your remaining images stay usable.'],
    },
];

export const ORGANIZATION_JSON_LD = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TailoredAd',
    url: 'https://tailoredad.com',
    logo: 'https://tailoredad.com/logo/logo-512.png',
    description:
        'TailoredAd is an AI ad creative studio for growth teams without a designer. Brand-consistent ad stills from a product photo, with deterministic typography and logo placement.',
    email: 'support@tailoredad.com',
    sameAs: [],
} as const;

export const SOFTWARE_JSON_LD = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TailoredAd',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://tailoredad.com',
    description:
        'AI ad creative studio that turns a product photo into brand-consistent ad stills. Candidates are generated in quality-gated batches; only the best are shown, and only finished images consume the balance. Headlines and logos are composited deterministically, so type stays pixel-exact.',
    offers: [
        {
            '@type': 'Offer',
            name: 'Starter',
            price: '19',
            priceCurrency: 'USD',
            description: '100 images per month. First month $9.50.',
        },
        {
            '@type': 'Offer',
            name: 'Growth',
            price: '49',
            priceCurrency: 'USD',
            description: '500 images per month.',
        },
        {
            '@type': 'Offer',
            name: 'Pro',
            price: '99',
            priceCurrency: 'USD',
            description: '1,000 images per month.',
        },
    ],
    featureList: [
        'Quality-gated candidate batches',
        'Deterministic typography and logo compositing',
        'Multi-reference compositing for product consistency',
        '1:1, 4:5, 9:16, 16:9, Story and banner exports',
        'Per-finished-image billing',
        'Unused images never expire',
        'Unlimited downloads and free editing',
        '10 free trial images, no card required',
    ],
} as const;

export const FAQ_ITEMS_JSON_LD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer.join(' '),
        },
    })),
} as const;