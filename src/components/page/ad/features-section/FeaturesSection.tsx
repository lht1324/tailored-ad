'use client'

import { Type, Layers, Maximize2, Sparkles, RefreshCw, BadgeCheck } from 'lucide-react';
import { ReactNode } from 'react';
import Reveal from "@/components/page/ad/Reveal";

interface FeatureCardProps {
    icon: ReactNode;
    title: string;
    description: ReactNode;
    className?: string;
    dark?: boolean;
    sticker?: ReactNode;
    children?: ReactNode;
}

function FeatureCard({ icon, title, description, className = '', dark = false, sticker, children }: FeatureCardProps) {
    return (
        <div className={`relative flex h-full flex-col rounded-[1.5rem] border p-8 md:p-9 ${
            dark
                ? 'border-accent bg-accent shadow-[0_30px_80px_-30px_rgba(239,43,112,0.55)]'
                : 'border-hairline bg-surface shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]'
        } ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                    dark ? 'border-canvas/30 text-canvas' : 'border-hairline text-accent'
                }`}>
                    {icon}
                </div>
                {sticker}
            </div>
            <h3 className={`mt-6 text-xl font-semibold tracking-tight ${dark ? 'text-canvas' : 'text-text1'}`}>
                {title}
            </h3>
            <div className={`mt-3 flex-1 text-[15px] leading-relaxed ${dark ? 'text-canvas/85' : 'text-text2'}`}>
                {description}
            </div>
            {children}
        </div>
    );
}

function Stamp({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <span className={`inline-block rounded-[6px] border-2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${className}`}>
            {children}
        </span>
    );
}

const FORMATS = ['1:1', '4:5', '9:16', '16:9', 'Story', 'Banner'];

export default function FeaturesSection() {
    return (
        <section className="px-4 py-24 md:py-32">
            <div className="mx-auto max-w-6xl">
                <Reveal>
                    <div className="flex flex-wrap items-end justify-between gap-6">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                                Built around the one thing that matters: how it looks.
                            </h2>
                            <p className="mt-5 text-[17px] leading-relaxed text-text2">
                                Image generation is cheap. So we spend it where others can't — on quality, not corners.
                            </p>
                        </div>
                        <span className="-rotate-[3deg] rounded-[8px] border-2 border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                            Feature set / 6 items
                        </span>
                    </div>
                </Reveal>
                <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-6">
                    <Reveal delay={0.05} className="md:col-span-4 rotate-[0.3deg]">
                        <FeatureCard
                            icon={<Sparkles size={18} strokeWidth={1.5} />}
                            title="Harnessed generation"
                            description={
                                <>
                                    Each image is generated in every format you select and passed through a quality gate. You see the best one or two — never the experiments. Sampling is on us, because a batch of images costs cents.
                                </>
                            }
                        />
                    </Reveal>
                    <Reveal delay={0.1} className="md:col-span-2 -rotate-[0.6deg] md:translate-y-6">
                        <FeatureCard
                            icon={<Type size={18} strokeWidth={1.5} />}
                            title="Deterministic type"
                            description={
                                <>
                                    Headlines, CTA, and logo are composited pixel-exact.{' '}
                                    <span className="rounded-[4px] bg-accent/15 px-1.5 py-0.5 font-semibold text-text1">
                                        No AI letter artifacts,
                                    </span>{' '}
                                    no typos, no brand font drift.
                                </>
                            }
                            sticker={
                                <Stamp className="-rotate-[5deg] border-hairline text-text2">0 typos</Stamp>
                            }
                        />
                    </Reveal>
                    <Reveal delay={0.05} className="md:col-span-2 -rotate-[1deg] md:translate-y-4">
                        <FeatureCard
                            dark
                            icon={<Layers size={18} strokeWidth={1.5} />}
                            title="Multi-reference compositing"
                            description={
                                <>
                                    Your product and logo stay consistent across every scene — the same bottle, the same colors, everywhere.
                                </>
                            }
                            sticker={
                                <Stamp className="rotate-[4deg] border-canvas/40 text-canvas">same SKU ✓</Stamp>
                            }
                        />
                    </Reveal>
                    <Reveal delay={0.1} className="md:col-span-4 rotate-[0.4deg]">
                        <FeatureCard
                            icon={<Maximize2 size={18} strokeWidth={1.5} />}
                            title="One layout, every format"
                            description={
                                <>
                                    Design once, export everywhere. Each ad is rendered deterministically into the sizes your ad platforms demand.
                                </>
                            }
                        >
                            <div className="mt-8 flex flex-wrap gap-2.5">
                                {FORMATS.map((format, index) => (
                                    <span
                                        key={format}
                                        className={`rounded-[4px] border border-hairline bg-canvas px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text2 ${
                                            index % 2 === 0 ? 'rotate-[1.5deg]' : '-rotate-[1.5deg]'
                                        }`}
                                    >
                                        {format}
                                    </span>
                                ))}
                            </div>
                        </FeatureCard>
                    </Reveal>
                    <Reveal delay={0.05} className="md:col-span-2 -rotate-[0.5deg]">
                        <FeatureCard
                            icon={<RefreshCw size={18} strokeWidth={1.5} />}
                            title="Unlimited re-renders"
                            description={
                                <>
                                    Downloads and re-renders never cost extra. Tweak a headline, export again — same price, forever.
                                </>
                            }
                            sticker={
                                <Stamp className="-rotate-[4deg] border-accent/60 text-accent">∞ unlimited</Stamp>
                            }
                        />
                    </Reveal>
                    <Reveal delay={0.1} className="md:col-span-2 rotate-[0.4deg] md:translate-y-3">
                        <FeatureCard
                            icon={<BadgeCheck size={18} strokeWidth={1.5} />}
                            title="Quality-gated batches"
                            description={
                                <>
                                    Every batch is a set of candidates filtered by our gate. The failures are on us — you only pay for what we'd approve.
                                </>
                            }
                            sticker={
                                <Stamp className="rotate-[3deg] border-hairline text-text2">QC passed</Stamp>
                            }
                        />
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
