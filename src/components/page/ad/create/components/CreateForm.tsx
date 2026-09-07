'use client'

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, Palette, Plus, X } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { AdAspectRatio, AdUploadedComponent } from "@/lib/api/client/ad/adClientAPI";
import { AD_ASPECT_RATIO_INFO, AD_CONCEPT_OPTIONS } from "@/lib/api/client/ad/adClientAPI";
import UploadZone from "@/components/page/ad/create/components/UploadZone";

// 한 줄 비율 박스 — 높이 고정 × 너비 비율, 한 줄로 압축해 한 화면 유지
const RATIO_FACTOR: Record<AdAspectRatio, number> = {
    '1:1': 1,
    '4:5': 4 / 5,
    '9:16': 9 / 16,
    '16:9': 16 / 9,
    '2:3': 2 / 3,
};

const RATIO_ORDER: AdAspectRatio[] = ['1:1', '4:5', '9:16', '16:9', '2:3'];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface CreateFormProps {
    product: AdUploadedComponent | null;
    person: AdUploadedComponent | null;
    brandLogo: AdUploadedComponent | null;
    onProductChange: (file: AdUploadedComponent | null) => void;
    onPersonChange: (file: AdUploadedComponent | null) => void;
    onBrandLogoChange: (file: AdUploadedComponent | null) => void;
    aspectRatios: AdAspectRatio[];
    conceptCount: number;
    ctaEnabled: boolean;
    brandPalette: string[] | null;
    onAspectRatiosChange: (ratios: AdAspectRatio[]) => void;
    onConceptCountChange: (count: number) => void;
    onCtaEnabledChange: (enabled: boolean) => void;
    onBrandPaletteChange: (palette: string[] | null) => void;
}

function CreateForm({
    product,
    person,
    brandLogo,
    onProductChange,
    onPersonChange,
    onBrandLogoChange,
    aspectRatios,
    conceptCount,
    ctaEnabled,
    brandPalette,
    onAspectRatiosChange,
    onConceptCountChange,
    onCtaEnabledChange,
    onBrandPaletteChange,
}: CreateFormProps) {
    const onClickRatio = useCallback(
        (ratio: AdAspectRatio) => {
            const selected = aspectRatios.includes(ratio);
            if (selected && aspectRatios.length === 1) {
                return;
            }
            onAspectRatiosChange(selected ? aspectRatios.filter((item) => item !== ratio) : [...aspectRatios, ratio]);
        },
        [aspectRatios, onAspectRatiosChange],
    );

    const onClickCount = useCallback((count: number) => {
        onConceptCountChange(count);
    }, [onConceptCountChange]);

    const onClickCta = useCallback((enabled: boolean) => {
        onCtaEnabledChange(enabled);
    }, [onCtaEnabledChange]);

    const [pickerColor, setPickerColor] = useState('#111111');
    const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);

    useEffect(() => {
        if (activePickerIndex === null) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // 드래그 중에는 팝오버 내부에서 mousedown이 일어나도 닫지 않음
            if (target.closest('[data-picker-popover]') || target.closest('[data-picker-trigger]')) return;
            setActivePickerIndex(null);
        };
        // mousedown 대신 click으로 닫아야 드래그(mousedown→mousemove→mouseup)가 끊기지 않음
        document.addEventListener('click', onDown);
        return () => document.removeEventListener('click', onDown);
    }, [activePickerIndex]);

    const onAddColor = useCallback(() => {
        const current = brandPalette ?? [];
        if (current.length >= 5) return;
        const next = [...current, pickerColor.toUpperCase()];
        onBrandPaletteChange(next);
        setActivePickerIndex(null);
    }, [brandPalette, pickerColor, onBrandPaletteChange]);

    const onRemoveColor = useCallback((index: number) => {
        const current = brandPalette ?? [];
        const next = current.filter((_, i) => i !== index);
        onBrandPaletteChange(next.length === 0 ? null : next);
        setActivePickerIndex(null);
    }, [brandPalette, onBrandPaletteChange]);

    const onChangeColor = useCallback((index: number, color: string) => {
        const current = brandPalette ?? [];
        const next = current.map((c, i) => (i === index ? color.toUpperCase() : c));
        onBrandPaletteChange(next);
    }, [brandPalette, onBrandPaletteChange]);

    // Where 한 줄이 가로로 벗어나지 않는 최대 높이 — (W - gaps) / sumFactors
    const whereRef = useRef<HTMLDivElement>(null);
    const [whereH, setWhereH] = useState(96);
    useEffect(() => {
        const el = whereRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = entry.contentRect.width;
                const maxFitH = Math.max(56, (w - 32) / 4.806);
                setWhereH((prev) => {
                    const next = Math.round(maxFitH);
                    return Math.abs(next - prev) < 1 ? prev : next;
                });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div className="flex flex-1 flex-col gap-4 min-h-0">
            {/* 2×2 bento — 남은 높이를 fr로 나눠 꽉 채움 */}
            <div className="grid flex-1 gap-4 lg:grid-cols-[1.7fr_1fr] lg:grid-rows-[1.15fr_1fr] min-h-0">
                {/* Subjects — 좌상 */}
                <section className="rounded-[1.5rem] border border-hairline bg-surface p-4 sm:p-5 flex flex-col min-h-0">
                    <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-[15px] font-semibold tracking-tight text-text1">Subjects</h3>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-text2">
                                Upload your product or person — the AI paints a different background for each creative.
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[10px] font-medium text-text2">
                            at least one
                        </span>
                    </div>

                    <div className="grid flex-1 gap-3 sm:grid-cols-3 sm:items-stretch min-h-0">
                        <div className="flex flex-col flex-1 min-h-0">
                            <UploadZone
                                label="Product"
                                tall
                                help="A clear product photo on a simple background. The AI keeps your product identical in every scene. JPG, PNG or WebP, up to 10 MB."
                                notePlaceholder="e.g. Show only the product, drop the background"
                                file={product}
                                onChange={onProductChange}
                            />
                        </div>

                        <div className="flex flex-col flex-1 min-h-0">
                            <UploadZone
                                label="Person"
                                tall
                                help="Optional — a well-lit portrait with the face clearly visible. JPG, PNG or WebP, up to 10 MB."
                                notePlaceholder="e.g. Keep the natural expression"
                                file={person}
                                onChange={onPersonChange}
                            />
                        </div>

                        <div className="flex flex-col flex-1 min-h-0">
                            <UploadZone
                                label="Brand logo"
                                tall
                                help="IMPORTANT — Transparent PNG only. Opaque white/black backgrounds will appear as a box on the ad and break contrast. This logo is placed as an overlay at the Vision-picked corner, not painted into the scene. Leave empty to skip logo (position recommendation will be skipped)."
                                file={brandLogo}
                                onChange={onBrandLogoChange}
                            />
                        </div>
                    </div>

                    {product && person && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/30 dark:bg-amber-950/20"
                        >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" strokeWidth={2} />
                            <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-200/90">
                                Combining a product and a person in one scene can reduce composite quality. Consider
                                running them as separate generations.
                            </p>
                        </motion.div>
                    )}
                </section>

                {/* How many — 우상, 1열 4행 세로형 — 남은 높이를 fr로 균등 분할 */}
                <section className="rounded-[1.5rem] border border-hairline bg-surface p-4 sm:p-5 flex flex-1 flex-col min-h-0">
                    <div className="mb-3 flex items-center justify-between shrink-0">
                        <h3 className="text-[14px] font-semibold tracking-tight text-text1">How many options?</h3>
                        <span className="text-[11px] text-text2">per batch</span>
                    </div>
                    <div className="grid flex-1 grid-cols-1 grid-rows-4 gap-2 min-h-0">
                        {AD_CONCEPT_OPTIONS.map((count) => (
                            <button
                                key={count}
                                type="button"
                                onClick={() => onClickCount(count)}
                                className={`relative flex items-center justify-between rounded-xl border px-4 py-2 text-left transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
                                    conceptCount === count
                                        ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(var(--accent),0.12)]'
                                        : 'border-hairline bg-canvas hover:border-text2/30 hover:bg-surface'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`text-[18px] font-bold leading-none tracking-tight ${conceptCount === count ? 'text-text1' : 'text-text2'}`}>
                                        {count}
                                    </span>
                                    <span className="text-[12px] text-text2">{count === 1 ? 'creative' : 'creatives'}</span>
                                    {count === 10 && (
                                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                                            Pro
                                        </span>
                                    )}
                                </div>
                                {conceptCount === count ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent border border-accent text-white">
                                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 shrink-0 text-[11px] leading-snug text-text2">
                        Each creative is generated in every format you select — backgrounds vary per creative.
                    </p>
                </section>

                {/* Where — 좌하, 높이 = Brand + gap + CTA (grid가 fr로 맞춤) */}
                <section className="rounded-[1.5rem] border border-hairline bg-surface px-4 sm:px-5 py-3 sm:py-4 flex flex-col min-h-0">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[14px] font-semibold tracking-tight text-text1">Where will it run?</h3>
                        <span className="text-[11px] text-text2">pick one or more</span>
                    </div>
                    {/* 한 줄 비율 박스 — 가로 넘지 않는 최대 높이로 자동 */}
                    <div ref={whereRef} className="flex flex-1 items-center justify-center min-h-0">
                        <div className="flex items-stretch justify-center gap-2" style={{ height: whereH }}>
                            {RATIO_ORDER.map((ratio) => {
                                const selected = aspectRatios.includes(ratio);
                                const info = AD_ASPECT_RATIO_INFO[ratio];
                                const factor = RATIO_FACTOR[ratio];
                                return (
                                    <button
                                        key={ratio}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => onClickRatio(ratio)}
                                        style={{ aspectRatio: `${factor}`, height: '100%', width: 'auto' } as React.CSSProperties}
                                        className={`relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
                                            selected
                                                ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(var(--accent),0.15)]'
                                                : 'border-hairline bg-canvas hover:border-text2/30 hover:bg-surface'
                                        }`}
                                    >
                                        {selected && (
                                            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent shadow-sm">
                                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                            </span>
                                        )}
                                        <span className={`text-[11px] font-semibold leading-none ${selected ? 'text-text1' : 'text-text2'}`}>
                                            {info.label}
                                        </span>
                                        <span className={`font-mono text-[9px] uppercase tracking-[0.08em] ${selected ? 'text-accent' : 'text-text2/60'}`}>
                                            {ratio}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-text2">
                        Each creative is generated in every format you select — no cropping, native rendering per size.
                    </p>
                </section>

                {/* 우하 스택 — Brand + CTA, 합쳐서 Where 높이와 동일 (grid fr로 자동 나눔) */}
                <div className="flex flex-col gap-4 h-full min-h-0">
                    <section className="rounded-[1.5rem] border border-hairline bg-surface p-4 flex-1 min-h-[7rem] flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Palette className="h-3.5 w-3.5 text-text2" strokeWidth={1.8} />
                                <h4 className="text-[13px] font-medium text-text1">Brand colors</h4>
                                <span className="rounded-full bg-surface border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text2">optional</span>
                                <span className="hidden sm:inline text-[11px] text-text2">· 3–5 hex · palette</span>
                            </div>
                            <span className="text-[11px] text-text2">{(brandPalette?.length ?? 0)}/5</span>
                        </div>

                        {/* 컬러 팔레트 그리드 — 5칸 꽉 채움 */}
                        <div className="grid flex-1 grid-cols-5 gap-2">
                            {(brandPalette ?? []).map((hex, index) => (
                                <div
                                    key={`brand-${index}`}
                                    data-picker-trigger
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setActivePickerIndex(activePickerIndex === index ? null : index)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePickerIndex(activePickerIndex === index ? null : index); } }}
                                    className="group relative flex cursor-pointer flex-col rounded-xl border border-hairline bg-canvas hover:border-text2/30"
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onRemoveColor(index); }}
                                        className="absolute right-1 top-1 z-10 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm group-hover:flex hover:bg-black/80"
                                        aria-label={`Remove ${hex}`}
                                    >
                                        <X className="h-3 w-3" strokeWidth={2} />
                                    </button>
                                    <div className="flex-1 w-full overflow-hidden rounded-t-xl" style={{ backgroundColor: hex }} aria-hidden />
                                    <div className="bg-surface px-2 py-1.5 text-center group-hover:bg-canvas rounded-b-xl">
                                        <span className="font-mono text-[10px] font-medium text-text1">{hex}</span>
                                    </div>
                                    {activePickerIndex === index && (() => {
                                        const rgb = hexToRgb(hex) ?? { r: 17, g: 17, b: 17 };
                                        return (
                                            <div data-picker-popover onClick={(e) => e.stopPropagation()} className="absolute right-full top-1/2 z-[60] mr-3 w-[19rem] -translate-y-1/2 rounded-xl border border-hairline bg-surface p-3 shadow-xl">
                                                <HexColorPicker color={hex} onChange={(c) => onChangeColor(index, c)} style={{ width: '100%' }} />
                                                <div className="mt-3 flex flex-col gap-2">
                                                    <label className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-text2">HEX</span>
                                                        <input
                                                            key={`${hex}-${index}`}
                                                            defaultValue={hex}
                                                            onChange={(e) => {
                                                                const raw = e.target.value.trim();
                                                                const withHash = raw.startsWith('#') ? raw : `#${raw}`;
                                                                if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) onChangeColor(index, withHash.toUpperCase());
                                                            }}
                                                            onBlur={(e) => {
                                                                const v = e.target.value.trim();
                                                                const withHash = v.startsWith('#') ? v : `#${v}`;
                                                                if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) onChangeColor(index, withHash.toUpperCase());
                                                                else e.target.value = hex;
                                                            }}
                                                            placeholder="#RRGGBB"
                                                            className="rounded-lg border border-hairline bg-canvas px-2 py-1.5 font-mono text-[11px] text-text1 placeholder:text-text2/50 focus:border-text2/40 focus:outline-none"
                                                        />
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(['r', 'g', 'b'] as const).map((k) => (
                                                            <label key={k} className="flex flex-col gap-1">
                                                                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-text2">{k.toUpperCase()}</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={255}
                                                                    value={rgb[k]}
                                                                    onChange={(e) => {
                                                                        const n = Math.max(0, Math.min(255, parseInt(e.target.value || '0', 10) || 0));
                                                                        const next = { ...rgb, [k]: n };
                                                                        onChangeColor(index, rgbToHex(next.r, next.g, next.b));
                                                                    }}
                                                                    className="rounded-lg border border-hairline bg-canvas px-2 py-1.5 text-center text-[11px] text-text1 focus:border-text2/40 focus:outline-none"
                                                                />
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex justify-end">
                                                    <button type="button" onClick={() => setActivePickerIndex(null)} className="rounded-full bg-text1 px-4 py-1.5 text-[11px] font-medium text-canvas">Done</button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))}

                            {/* 빈 슬롯 — Add */}
                            {Array.from({ length: Math.max(0, 5 - (brandPalette?.length ?? 0)) }).map((_, idx) => {
                                const isFirstEmpty = idx === 0;
                                return (
                                    <div
                                        key={`empty-${idx}`}
                                        className={`relative flex min-h-[4.2rem] flex-col rounded-xl border border-dashed bg-canvas p-2 ${isFirstEmpty ? 'border-hairline' : 'border-hairline/50 opacity-60'}`}
                                    >
                                        {isFirstEmpty ? (
                                            <>
                                                <button
                                                    type="button"
                                                    data-picker-trigger
                                                    onClick={() => setActivePickerIndex(activePickerIndex === -1 ? null : -1)}
                                                    className="flex flex-1 w-full items-center justify-center rounded-[10px] bg-surface text-text2 transition-colors hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
                                                    aria-label="Add color"
                                                >
                                                    <Plus className="h-5 w-5" strokeWidth={1.8} />
                                                </button>
                                                {activePickerIndex === -1 && (() => {
                                                    const rgb = hexToRgb(pickerColor) ?? { r: 17, g: 17, b: 17 };
                                                    return (
                                                        <div data-picker-popover onClick={(e) => e.stopPropagation()} className="absolute right-full top-1/2 z-[60] mr-3 w-[19rem] -translate-y-1/2 rounded-xl border border-hairline bg-surface p-3 shadow-xl">
                                                            <HexColorPicker color={pickerColor} onChange={(c) => setPickerColor(c.toUpperCase())} style={{ width: '100%' }} />
                                                            <div className="mt-3 flex flex-col gap-2">
                                                                <label className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-text2">HEX</span>
                                                                    <input
                                                                        key={pickerColor}
                                                                        defaultValue={pickerColor}
                                                                        onChange={(e) => {
                                                                            const raw = e.target.value.trim();
                                                                            const withHash = raw.startsWith('#') ? raw : `#${raw}`;
                                                                            if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) setPickerColor(withHash.toUpperCase());
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            const v = e.target.value.trim();
                                                                            const withHash = v.startsWith('#') ? v : `#${v}`;
                                                                            if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) setPickerColor(withHash.toUpperCase());
                                                                            else e.target.value = pickerColor;
                                                                        }}
                                                                        placeholder="#RRGGBB"
                                                                        className="rounded-lg border border-hairline bg-canvas px-2 py-1.5 font-mono text-[11px] text-text1 placeholder:text-text2/50 focus:border-text2/40 focus:outline-none"
                                                                    />
                                                                </label>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    {(['r', 'g', 'b'] as const).map((k) => (
                                                                        <label key={k} className="flex flex-col gap-1">
                                                                            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-text2">{k.toUpperCase()}</span>
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                max={255}
                                                                                value={rgb[k]}
                                                                                onChange={(e) => {
                                                                                    const n = Math.max(0, Math.min(255, parseInt(e.target.value || '0', 10) || 0));
                                                                                    const next = { ...rgb, [k]: n };
                                                                                    setPickerColor(rgbToHex(next.r, next.g, next.b));
                                                                                }}
                                                                                className="rounded-lg border border-hairline bg-canvas px-2 py-1.5 text-center text-[11px] text-text1 focus:border-text2/40 focus:outline-none"
                                                                            />
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex justify-end gap-2">
                                                                <button type="button" onClick={() => setActivePickerIndex(null)} className="rounded-full px-3 py-1.5 text-[11px] text-text2 hover:bg-canvas">Cancel</button>
                                                                <button type="button" onClick={() => { onAddColor(); }} className="rounded-full bg-text1 px-4 py-1.5 text-[11px] font-medium text-canvas">Add</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <span className="text-[11px] text-text2/40">—</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="min-h-[16px]">
                            {(brandPalette?.length ?? 0) === 0 ? (
                                <p className="text-[11px] text-text2">Leave empty to let AI vary freely.</p>
                            ) : (brandPalette!.length < 3) ? (
                                <p className="text-[11px] text-amber-600 dark:text-amber-500">Add 3 to 5 colors for best results. — {brandPalette!.length}/5</p>
                            ) : (
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ {brandPalette!.length} colors — palette ready</p>
                            )}
                        </div>

                    </section>

                    <section className="flex shrink-0 items-center justify-between rounded-[1.5rem] border border-hairline bg-surface p-4 sm:p-5">
                        <div>
                            <p className="text-[13px] font-medium tracking-tight text-text1">Round CTA button</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-text2">Add a &ldquo;Shop now&rdquo; style button to the layout.</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={ctaEnabled}
                            onClick={() => onClickCta(!ctaEnabled)}
                            className={`relative h-7 w-[3.25rem] shrink-0 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                ctaEnabled ? 'bg-accent' : 'bg-hairline'
                            }`}
                        >
                            <span
                                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm shadow-black/20 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                    ctaEnabled ? 'translate-x-6' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default memo(CreateForm);
