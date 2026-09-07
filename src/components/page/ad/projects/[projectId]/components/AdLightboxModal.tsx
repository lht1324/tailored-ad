'use client'

import { memo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, Download } from 'lucide-react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";

interface AdLightboxModalProps {
    imageUrl: string;
    ratioLabel: string;
    creativeIndex: number;
    design?: AdDesignLayout | null;
    score?: number | null;
    headline?: string | null;
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: 'white' | 'black' | null;
    brandLogoUrl?: string | null;
    onClose: () => void;
}

function AdLightboxModal({ imageUrl, ratioLabel, creativeIndex, design, score, headline, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl, onClose }: AdLightboxModalProps) {
    const onClickBackdrop = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    }, [onClose]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
            onClick={onClickBackdrop}
            role="dialog"
            aria-modal="true"
        >
            <div className="flex max-h-[90vh] w-fit max-w-[90vw] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-5 py-3">
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text1">
                            Creative {String(creativeIndex + 1).padStart(2, '0')} · {ratioLabel}
                        </p>
                        {headline ? (
                            <p className="mt-0.5 line-clamp-1 text-[12px] text-text2">“{headline}”</p>
                        ) : (
                            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text2">
                                {score != null ? `${score.toFixed(1)} / 10` : 'no score'}
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <a
                            href={imageUrl}
                            download={`shortreal-creative-${creativeIndex + 1}-${ratioLabel}.png`}
                            className="inline-flex items-center gap-2 rounded-full bg-text1 px-4 py-1.5 text-[12px] font-medium text-canvas hover:opacity-90"
                        >
                            <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
                            Download
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-canvas text-text2 hover:bg-surface hover:text-text1"
                        >
                            <X className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-center overflow-hidden bg-canvas p-4 min-h-0">
                    <div className="relative w-fit max-w-full">
                        <Image
                            src={imageUrl}
                            alt={`Creative ${creativeIndex + 1} · ${ratioLabel}`}
                            width={1200}
                            height={1200}
                            unoptimized
                            className="h-auto max-h-[75vh] w-auto max-w-[90vw] rounded-xl object-contain sm:max-w-[80vw]"
                            style={{ width: 'auto', height: 'auto' }}
                        />
                        {design && <AdOverlay design={design} headlineFontFamily={headlineFontFamily ?? null} headlineFontWeight={headlineFontWeight ?? null} headlineColor={headlineColor ?? 'white'} brandLogoUrl={brandLogoUrl ?? null} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(AdLightboxModal);
