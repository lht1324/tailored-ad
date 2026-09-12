'use client'

import { memo, useCallback, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Download, Loader2, Maximize2, RefreshCw, Sparkles } from 'lucide-react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import { downloadCompositedImage } from "@/components/page/ad/projects/[projectId]/components/compositeDownload";
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";
import { AdRatioKey, AdImageResult } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

const RATIO_FACTOR: Record<string, number> = {
    '1_1': 1,
    '4_5': 4 / 5,
    '9_16': 9 / 16,
    '16_9': 16 / 9,
    '2_3': 2 / 3,
};

const RATIO_LABEL: Record<string, string> = {
    '1_1': '1:1',
    '4_5': '4:5',
    '9_16': '9:16',
    '16_9': '16:9',
    '2_3': '2:3',
};

interface FormatTileProps {
    ratioKey: AdRatioKey;
    imageResult?: AdImageResult | null;
    signedUrl?: string | null;
    brandLogoUrl?: string | null;
    isProjectRunning: boolean;
    creativeIndex: number;
    onExpand?: () => void;
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: string | null;
}

function FormatTile({ ratioKey, imageResult, signedUrl, brandLogoUrl, isProjectRunning, creativeIndex, onExpand, headlineFontFamily, headlineFontWeight, headlineColor }: FormatTileProps) {
    const ratioLabel = RATIO_LABEL[ratioKey] ?? ratioKey;
    const factor = RATIO_FACTOR[ratioKey] ?? 1;

    const hasError = Boolean(imageResult?.error);
    const isGenerating = !imageResult && isProjectRunning;
    const isCompleted = Boolean(imageResult && signedUrl && !hasError);
    const isPending = !imageResult && !isProjectRunning;

    const onClickTile = useCallback(() => {
        if (isCompleted && onExpand) onExpand();
    }, [isCompleted, onExpand]);

    const onClickRetry = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        window.alert('Regenerate for this format arrives in the next phase. The system already retried once automatically.');
    }, []);

    const [isDownloading, setIsDownloading] = useState(false);
    const onClickDownload = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!signedUrl || !imageResult?.design) return;
        setIsDownloading(true);
        try {
            // 화면 오버레이 DOM을 그대로 PNG로 — 프리뷰와 픽셀 동일
            await downloadCompositedImage({
                imageUrl: signedUrl,
                design: imageResult.design as AdDesignLayout,
                ratioKey,
                creativeIndex,
                headlineFontFamily: headlineFontFamily ?? null,
                headlineFontWeight: headlineFontWeight ?? null,
                headlineColor,
                brandLogoUrl: brandLogoUrl ?? null,
            });
        } catch (err) {
            console.error('download failed', err);
            window.open(signedUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    }, [signedUrl, imageResult, ratioKey, creativeIndex, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl]);

    // 에러 타일
    if (hasError) {
        return (
            <div
                style={{ aspectRatio: factor, height: 'min(18rem, 34vw)' }}
                className="relative flex shrink-0 flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/40 dark:bg-amber-950/20"
            >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">{ratioLabel} · failed</p>
                    <p className="mt-1 max-w-[14ch] text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-200/70 line-clamp-2">
                        {imageResult?.error?.message ?? 'Generation failed'}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-amber-600/60 dark:text-amber-400/60">{imageResult?.error?.code ?? 'unknown'}</p>
                </div>
                <button
                    type="button"
                    onClick={onClickRetry}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
                >
                    <RefreshCw className="h-3 w-3" strokeWidth={1.8} />
                    Retry
                </button>
            </div>
        );
    }

    // 생성 중 타일 (스켈레톤)
    if (isGenerating) {
        return (
            <div
                style={{ aspectRatio: factor, height: 'min(18rem, 34vw)' }}
                className="relative flex shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.25rem] border border-hairline bg-canvas"
            >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-600">
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
                </span>
                <div className="text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-600">{ratioLabel} · generating</p>
                    <p className="mt-1 text-[11px] text-text2">Creative {String(creativeIndex + 1).padStart(2, '0')}</p>
                </div>
                <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text2 backdrop-blur-sm">
                    {ratioLabel}
                </span>
            </div>
        );
    }

    // 대기 (프로젝트 완료됐는데도 결과 없음 — 예: 비지원)
    if (isPending || !imageResult) {
        return (
            <div
                style={{ aspectRatio: factor, height: 'min(18rem, 34vw)' }}
                className="relative flex shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] border border-dashed border-hairline bg-canvas p-4 text-center"
            >
                <Sparkles className="h-4 w-4 text-text2" strokeWidth={1.8} />
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text2">{ratioLabel} · pending</p>
                <p className="text-[11px] text-text2/70">Waiting for generation</p>
            </div>
        );
    }

    // 완료 타일 — 이미지 + 오버레이
    const design: AdDesignLayout = (imageResult.design as AdDesignLayout) ?? { headline: null, cta: null, logo: null, scrim: false };
    const score = imageResult.score;
    const designColor = (design.headline as unknown as { color?: string } | null)?.color;
    const overlayHeadlineColor = designColor ?? headlineColor ?? null;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClickTile}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClickTile(); } }}
            style={{ aspectRatio: factor, height: 'min(18rem, 34vw)' }}
            className="group relative shrink-0 cursor-pointer overflow-hidden rounded-[1.25rem] border border-hairline text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-text2/30 hover:shadow-lg hover:shadow-black/5"
        >
            <Image
                src={signedUrl ?? ''}
                alt={`Creative ${creativeIndex + 1} · ${ratioLabel}`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <AdOverlay design={design} headlineFontFamily={headlineFontFamily ?? null} headlineFontWeight={headlineFontWeight ?? null} headlineColor={overlayHeadlineColor} brandLogoUrl={brandLogoUrl ?? null} />

            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-surface/85 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text1 backdrop-blur-sm">
                {ratioLabel}
            </span>

            <span className={`absolute bottom-2.5 right-2.5 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] backdrop-blur-sm ${score != null ? 'bg-surface/85 text-text1' : 'bg-surface/60 text-text2'}`}>
                {score != null ? `${score.toFixed(1)} / 10` : 'no score'}
            </span>

            {isCompleted && (
                <>
                    <button
                        type="button"
                        onClick={onClickDownload}
                        disabled={isDownloading}
                        aria-label="Download final image"
                        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-surface disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.8} /> : <Download className="h-3 w-3" strokeWidth={1.8} />}
                        Final
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand?.();
                        }}
                        aria-label="Expand image"
                        className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-text1 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 hover:scale-105"
                    >
                        <Maximize2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                </>
            )}
        </div>
    );
}

export default memo(FormatTile);
