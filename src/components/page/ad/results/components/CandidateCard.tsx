'use client'

import { memo, useCallback } from 'react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import { AdAspectRatio, AdCandidate } from "@/lib/api/client/ad/adClientAPI";

const RATIO_FACTOR: Record<AdAspectRatio, number> = {
    '1:1': 1,
    '4:5': 4 / 5,
    '9:16': 9 / 16,
    '16:9': 16 / 9,
    '2:3': 2 / 3,
};

interface CandidateCardProps {
    candidate: AdCandidate;
    selected: boolean;
    onSelect: () => void;
}

function CandidateCard({ candidate, selected, onSelect }: CandidateCardProps) {
    const onClickCard = useCallback(() => {
        onSelect();
    }, [onSelect]);

    return (
        <button
            type="button"
            onClick={onClickCard}
            style={{ height: 'min(21rem, 38vw)', aspectRatio: RATIO_FACTOR[candidate.ratio] }}
            className={`group relative shrink-0 overflow-hidden rounded-[1.5rem] border text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                selected
                    ? 'border-accent ring-1 ring-accent/30'
                    : 'border-hairline hover:border-text2/70 hover:shadow-xl hover:shadow-black/20'
            }`}
            aria-pressed={selected}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={candidate.url}
                alt={`Creative ${candidate.conceptIndex + 1} · ${candidate.ratio}`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
            />
            <AdOverlay design={candidate.design} />

            {/* 비율 코드 */}
            <span className="absolute bottom-3 left-3 rounded-full bg-surface/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text1 backdrop-blur-sm">
                {candidate.ratio}
            </span>

            {/* VLM 점수 */}
            <span
                className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm ${
                    candidate.score !== null ? 'bg-surface/85 text-text1' : 'bg-surface/60 text-text2'
                }`}
            >
                {candidate.score !== null ? `${candidate.score.toFixed(1)} / 10` : 'score skipped'}
            </span>
        </button>
    );
}

export default memo(CandidateCard);