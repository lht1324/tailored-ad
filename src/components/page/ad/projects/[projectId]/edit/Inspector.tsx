'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Check, ChevronDown, Pipette } from 'lucide-react';
import { HexColorPicker } from "react-colorful";
import FontPicker from "@/components/page/ad/projects/[projectId]/edit/FontPicker";
import { fontMap } from "@/lib/fonts";
import FONT_FAMILY_LIST from "@/lib/FontFamilyList";
import { normalizeHeadlineColor, defaultScrimStrength } from "@/lib/colorUtils";
import { estimateWrappedLines } from "@/lib/textMeasure";
import type { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";

export interface EditorCopy {
    headline: string | null;
    cta: string | null;
    fontFamily?: string | null;
    fontWeight?: number | null;
    headlineColor?: string | null;
}

interface InspectorProps {
    design: AdDesignLayout;
    copy: EditorCopy;
    score: number | null;
    disabled: boolean;
    aspectRatio: number;
    brandPalette: string[] | null;
    onChangeDesign: (next: AdDesignLayout) => void;
    onChangeCopy: (next: EditorCopy) => void;
}

type HeadlineAlign = 'left' | 'center' | 'right';

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text2">
            {children}
        </h3>
    );
}

function Collapsible({ title, summary, defaultOpen, headerExtra, children }: {
    title: string;
    summary?: string;
    defaultOpen?: boolean;
    headerExtra?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen ?? true);
    const onClickToggle = useCallback(() => {
        setOpen((v) => !v);
    }, []);
    return (
        <section>
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={onClickToggle}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5 text-left"
                >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas text-text2">
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-text1">{title}</span>
                        {summary && <span className="mt-0.5 block truncate text-[11px] text-text2">{summary}</span>}
                    </span>
                </button>
                {headerExtra}
            </div>
            {open && <div className="mt-3 space-y-3">{children}</div>}
        </section>
    );
}

function truncateSummary(text: string | null | undefined, max: number): string {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

function SliderRow({ label, value, display, min, max, step, disabled, onChange }: {
    label: string;
    value: number;
    display: string;
    min: number;
    max: number;
    step: number;
    disabled: boolean;
    onChange: (next: number) => void;
}) {
    const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value));
    }, [onChange]);
    return (
        <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-text2">
                {label}
                <span className="rounded-md bg-canvas px-2 py-0.5 font-mono text-[11px] text-text1">{display}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={onInputChange}
                className="h-8 w-full accent-accent disabled:opacity-40"
            />
        </label>
    );
}

// y 상한 추정 — 기준 해상도(H=1000)의 비례 지오메트리라 절대 크기와 무관
function computeHeadlineYMax(args: { text: string; fontSizePct: number; maxWidth: number; familyStack: string; weight: number; aspectRatio: number }): number {
    const H = 1000;
    const W = H * args.aspectRatio;
    const fontPx = (args.fontSizePct / 100) * H;
    const boxPx = (args.maxWidth / 100) * W;
    const lines = estimateWrappedLines(args.text, `${args.weight} ${fontPx}px ${args.familyStack}`, boxPx);
    return Math.max(0, 100 - args.fontSizePct * 1.05 * lines);
}

function Inspector({ design, copy, score, disabled, aspectRatio, brandPalette, onChangeDesign, onChangeCopy }: InspectorProps) {
    const headline = design.headline;
    const cta = design.cta;
    const [customOpen, setCustomOpen] = useState(false);

    const availableWeights = useMemo(() => {
        const entry = FONT_FAMILY_LIST.find((f) => f.name === copy.fontFamily);
        const weights = entry ? entry.weightList.map((v) => v.weight) : [400];
        return weights.length > 0 ? weights : [400];
    }, [copy.fontFamily]);

    const currentFamilyStack = useMemo(() => {
        const raw = copy.fontFamily as string | undefined;
        const hit = raw ? (fontMap as Record<string, { style: { fontFamily: string } }>)[raw] : undefined;
        return hit ? hit.style.fontFamily : 'sans-serif';
    }, [copy.fontFamily]);

    const currentWeight = typeof copy.fontWeight === 'number' ? copy.fontWeight : 700;

    const yMaxHeadline = useMemo(() => {
        if (!headline) return 100;
        return computeHeadlineYMax({
            text: copy.headline ?? '',
            fontSizePct: headline.fontSizePct,
            maxWidth: headline.maxWidth,
            familyStack: currentFamilyStack,
            weight: currentWeight,
            aspectRatio,
        });
    }, [headline, copy.headline, currentFamilyStack, currentWeight, aspectRatio]);

    const clampYFor = useCallback((y: number, over: { text: string; fontSizePct: number; maxWidth: number }): number => {
        const max = computeHeadlineYMax({
            text: over.text,
            fontSizePct: over.fontSizePct,
            maxWidth: over.maxWidth,
            familyStack: currentFamilyStack,
            weight: currentWeight,
            aspectRatio,
        });
        return Math.min(y, Math.max(0, max));
    }, [currentFamilyStack, currentWeight, aspectRatio]);

    const onClickAlign = useCallback((align: HeadlineAlign) => {
        if (!design.headline) return;
        onChangeDesign({ ...design, headline: { ...design.headline, align } });
    }, [design, onChangeDesign]);

    const onClickHeadlineColor = useCallback((color: string) => {
        onChangeCopy({ ...copy, headlineColor: color });
    }, [copy, onChangeCopy]);

    const currentHex = normalizeHeadlineColor(copy.headlineColor);
    const onClickCustomToggle = useCallback(() => {
        setCustomOpen((v) => !v);
    }, []);

    const onClickAddHeadline = useCallback(() => {
        onChangeDesign({
            ...design,
            headline: {
                text: copy.headline ?? '',
                x: 6,
                y: 6,
                maxWidth: 68,
                align: 'left',
                fontSizePct: 4,
            } as AdDesignLayout['headline'],
        });
    }, [design, copy.headline, onChangeDesign]);

    const onClickRemoveHeadline = useCallback(() => {
        onChangeDesign({ ...design, headline: null });
    }, [design, onChangeDesign]);

    const onClickToggleCta = useCallback(() => {
        if (design.cta) {
            onChangeDesign({ ...design, cta: null });
        } else {
            onChangeDesign({
                ...design,
                cta: {
                    text: copy.cta ?? 'Shop Now',
                    x: 8,
                    y: 80,
                    widthPct: 30,
                    fontSizePct: 2.4,
                } as AdDesignLayout['cta'],
            });
        }
    }, [design, copy.cta, onChangeDesign]);

    const onClickToggleScrim = useCallback(() => {
        onChangeDesign({ ...design, scrim: !design.scrim });
    }, [design, onChangeDesign]);

    const onChangeFontName = useCallback((name: string) => {
        const entry = FONT_FAMILY_LIST.find((f) => f.name === name);
        const weights = entry ? entry.weightList.map((v) => v.weight) : [400];
        const fallback = weights.includes(400) ? 400 : weights[0] ?? 400;
        const nextCopy = { ...copy, fontFamily: name, fontWeight: fallback };
        onChangeCopy(nextCopy);
        if (headline) {
            const hit = (fontMap as Record<string, { style: { fontFamily: string } }>)[name];
            const yMax = computeHeadlineYMax({
                text: nextCopy.headline ?? '',
                fontSizePct: headline.fontSizePct,
                maxWidth: headline.maxWidth,
                familyStack: hit ? hit.style.fontFamily : 'sans-serif',
                weight: fallback,
                aspectRatio,
            });
            const y = Math.min(headline.y, Math.max(0, yMax));
            if (y !== headline.y) onChangeDesign({ ...design, headline: { ...headline, y } });
        }
    }, [copy, headline, design, aspectRatio, onChangeCopy, onChangeDesign]);

    const onClickWeight = useCallback((weight: number) => {
        onChangeCopy({ ...copy, fontWeight: weight });
        if (headline) {
            const yMax = computeHeadlineYMax({
                text: copy.headline ?? '',
                fontSizePct: headline.fontSizePct,
                maxWidth: headline.maxWidth,
                familyStack: currentFamilyStack,
                weight,
                aspectRatio,
            });
            const y = Math.min(headline.y, Math.max(0, yMax));
            if (y !== headline.y) onChangeDesign({ ...design, headline: { ...headline, y } });
        }
    }, [copy, headline, design, currentFamilyStack, aspectRatio, onChangeCopy, onChangeDesign]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <SectionTitle>Quality</SectionTitle>
                <span className="font-mono text-[11px] text-text2">
                    {score != null ? `${score.toFixed(1)} / 10` : 'no score'}
                </span>
            </div>

            {disabled && (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[12px] leading-relaxed text-amber-700 dark:text-amber-300">
                    Batch is still running. Editing unlocks after completion.
                </p>
            )}

            <fieldset disabled={disabled} className="min-w-0 space-y-6 disabled:opacity-60">
                {/* Headline */}
                <Collapsible
                    title="Headline"
                    summary={headline ? `${truncateSummary(copy.headline, 22)} · ${copy.fontFamily ?? ''} ${copy.fontWeight ?? ''}`.trim() : 'No headline'}
                    defaultOpen
                    headerExtra={headline ? (
                        <button type="button" onClick={onClickRemoveHeadline} className="shrink-0 text-[12px] font-medium text-text2 hover:text-[#F87171]">
                            Remove
                        </button>
                    ) : (
                        <button type="button" onClick={onClickAddHeadline} className="shrink-0 text-[12px] font-medium text-accent hover:opacity-80">
                            Add headline
                        </button>
                    )}
                >
                    {headline ? (
                        <>
                            <label className="block">
                                <span className="mb-1.5 block text-[12px] font-medium text-text2">Text</span>
                                <textarea
                                    value={copy.headline ?? ''}
                                    rows={2}
                                    onChange={(e) => {
                                        const text = e.target.value;
                                        onChangeCopy({ ...copy, headline: text });
                                        const y = clampYFor(headline.y, { text, fontSizePct: headline.fontSizePct, maxWidth: headline.maxWidth });
                                        if (y !== headline.y) onChangeDesign({ ...design, headline: { ...headline, y } });
                                    }}
                                    className="w-full resize-none rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-[13px] text-text1 outline-none placeholder:text-text2/50 focus:border-accent"
                                />
                            </label>
                            <SliderRow label="Position X" value={headline.x} display={`${headline.x}`} min={0} max={Math.max(headline.x, Math.max(0, 100 - headline.maxWidth))} step={1} disabled={disabled}
                                onChange={(v) => onChangeDesign({ ...design, headline: { ...headline, x: v } })} />
                            <SliderRow label="Position Y" value={headline.y} display={`${headline.y}`} min={0} max={Math.max(headline.y, Math.max(0, yMaxHeadline))} step={1} disabled={disabled}
                                onChange={(v) => onChangeDesign({ ...design, headline: { ...headline, y: v } })} />
                            <SliderRow label="Max width" value={headline.maxWidth} display={`${headline.maxWidth}%`} min={10} max={100} step={1} disabled={disabled}
                                onChange={(v) => {
                                    const x = Math.min(headline.x, Math.max(0, 100 - v));
                                    const y = clampYFor(headline.y, { text: copy.headline ?? '', fontSizePct: headline.fontSizePct, maxWidth: v });
                                    onChangeDesign({ ...design, headline: { ...headline, maxWidth: v, x, y } });
                                }} />
                            <SliderRow label="Size" value={headline.fontSizePct} display={`${headline.fontSizePct.toFixed(1)}`} min={2} max={6} step={0.1} disabled={disabled}
                                onChange={(v) => {
                                    const size = Math.round(v * 10) / 10;
                                    const y = clampYFor(headline.y, { text: copy.headline ?? '', fontSizePct: size, maxWidth: headline.maxWidth });
                                    onChangeDesign({ ...design, headline: { ...headline, fontSizePct: size, y } });
                                }} />
                            <div>
                                <span className="mb-1.5 block text-[12px] font-medium text-text2">Align</span>
                                <div className="grid grid-cols-3 gap-1 rounded-xl border border-hairline bg-canvas p-1">
                                    {(['left', 'center', 'right'] as HeadlineAlign[]).map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => onClickAlign(opt)}
                                            aria-pressed={headline.align === opt}
                                            className={`rounded-lg px-3 py-2 text-[12px] font-medium capitalize transition-colors ${
                                                headline.align === opt ? 'bg-surface text-text1 shadow-sm' : 'text-text2 hover:text-text1'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <span className="mb-1.5 block text-[12px] font-medium text-text2">Font</span>
                                    <FontPicker value={copy.fontFamily ?? null} disabled={disabled} onChange={onChangeFontName} />
                                </div>
                                <div>
                                    <span className="mb-1.5 block text-[12px] font-medium text-text2">Weight</span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {availableWeights.map((w) => {
                                            const selected = (copy.fontWeight ?? 400) === w;
                                            return (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    onClick={() => onClickWeight(w)}
                                                    aria-pressed={selected}
                                                    className={`rounded-lg border px-2 py-2 text-center font-mono text-[12px] transition-colors ${
                                                        selected ? 'border-text1 bg-text1 text-canvas' : 'border-hairline bg-canvas text-text2 hover:text-text1'
                                                    }`}
                                                >
                                                    {w}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <span className="mb-1.5 block text-[12px] font-medium text-text2">Color</span>
                                <div className="flex flex-wrap items-center gap-2">
                                    {(['white', 'black'] as const).map((opt) => {
                                        const hex = opt === 'white' ? '#FFFFFF' : '#000000';
                                        const selected = currentHex === hex;
                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => onClickHeadlineColor(opt)}
                                                aria-pressed={selected}
                                                title={opt}
                                                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                                                    selected ? 'border-accent ring-2 ring-accent/30' : 'border-hairline hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: hex }}
                                            >
                                                {selected && <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />}
                                            </button>
                                        );
                                    })}
                                    {(brandPalette ?? []).map((hex) => {
                                        const upper = hex.toUpperCase();
                                        const selected = currentHex === upper;
                                        return (
                                            <button
                                                key={hex}
                                                type="button"
                                                onClick={() => onClickHeadlineColor(upper)}
                                                aria-pressed={selected}
                                                title={upper}
                                                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                                                    selected ? 'border-accent ring-2 ring-accent/30' : 'border-black/10 hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: hex }}
                                            >
                                                {selected && <Check className="h-3.5 w-3.5 text-white drop-shadow" strokeWidth={2.5} />}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={onClickCustomToggle}
                                        aria-expanded={customOpen}
                                        title="Custom color"
                                        className={`flex h-9 w-9 items-center justify-center rounded-full border border-dashed transition-all hover:scale-105 ${
                                            customOpen ? 'border-accent text-accent' : 'border-hairline text-text2'
                                        }`}
                                    >
                                        <Pipette className="h-4 w-4" strokeWidth={1.8} />
                                    </button>
                                </div>
                                {customOpen && (
                                    <div className="mt-3 space-y-3 rounded-xl border border-hairline bg-canvas p-3">
                                        <HexColorPicker color={currentHex} onChange={(c) => onClickHeadlineColor(c.toUpperCase())} style={{ width: '100%' }} />
                                        <label className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2">
                                            <span className="font-mono text-[12px] text-text2">#</span>
                                            <input
                                                type="text"
                                                value={currentHex.replace('#', '')}
                                                maxLength={6}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (/^[0-9A-Fa-f]{0,6}$/.test(val) && val.length === 6) {
                                                        onClickHeadlineColor(`#${val.toUpperCase()}`);
                                                    }
                                                }}
                                                className="w-full min-w-0 bg-transparent font-mono text-[12px] uppercase text-text1 outline-none"
                                            />
                                            <span className="h-5 w-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: currentHex }} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-[12px] text-text2">No headline on this asset.</p>
                    )}
                </Collapsible>

                {/* CTA */}
                <Collapsible
                    title="Call to action"
                    summary={cta ? truncateSummary(cta.text, 26) : 'Off'}
                    defaultOpen
                    headerExtra={(
                        <button
                            type="button"
                            onClick={onClickToggleCta}
                            aria-pressed={cta !== null}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${cta ? 'bg-accent' : 'bg-hairline'}`}
                        >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${cta ? 'left-[1.375rem]' : 'left-0.5'}`} />
                        </button>
                    )}
                >
                    {cta ? (
                        <>
                            <label className="block">
                                <span className="mb-1.5 block text-[12px] font-medium text-text2">Text</span>
                                <input
                                    type="text"
                                    value={cta.text}
                                    maxLength={60}
                                    onChange={(e) => {
                                        const text = e.target.value;
                                        onChangeDesign({ ...design, cta: { ...cta, text } });
                                        onChangeCopy({ ...copy, cta: text });
                                    }}
                                    className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-[13px] text-text1 outline-none placeholder:text-text2/50 focus:border-accent"
                                />
                            </label>
                            <SliderRow label="Position X" value={cta.x} display={`${cta.x}`} min={0} max={Math.max(cta.x, Math.max(0, 100 - cta.widthPct))} step={1} disabled={disabled}
                                onChange={(v) => onChangeDesign({ ...design, cta: { ...cta, x: v } })} />
                            <SliderRow label="Position Y" value={cta.y} display={`${cta.y}`} min={0} max={Math.max(cta.y, Math.max(0, 100 - cta.fontSizePct * 2.4))} step={1} disabled={disabled}
                                onChange={(v) => onChangeDesign({ ...design, cta: { ...cta, y: v } })} />
                            <SliderRow label="Size" value={cta.fontSizePct} display={`${cta.fontSizePct.toFixed(1)}`} min={1} max={4} step={0.1} disabled={disabled}
                                onChange={(v) => {
                                    const size = Math.round(v * 10) / 10;
                                    const y = Math.min(cta.y, Math.max(0, 100 - size * 2.4));
                                    onChangeDesign({ ...design, cta: { ...cta, fontSizePct: size, y } });
                                }} />
                        </>
                    ) : (
                        <p className="text-[12px] text-text2">No CTA pill on this asset.</p>
                    )}
                </Collapsible>

                {/* Scrim */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <SectionTitle>Scrim</SectionTitle>
                        <button
                            type="button"
                            onClick={onClickToggleScrim}
                            aria-pressed={design.scrim}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${design.scrim ? 'bg-accent' : 'bg-hairline'}`}
                        >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${design.scrim ? 'left-[1.375rem]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    {design.scrim && (
                        <SliderRow
                            label="Strength"
                            value={typeof design.scrimStrength === 'number' ? design.scrimStrength : defaultScrimStrength(copy.headlineColor)}
                            display={`${typeof design.scrimStrength === 'number' ? design.scrimStrength : defaultScrimStrength(copy.headlineColor)}%`}
                            min={0}
                            max={100}
                            step={1}
                            disabled={disabled}
                            onChange={(v) => onChangeDesign({ ...design, scrimStrength: v })}
                        />
                    )}
                </section>
            </fieldset>
        </div>
    );
}

export default memo(Inspector);
