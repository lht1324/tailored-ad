'use client'

import { memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import { AdAspectRatio, AdCandidate } from "@/lib/api/client/ad/adClientAPI";

const ASPECT_CLASS: Record<AdAspectRatio, string> = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
    '2:3': 'aspect-[2/3]',
};

const RATIO_FACTOR: Record<AdAspectRatio, number> = {
    '1:1': 1,
    '4:5': 4 / 5,
    '9:16': 9 / 16,
    '16:9': 16 / 9,
    '2:3': 2 / 3,
};

interface PreviewModalProps {
    candidate: AdCandidate;
    onClose: () => void;
}

function PreviewModal({ candidate, onClose }: PreviewModalProps) {
    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        },
        [onClose],
    );

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [onKeyDown]);

    const previewWidth = `min(90vw, calc(85vh * ${RATIO_FACTOR[candidate.ratio]}))`;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Creative ${candidate.conceptIndex + 1} · ${candidate.ratio} preview`}
            className="fixed inset-0 z-[100] p-6 md:p-10"
        >
            <button
                type="button"
                aria-label="Close preview"
                onClick={onClose}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <div className="relative z-10 flex h-full items-center justify-center">
                <div className="relative" style={{ width: previewWidth }}>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close preview"
                        className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-text1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95"
                    >
                        <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <div
                        className={`relative w-full overflow-hidden rounded-[1.5rem] border border-hairline bg-surface ${ASPECT_CLASS[candidate.ratio]}`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={candidate.url}
                            alt={`Creative ${candidate.conceptIndex + 1} · ${candidate.ratio} preview`}
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <AdOverlay design={candidate.design} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(PreviewModal);