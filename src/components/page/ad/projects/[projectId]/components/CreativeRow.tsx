'use client'

import { memo, useMemo, useState } from 'react';
import { ChevronDown, Eye, Layers, Sparkles, Target, Wand2 } from 'lucide-react';
import FormatTile from "@/components/page/ad/projects/[projectId]/components/FormatTile";
import { AdCreativeSpec, AdCreativeResult, AdGenerationBatch, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { fontMap } from "@/lib/fonts";

function formatAxisLabel(value: string): string {
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

interface CreativeRowProps {
    creativeIndex: number;
    spec?: AdCreativeSpec | null;
    result?: AdCreativeResult | null;
    batch: AdGenerationBatch;
    signedUrls: Record<string, string>;
    brandLogoUrl?: string | null;
    isProjectRunning: boolean;
    selectedKey: string | null;
    onSelectTile: (key: string) => void;
    onExpandTile?: (key: string) => void;
}

function CreativeRow({ creativeIndex, spec, result, batch, signedUrls, brandLogoUrl, isProjectRunning, selectedKey, onSelectTile, onExpandTile }: CreativeRowProps) {
    const [expanded, setExpanded] = useState(true);

    const copy = result?.copy;
    const imageResults = result?.imageResults as Partial<Record<AdRatioKey, unknown>> | undefined;

    const headlineFontFamily = useMemo(() => {
        const name = copy?.fontFamily as string | undefined;
        if (name && (fontMap as Record<string, { style: { fontFamily: string } }>)[name]) {
            return (fontMap as Record<string, { style: { fontFamily: string } }>)[name].style.fontFamily;
        }
        return undefined;
    }, [copy?.fontFamily]);
    const headlineFontWeight = useMemo(() => {
        const w = copy?.fontWeight as number | undefined;
        return typeof w === 'number' ? w : undefined;
    }, [copy?.fontWeight]);
    const headlineColor = useMemo(() => {
        const c = copy?.headlineColor as 'white' | 'black' | undefined;
        return c === 'white' || c === 'black' ? c : null;
    }, [copy?.headlineColor]);

    const stats = useMemo(() => {
        let completed = 0;
        let failed = 0;
        let generating = 0;
        let designing = 0;
        for (const ratioKey of batch.aspect_ratios) {
            const ir = imageResults?.[ratioKey] as { error?: unknown; imageFileExtension?: string | null; score?: number | null } | undefined;
            if (!ir) {
                if (isProjectRunning) generating += 1;
                continue;
            }
            if ((ir as { error?: unknown }).error) failed += 1;
            else if ((ir as { imageFileExtension?: string | null }).imageFileExtension) {
                if ((ir as { score?: number | null }).score != null) completed += 1;
                else designing += 1;
            } else if (isProjectRunning) generating += 1;
        }
        return { completed, failed, generating, designing, total: batch.aspect_ratios.length };
    }, [imageResults, batch.aspect_ratios, isProjectRunning]);

    const bestScore = useMemo(() => {
        if (!imageResults) return null;
        let best: number | null = null;
        for (const rk of batch.aspect_ratios) {
            const ir = imageResults[rk] as { score?: number | null } | undefined;
            if (ir?.score != null) {
                if (best == null || ir.score > best) best = ir.score;
            }
        }
        return best;
    }, [imageResults, batch.aspect_ratios]);

    const isSpecPending = !spec && isProjectRunning;
    const statusLabel = isSpecPending
        ? 'Preparing'
        : stats.failed > 0 && stats.completed > 0
            ? 'Partial'
            : stats.failed > 0
                ? 'Failed'
                : stats.generating > 0
                    ? 'Generating'
                    : stats.designing > 0
                        ? 'Designing'
                        : stats.completed === stats.total
                            ? 'Completed'
                            : 'Pending';

    const statusTone =
        statusLabel === 'Completed'
            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400'
            : statusLabel === 'Partial' || statusLabel === 'Failed'
                ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300'
                : statusLabel === 'Generating' || statusLabel === 'Preparing' || statusLabel === 'Designing'
                    ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400'
                    : 'bg-surface text-text2 border-hairline';

    return (
        <section className="overflow-hidden rounded-[1.5rem] border border-hairline bg-surface">
            {/* 헤더 */}
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-canvas/50 transition-colors"
            >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas font-mono text-[12px] font-semibold text-text1 border border-hairline">
                    {String(creativeIndex + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold tracking-tight text-text1">
                            Creative {String(creativeIndex + 1).padStart(2, '0')}
                        </h3>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone}`}>
                            {statusLabel}
                        </span>
                        {bestScore != null && (
                            <span className="font-mono text-[11px] text-text2">best {bestScore.toFixed(1)} / 10</span>
                        )}
                        <span className="font-mono text-[11px] text-text2">· {stats.completed}/{stats.total} ready{stats.failed ? ` · ${stats.failed} failed` : ''}{stats.designing ? ` · ${stats.designing} designing` : ''}{stats.generating ? ` · ${stats.generating} generating` : ''}</span>
                    </div>

                    {copy?.headline ? (
                        <p className="mt-1 line-clamp-1 text-[13px] leading-snug text-text1" style={{ fontFamily: headlineFontFamily, fontWeight: headlineFontWeight }}>“{copy.headline}”</p>
                    ) : spec ? (
                        <p className="mt-1 line-clamp-1 text-[12px] text-text2">
                            {formatAxisLabel(spec.camera)} · {formatAxisLabel(spec.lighting)} · {formatAxisLabel(spec.palette)}
                        </p>
                    ) : (
                        <p className="mt-1 text-[12px] text-text2">Preparing concept — axis assignment running…</p>
                    )}
                </div>

                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas text-text2 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
                </span>
            </button>

            {expanded && (
                <div className="border-t border-hairline">
                    {/* 축/팔레트 바 */}
                    {spec && (
                        <div className="flex flex-wrap gap-1.5 border-b border-hairline bg-canvas/40 px-5 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-hairline px-2.5 py-1 text-[11px] text-text1">
                                <Eye className="h-3 w-3 text-text2" strokeWidth={1.8} />
                                {formatAxisLabel(spec.camera)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-hairline px-2.5 py-1 text-[11px] text-text1">
                                <Sparkles className="h-3 w-3 text-text2" strokeWidth={1.8} />
                                {formatAxisLabel(spec.lighting)}
                            </span>
                            <span className="rounded-full bg-surface border border-hairline px-2.5 py-1 text-[11px] text-text1">{formatAxisLabel(spec.palette)}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface border border-hairline px-2.5 py-1 text-[11px] text-text1">
                                <Layers className="h-3 w-3 text-text2" strokeWidth={1.8} />
                                {formatAxisLabel(spec.framing)}
                            </span>
                            <span className="rounded-full bg-surface border border-hairline px-2.5 py-1 text-[11px] text-text1">{formatAxisLabel(spec.layout_tone)}</span>
                            {copy?.cta != null && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-1 text-[11px] font-medium text-accent">
                                    <Target className="h-3 w-3" strokeWidth={1.8} />
                                    CTA: {copy.cta}
                                </span>
                            )}
                        </div>
                    )}

                    {/* 포맷 타일 그리드 — 가로 스크롤 */}
                    <div className="p-5">
                        {isSpecPending ? (
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-hairline bg-canvas px-4 py-6">
                                <Wand2 className="h-4 w-4 animate-pulse text-text2" strokeWidth={1.8} />
                                <p className="text-[13px] text-text2">Creative director is writing prompts for this concept…</p>
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                                {batch.aspect_ratios.map((ratioKey) => {
                                    const ir = imageResults?.[ratioKey] as import("@/lib/api/types/supabase/ad/AdGenerationBatch").AdImageResult | undefined;
                                    const key = `${creativeIndex}_${ratioKey}`;
                                    const signedUrl = signedUrls[key] ?? null;
                                    const tileKey = `${creativeIndex}_${ratioKey}`;
                                    return (
                                        <FormatTile
                                            key={ratioKey}
                                            ratioKey={ratioKey}
                                            imageResult={ir ?? null}
                                            signedUrl={signedUrl}
                                            brandLogoUrl={brandLogoUrl ?? null}
                                            isProjectRunning={isProjectRunning}
                                            creativeIndex={creativeIndex}
                                            selected={selectedKey === tileKey}
                                            onSelect={() => onSelectTile(tileKey)}
                                            onExpand={() => onExpandTile?.(tileKey)}
                                            headlineFontFamily={headlineFontFamily ?? null}
                                            headlineFontWeight={headlineFontWeight ?? null}
                                            headlineColor={headlineColor}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* 카피 푸터 */}
                        {copy?.headline && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
                                <span className="text-[12px] text-text2">
                                    Headline: <span className="font-medium text-text1" style={{ fontFamily: headlineFontFamily, fontWeight: headlineFontWeight }}>“{copy.headline}”</span>
                                    {copy?.fontFamily ? <span className="ml-2 font-mono text-[10px] text-text2">{copy.fontFamily} {copy.fontWeight ?? ''} · {copy.headlineColor ?? ''}</span> : null}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

export default memo(CreativeRow);
