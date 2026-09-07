'use client'

import { Check } from 'lucide-react';
import Reveal from "@/components/page/ad/Reveal";

interface Plan {
    name: string;
    price: number;
    originalPrice?: number;
    images: string;
    perImage: string;
    highlighted?: boolean;
    className?: string;
    features: string[];
}

const PLANS: Plan[] = [
    {
        name: 'Starter',
        price: 9,
        images: '100 images / month',
        perImage: '$0.090 / image',
        highlighted: true,
        className: 'md:translate-y-6',
        features: [
            'Quality-gated 4-candidate batches',
            'All sizes: 1:1, 4:5, 9:16, banner',
            'Unlimited downloads & re-renders',
            'Unused images roll over',
            'Deterministic type & logo',
        ],
    },
    {
        name: 'Growth',
        price: 39,
        originalPrice: 49,
        images: '500 images / month',
        perImage: '$0.078 / image',
        className: '-rotate-[0.5deg] md:translate-y-10',
        features: [
            'Everything in Starter',
            'Batch generation up to 16 candidates',
            'Multi-reference compositing',
        ],
    },
    {
        name: 'Pro',
        price: 69,
        originalPrice: 99,
        images: '1,000 images / month',
        perImage: '$0.069 / image',
        className: 'rotate-[0.5deg] md:translate-y-8',
        features: [
            'Everything in Growth',
            '1,000 images to cover the season',
            'Agency-friendly volume',
        ],
    },
];

function PricingCard({ plan }: { plan: Plan }) {
    const dark = !!plan.highlighted;
    return (
        <div
            className={`relative flex h-full flex-col rounded-[1.5rem] border p-8 md:p-9 ${
                dark
                    ? 'border-accent bg-accent shadow-[0_36px_90px_-32px_rgba(239,43,112,0.6)]'
                    : 'border-hairline bg-surface shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]'
            }`}
        >
            {dark && (
                <span className="absolute -top-4 left-8 z-10 -rotate-[3deg] rounded-full border-2 border-accent/50 bg-canvas px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                    Most popular
                </span>
            )}
            <h3 className={`text-[15px] font-semibold tracking-tight ${dark ? 'text-canvas' : 'text-text1'}`}>
                {plan.name}
            </h3>
            <div className={`mt-6 flex items-baseline gap-1.5 ${dark ? 'text-canvas' : 'text-text1'}`}>
                {plan.originalPrice && (
                    <span className={`text-5xl font-medium tracking-tight line-through ${dark ? 'text-canvas/50' : 'text-text2/60'}`}>
                        ${plan.originalPrice}
                    </span>
                )}
                <span className="text-5xl font-bold tracking-tight">
                    ${plan.price}
                </span>
                <span className={`text-[15px] font-medium ${dark ? 'text-canvas/75' : 'text-text2'}`}>/ mo</span>
            </div>
            <p className={`mt-4 font-mono text-[11px] uppercase tracking-[0.18em] ${dark ? 'text-canvas/75' : 'text-text2'}`}>
                {plan.images}
            </p>
            <p className={`mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] ${dark ? 'text-canvas' : 'text-accent'}`}>
                {plan.perImage}
            </p>
            <ul className="mt-8 flex-1 space-y-3.5">
                {plan.features.map((feature) => {
                    const unlimited = feature.includes('Unlimited downloads');
                    return (
                        <li
                            key={feature}
                            className={`flex items-start gap-3 text-[14px] leading-snug ${
                                dark ? 'text-canvas/85' : 'text-text2'
                            } ${unlimited ? (dark ? 'font-semibold text-canvas' : 'font-semibold text-text1') : ''}`}
                        >
                            <Check size={15} strokeWidth={2} className={`mt-0.5 shrink-0 ${dark ? 'text-canvas' : 'text-accent'}`} />
                            {feature}
                        </li>
                    );
                })}
            </ul>
            <a
                href="mailto:support@shortreal.ai?subject=Early%20access%20request"
                className={`mt-10 inline-flex items-center justify-center rounded-full py-3.5 text-[14px] font-semibold transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    dark ? 'bg-canvas text-text1' : 'bg-text1 text-canvas'
                }`}
            >
                Get early access
            </a>
        </div>
    );
}

export default function PricingSection() {
    return (
        <section id="pricing" className="scroll-mt-24 border-t border-hairline bg-surface/40 px-4 py-24 md:py-32">
            <div className="mx-auto max-w-6xl">
                <Reveal>
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                            Simple pricing, honest costs.
                        </h2>
                        <p className="mt-5 text-[17px] leading-relaxed text-text2">
                            You pay for generation batches, not downloads. Every batch is quality-gated — the failures are on us.
                        </p>
                    </div>
                </Reveal>
                <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {PLANS.map((plan, index) => (
                        <Reveal key={plan.name} delay={index * 0.08} className={plan.className}>
                            <PricingCard plan={plan} />
                        </Reveal>
                    ))}
                </div>
                <Reveal delay={0.1}>
                    <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] leading-relaxed text-text2">
                        Plans bill monthly. Image counts are matched to current model pricing — we always honor the count we show you today, and we'll tell you before anything changes.
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
