'use client';

import { useCallback } from 'react';
import { fontMap } from "@/lib/fonts";
import { estimateWrappedLines } from "@/lib/textMeasure";
import type { AdDesignLayout } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

interface ElementPopoverProps {
    design: AdDesignLayout;
    element: 'headline' | 'cta';
    headlineText: string;
    fontFamily: string | null;
    fontWeight: number | null;
    aspectRatio: number;
    onChangeDesign: (next: AdDesignLayout) => void;
}

function SliderRow({ label, value, display, min, max, step, onChange }: {
    label: string;
    value: number;
    display: string;
    min: number;
    max: number;
    step: number;
    onChange: (next: number) => void;
}) {
    const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value));
    }, [onChange]);
    return (
        <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] font-medium text-text2">
                {label}
                <span className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-text1">{display}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onInputChange}
                className="h-7 w-full accent-accent"
            />
        </label>
    );
}

function familyStackOf(fontFamily: string | null): string {
    const hit = fontFamily ? (fontMap as Record<string, { style: { fontFamily: string } }>)[fontFamily] : undefined;
    return hit ? hit.style.fontFamily : 'sans-serif';
}

function headlineYMax(args: { text: string; fontSizePct: number; maxWidth: number; familyStack: string; weight: number; aspectRatio: number }): number {
    const H = 1000;
    const W = H * args.aspectRatio;
    const fontPx = (args.fontSizePct / 100) * H;
    const boxPx = (args.maxWidth / 100) * W;
    const lines = estimateWrappedLines(args.text, `${args.weight} ${fontPx}px ${args.familyStack}`, boxPx);
    return Math.max(0, 100 - args.fontSizePct * 1.05 * lines);
}

function ElementPopover({ design, element, headlineText, fontFamily, fontWeight, aspectRatio, onChangeDesign }: ElementPopoverProps) {
    const headline = design.headline;
    const cta = design.cta;
    const stack = familyStackOf(fontFamily);
    const weight = typeof fontWeight === 'number' ? fontWeight : 700;

    // 도크 배치 — 위치 고정이라 앵커/뒤집기 불필요

    return (
        <div
            role="dialog"
            aria-label={element === 'headline' ? 'Headline position' : 'CTA position'}
            className="w-full rounded-2xl border border-hairline bg-surface p-4 shadow-xl shadow-black/15"
        >
            <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-text1">{element === 'headline' ? 'Headline' : 'CTA'}</span>
            </div>
            <div className="space-y-2">
                {element === 'headline' && headline ? (
                    <>
                        <SliderRow label="Position X" value={headline.x} display={`${headline.x}`} min={0} max={Math.max(headline.x, Math.max(0, 100 - headline.maxWidth))} step={1}
                            onChange={(v) => onChangeDesign({ ...design, headline: { ...headline, x: v } })} />
                        <SliderRow label="Position Y" value={headline.y} display={`${headline.y}`} min={0} max={Math.max(headline.y, Math.max(0, headlineYMax({ text: headlineText, fontSizePct: headline.fontSizePct, maxWidth: headline.maxWidth, familyStack: stack, weight, aspectRatio })))} step={1}
                            onChange={(v) => onChangeDesign({ ...design, headline: { ...headline, y: v } })} />
                        <SliderRow label="Max width" value={headline.maxWidth} display={`${headline.maxWidth}%`} min={10} max={100} step={1}
                            onChange={(v) => {
                                const x = Math.min(headline.x, Math.max(0, 100 - v));
                                const y = Math.min(headline.y, Math.max(0, headlineYMax({ text: headlineText, fontSizePct: headline.fontSizePct, maxWidth: v, familyStack: stack, weight, aspectRatio })));
                                onChangeDesign({ ...design, headline: { ...headline, maxWidth: v, x, y } });
                            }} />
                        <SliderRow label="Size" value={headline.fontSizePct} display={`${headline.fontSizePct.toFixed(1)}`} min={2} max={6} step={0.1}
                            onChange={(v) => {
                                const size = Math.round(v * 10) / 10;
                                const y = Math.min(headline.y, Math.max(0, headlineYMax({ text: headlineText, fontSizePct: size, maxWidth: headline.maxWidth, familyStack: stack, weight, aspectRatio })));
                                onChangeDesign({ ...design, headline: { ...headline, fontSizePct: size, y } });
                            }} />
                    </>
                ) : cta ? (
                    <>
                        <SliderRow label="Position X" value={cta.x} display={`${cta.x}`} min={0} max={Math.max(cta.x, Math.max(0, 100 - cta.widthPct))} step={1}
                            onChange={(v) => onChangeDesign({ ...design, cta: { ...cta, x: v } })} />
                        <SliderRow label="Position Y" value={cta.y} display={`${cta.y}`} min={0} max={Math.max(cta.y, Math.max(0, 100 - cta.fontSizePct * 2.4))} step={1}
                            onChange={(v) => onChangeDesign({ ...design, cta: { ...cta, y: v } })} />
                        <SliderRow label="Size" value={cta.fontSizePct} display={`${cta.fontSizePct.toFixed(1)}`} min={1} max={4} step={0.1}
                            onChange={(v) => {
                                const size = Math.round(v * 10) / 10;
                                const y = Math.min(cta.y, Math.max(0, 100 - size * 2.4));
                                onChangeDesign({ ...design, cta: { ...cta, fontSizePct: size, y } });
                            }} />
                    </>
                ) : null}
            </div>
        </div>
    );
}

export default ElementPopover;
