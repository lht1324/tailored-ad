'use client';

import { memo, useCallback, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface AssetTreeRatio {
    ratioKey: string;
    label: string;
    thumbUrl: string | null;
    completed: boolean;
    score: number | null;
}

export interface AssetTreeCreative {
    creativeIndex: number;
    headline: string | null;
    best: number | null;
    ratios: AssetTreeRatio[];
}

interface AssetTreeProps {
    items: AssetTreeCreative[];
    activeCreative: number;
    activeRatio: string;
    onSelect: (creativeIndex: number, ratioKey: string) => void;
}

function AssetTree({ items, activeCreative, activeRatio, onSelect }: AssetTreeProps) {
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

    const onClickToggleCreative = useCallback((creativeIndex: number) => {
        setCollapsed((prev) => ({ ...prev, [creativeIndex]: !prev[creativeIndex] }));
    }, []);

    return (
        <div className="space-y-2">
            {items.map((item) => {
                const isOpen = item.creativeIndex === activeCreative || !collapsed[item.creativeIndex];
                return (
                    <div key={item.creativeIndex} className="overflow-hidden rounded-2xl border border-hairline bg-surface">
                        <button
                            type="button"
                            onClick={() => onClickToggleCreative(item.creativeIndex)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas/50"
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas font-mono text-[11px] font-semibold text-text1">
                                {String(item.creativeIndex + 1).padStart(2, '0')}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-text1">
                                    {item.headline ? `“${item.headline}”` : `Creative ${String(item.creativeIndex + 1).padStart(2, '0')}`}
                                </span>
                                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-text2">
                                    {item.best != null ? `best ${item.best.toFixed(1)} / 10` : 'no score'}
                                </span>
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-text2 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.8} />
                        </button>
                        {isOpen && (
                            <div className="space-y-1 border-t border-hairline p-2">
                                {item.ratios.map((ratio) => {
                                    const isActive = item.creativeIndex === activeCreative && ratio.ratioKey === activeRatio;
                                    return (
                                        <button
                                            key={ratio.ratioKey}
                                            type="button"
                                            onClick={() => ratio.completed && onSelect(item.creativeIndex, ratio.ratioKey)}
                                            disabled={!ratio.completed}
                                            aria-label={`Edit creative ${item.creativeIndex + 1} ${ratio.label}`}
                                            className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                                isActive ? 'bg-accent/10 ring-1 ring-accent/30' : 'hover:bg-canvas'
                                            }`}
                                        >
                                            {ratio.thumbUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={ratio.thumbUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-hairline object-cover" />
                                            ) : (
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-hairline bg-canvas font-mono text-[10px] text-text2">
                                                    {ratio.label}
                                                </span>
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-text1">
                                                    {ratio.label}
                                                </span>
                                                <span className="block font-mono text-[10px] text-text2">
                                                    {ratio.completed
                                                        ? ratio.score != null ? `${ratio.score.toFixed(1)} / 10` : 'ready'
                                                        : 'pending'}
                                                </span>
                                            </span>
                                            {isActive && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default memo(AssetTree);
