'use client'

import { memo, useCallback } from 'react';
import { Download, Maximize2, Wand2 } from 'lucide-react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import { AdAspectRatio, AdCandidate, AdTask, AD_ASPECT_RATIO_INFO } from "@/lib/api/client/ad/adClientAPI";

const PRESET_ASPECT_CLASS: Record<AdAspectRatio, string> = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
    '2:3': 'aspect-[2/3]',
};

interface DetailPanelProps {
    task: AdTask;
    candidate: AdCandidate | null;
    onOpenPreview: () => void;
}

function DetailPanel({ task, candidate, onOpenPreview }: DetailPanelProps) {
    const onClickEditor = useCallback(() => {
        window.alert(
            'The layout editor arrives in the next phase. You will fine-tune typography, layers, and free crop there. Your layout will open with the current design as the default.'
        );
    }, []);

    if (!candidate) {
        return (
            <aside className="rounded-[1.5rem] border border-hairline bg-surface p-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Details</span>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-text1">Select a candidate</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-text2">
                    Choose a candidate on the left to export it.
                </p>
            </aside>
        );
    }

    return (
        <aside className="rounded-[1.5rem] border border-hairline bg-surface p-6">
            <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Details</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text2">
                    {candidate.score !== null ? `${candidate.score.toFixed(1)} / 10` : 'score skipped'}
                </span>
            </div>

            <h2 className="mb-5 text-lg font-bold tracking-tight text-text1">
                Creative {String(candidate.conceptIndex + 1).padStart(2, '0')} · {candidate.ratio}
            </h2>

            {/* 매체/플랫폼 정보 */}
            <dl className="mb-5 space-y-2.5 border-t border-hairline pt-4">
                <div className="flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-text2">Format</dt>
                    <dd className="text-[13px] font-medium text-text1">
                        {AD_ASPECT_RATIO_INFO[candidate.ratio].label} · {candidate.ratio}
                    </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-text2">Shows up in</dt>
                    <dd className="text-right text-[13px] text-text1">
                        {AD_ASPECT_RATIO_INFO[candidate.ratio].usage}
                    </dd>
                </div>
            </dl>

            {/* 후보 미리보기 */}
            <div className={`relative mb-5 w-full overflow-hidden rounded-xl border border-hairline ${PRESET_ASPECT_CLASS[candidate.ratio]}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={candidate.url}
                    alt={`${candidate.ratio} preview`}
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <AdOverlay design={candidate.design} />
                <button
                    type="button"
                    onClick={onOpenPreview}
                    aria-label="Expand preview"
                    className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface/85 text-text1 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95"
                >
                    <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
            </div>

            {/* 다운로드 */}
            <div className="space-y-2.5">
                <a
                    href={candidate.url}
                    download={`shortreal-ad-${candidate.ratio}-${candidate.id}.webp`}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-text1 px-5 py-3 text-[13px] font-semibold text-canvas transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.99]"
                >
                    <Download className="h-4 w-4" strokeWidth={2.2} />
                    <span>Download {candidate.ratio}</span>
                </a>
            </div>

            {/* 에디터 (MVP 2차, 자리만) */}
            <div className="mt-5 border-t border-hairline pt-5">
                <button
                    type="button"
                    onClick={onClickEditor}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-[13px] font-medium text-text1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-text2/50 hover:bg-surface active:scale-[0.99]"
                >
                    <Wand2 className="h-4 w-4" strokeWidth={1.8} />
                    <span>Open in editor</span>
                </button>
                <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                    Editor ships in the next phase
                </p>
            </div>
        </aside>
    );
}

export default memo(DetailPanel);