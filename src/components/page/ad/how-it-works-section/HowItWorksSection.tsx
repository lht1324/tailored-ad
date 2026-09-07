'use client'

import { ReactNode } from 'react';
import Reveal from "@/components/page/ad/Reveal";

interface Step {
    number: string;
    label: string;
    title: string;
    description: string;
    className: string;
    sticker?: ReactNode;
}

function Arrow() {
    return (
        <svg
            aria-hidden="true"
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            className="text-accent"
        >
            <path
                d="M4 5c5 4 12 14 20 13"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
            />
            <path
                d="M24 12l1 6-6-1"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

const STEPS: Step[] = [
    {
        number: '01',
        label: 'Assets',
        title: 'Upload your assets',
        description: 'Drop in product photos, your logo, or a portrait. A background alone is enough to start — bring more to match your brand.',
        className: 'md:col-span-7 rotate-[0.4deg]',
        sticker: (
            <span className="rotate-[3deg] rounded-[6px] border border-dashed border-hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                Drop: JPG · PNG · WEBP
            </span>
        ),
    },
    {
        number: '02',
        label: 'Scenes',
        title: 'Generate the scene',
        description: 'We prompt the model with ad-theory-built templates. Candidates are generated in a batch and quality-gated — you only see the best.',
        className: 'md:col-span-5 -rotate-[0.7deg] md:translate-y-8',
        sticker: (
            <span className="-rotate-[2deg] rounded-full border-2 border-accent/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                batch ×4 → best wins
            </span>
        ),
    },
    {
        number: '03',
        label: 'Composite',
        title: 'Composite your product',
        description: 'Your product is painted into the scene with matching light and shadow. One batch, one credit — failures cost you nothing extra.',
        className: 'md:col-span-6 rotate-[0.5deg]',
        sticker: (
            <span className="rotate-[2deg] rounded-full border border-hairline px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                1 batch = 1 credit
            </span>
        ),
    },
    {
        number: '04',
        label: 'Layout',
        title: 'AI designs the layout',
        description: 'A layout model places headline, CTA, and logo. Then we render them deterministically — pixel-exact type, never AI text artifacts.',
        className: 'md:col-span-6 -rotate-[0.5deg] md:translate-y-4',
        sticker: (
            <span className="-rotate-[3deg] rounded-[6px] border-2 border-hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                pixel-exact type ✓
            </span>
        ),
    },
    {
        number: '05',
        label: 'Export',
        title: 'Export every size',
        description: 'Download 1:1, 4:5, 9:16, banner, and story variants from the same layout. Downloads and re-renders are unlimited.',
        className: 'md:col-span-8 rotate-[0.3deg]',
        sticker: (
            <span className="rotate-[4deg] rounded-full bg-accent px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-canvas shadow-[0_10px_30px_-10px_rgba(239,43,112,0.6)]">
                ∞ unlimited downloads
            </span>
        ),
    },
];

function StepCard({ step, arrow }: { step: Step; arrow?: boolean }) {
    return (
        <div className="relative h-full">
            <span
                aria-hidden="true"
                className="absolute -top-4 left-8 z-10 inline-block -rotate-[3deg] rounded-full border-2 border-accent/50 bg-canvas px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent"
            >
                Step {step.number}
            </span>
            <div className="flex h-full flex-col rounded-[1.25rem] border border-hairline bg-surface p-8 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] md:p-9">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                        {step.number} — {step.label}
                    </span>
                    {step.sticker}
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-text1">
                    {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-text2">
                    {step.description}
                </p>
            </div>
            {arrow && (
                <div
                    aria-hidden="true"
                    className="absolute -bottom-8 -right-3 z-10 hidden -rotate-12 md:block"
                >
                    <Arrow />
                </div>
            )}
        </div>
    );
}

export default function HowItWorksSection() {
    return (
        <section
            id="workflow"
            className="relative scroll-mt-24 overflow-hidden border-y border-hairline bg-surface/40 px-4 py-24 md:py-32"
            style={{
                backgroundImage:
                    'linear-gradient(to right, var(--ad-hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--ad-hairline) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
                backgroundPosition: 'center',
            }}
        >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-canvas via-transparent to-canvas" />
            <div className="relative mx-auto max-w-6xl">
                <Reveal>
                    <div className="flex flex-wrap items-end justify-between gap-6">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                                From product photo to ready-to-run ad.
                            </h2>
                            <p className="mt-5 text-[17px] leading-relaxed text-text2">
                                Five steps, most of them handled for you. The AI worries about the image — we guarantee the type.
                            </p>
                        </div>
                        <span className="rotate-[2deg] rounded-[8px] border-2 border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                            Workflow / v2.4
                        </span>
                    </div>
                </Reveal>
                <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
                    {STEPS.map((step, index) => (
                        <Reveal key={step.number} delay={index * 0.06} className={step.className}>
                            <StepCard step={step} arrow={index !== STEPS.length - 1} />
                        </Reveal>
                    ))}
                    <Reveal delay={0.3} className="hidden h-full md:col-span-4 md:block">
                        <div className="flex h-full -rotate-[4deg] flex-col rounded-[10px] border border-accent/30 bg-accent/10 p-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                                Side note
                            </p>
                            <p className="mt-2 text-[13px] leading-relaxed text-text2">
                                Every render is deterministic — what you preview is exactly what you download. No surprises.
                            </p>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
