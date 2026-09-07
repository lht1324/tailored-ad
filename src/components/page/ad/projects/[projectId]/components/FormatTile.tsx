'use client'

import { memo, useCallback, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Download, Loader2, Maximize2, RefreshCw, Sparkles } from 'lucide-react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
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
    onSelect?: () => void;
    onExpand?: () => void;
    selected?: boolean;
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: 'white' | 'black' | null;
}

function FormatTile({ ratioKey, imageResult, signedUrl, brandLogoUrl, isProjectRunning, creativeIndex, onSelect, onExpand, selected, headlineFontFamily, headlineFontWeight, headlineColor }: FormatTileProps) {
    const ratioLabel = RATIO_LABEL[ratioKey] ?? ratioKey;
    const factor = RATIO_FACTOR[ratioKey] ?? 1;

    const hasError = Boolean(imageResult?.error);
    const isGenerating = !imageResult && isProjectRunning;
    const isCompleted = Boolean(imageResult && signedUrl && !hasError);
    const isPending = !imageResult && !isProjectRunning;

    const onClickTile = useCallback(() => {
        if (isCompleted && onSelect) onSelect();
    }, [isCompleted, onSelect]);

    const onClickRetry = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        window.alert('Regenerate for this format arrives in the next phase. The system already retried once automatically.');
    }, []);

    const [isDownloading, setIsDownloading] = useState(false);
    const onClickDownload = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!signedUrl || !imageResult) return;
        const design = (imageResult.design as unknown as { headline?: { text: string; x: number; y: number; maxWidth: number; align: string; fontSizePct: number; color?: string } | null; cta?: { text: string; x: number; y: number; widthPct: number; fontSizePct: number } | null; logo?: { brand: string; x: number; y: number; widthPct: number; fontSizePct: number } | null; scrim?: boolean }) ?? null;
        if (!design) return;
        setIsDownloading(true);
        try {
            const canvasW = factor >= 1 ? 1080 : Math.round(1080 * factor);
            // Use standard 1080 base: 1_1 1080x1080, 4_5 1080x1350, 9_16 1080x1920, 16_9 1920x1080, 2_3 1080x1620
            const sizeMap: Record<string, { w: number; h: number }> = {
                '1_1': { w: 1080, h: 1080 },
                '4_5': { w: 1080, h: 1350 },
                '9_16': { w: 1080, h: 1920 },
                '16_9': { w: 1920, h: 1080 },
                '2_3': { w: 1080, h: 1620 },
            };
            const { w, h } = sizeMap[ratioKey] ?? { w: 1080, h: Math.round(1080 / factor) };
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            // Load base image
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('image load failed'));
                img.src = signedUrl;
            });
            ctx.drawImage(img, 0, 0, w, h);
            // Scrim
            if (design.scrim) {
                const grad = ctx.createLinearGradient(0, h * 0.32, 0, h);
                if ((design.headline as unknown as { color?: string })?.color === 'black' || headlineColor === 'black') {
                    grad.addColorStop(0, 'rgba(255,255,255,0)');
                    grad.addColorStop(1, 'rgba(255,255,255,0.7)');
                } else {
                    grad.addColorStop(0, 'rgba(0,0,0,0)');
                    grad.addColorStop(1, 'rgba(0,0,0,0.65)');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(0, h * 0.32, w, h * 0.68);
            }
            // Brand logo
            if (design.logo && brandLogoUrl) {
                try {
                    const logoImg = new window.Image();
                    logoImg.crossOrigin = 'anonymous';
                    await new Promise<void>((res, rej) => {
                        logoImg.onload = () => res();
                        logoImg.onerror = () => rej(new Error('logo load failed'));
                        logoImg.src = brandLogoUrl;
                    });
                    const lx = (design.logo.x / 100) * w;
                    const ly = (design.logo.y / 100) * h;
                    const lw = (design.logo.widthPct / 100) * w;
                    const lh = (lw * logoImg.height) / logoImg.width;
                    ctx.drawImage(logoImg, lx, ly, lw, lh);
                } catch {}
            }
            // Headline
            if (design.headline) {
                const hl = design.headline;
                const hx = (hl.x / 100) * w;
                const hy = (hl.y / 100) * h;
                const maxW = (hl.maxWidth / 100) * w;
                const fontSize = (hl.fontSizePct / 100) * h;
                const color = (hl as unknown as { color?: string }).color === 'black' || headlineColor === 'black' ? '#0A0A0A' : '#FFFFFF';
                const family = headlineFontFamily ?? 'Inter, sans-serif';
                const weight = headlineFontWeight ?? 700;
                try { await (document as unknown as { fonts: { load: (s: string) => Promise<unknown> } }).fonts.load(`${weight} ${fontSize}px "${family.replace(/['\"]/g, '')}"`); } catch {}
                ctx.fillStyle = color;
                ctx.font = `${weight} ${fontSize}px ${family}`;
                ctx.textBaseline = 'top';
                // @ts-ignore
                ctx.textAlign = hl.align as CanvasTextAlign;
                let textX = hx;
                if (hl.align === 'center') textX = hx + maxW / 2;
                else if (hl.align === 'right') textX = hx + maxW;
                // Simple word wrap
                const words = hl.text.split(' ');
                let line = '';
                let y = hy;
                const lineHeight = fontSize * 1.05;
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxW && n > 0) {
                        ctx.fillText(line.trim(), textX, y, maxW);
                        line = words[n] + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line.trim(), textX, y, maxW);
                // CTA
                if (design.cta) {
                    const cta = design.cta;
                    const cx = (cta.x / 100) * w;
                    const cy = (cta.y / 100) * h;
                    const cw = (cta.widthPct / 100) * w;
                    const cfs = (cta.fontSizePct / 100) * h;
                    const ch = cfs * 2.4;
                    ctx.fillStyle = '#FFFFFF';
                    // @ts-ignore
                    if (ctx.roundRect) {
                        // @ts-ignore
                        ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, ch / 2); ctx.fill();
                    } else {
                        ctx.beginPath(); ctx.arc(cx + ch / 2, cy + ch / 2, ch / 2, Math.PI / 2, Math.PI * 1.5); ctx.arc(cx + cw - ch / 2, cy + ch / 2, ch / 2, Math.PI * 1.5, Math.PI / 2); ctx.closePath(); ctx.fill();
                    }
                    ctx.fillStyle = '#000000';
                    ctx.font = `600 ${cfs}px ${family}`;
                    ctx.textAlign = 'center' as CanvasTextAlign;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(cta.text, cx + cw / 2, cy + ch / 2, cw * 0.9);
                }
            }
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shortreal-${creativeIndex + 1}-${ratioLabel}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            console.error('download failed', e);
            window.open(signedUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    }, [signedUrl, imageResult, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl, creativeIndex, ratioLabel, factor]);

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
    const overlayHeadlineColor = (design.headline as unknown as { color?: string })?.color === 'black' || (design.headline as unknown as { color?: string })?.color === 'white' ? (design.headline as unknown as { color: 'white' | 'black' }).color : headlineColor ?? 'white';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClickTile}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClickTile(); } }}
            style={{ aspectRatio: factor, height: 'min(18rem, 34vw)' }}
            className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-[1.25rem] border text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                selected
                    ? 'border-accent ring-1 ring-accent/30'
                    : 'border-hairline hover:border-text2/30 hover:shadow-lg hover:shadow-black/5'
            }`}
            aria-pressed={selected}
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
                        aria-label="Download composited image"
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/85 text-text1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-surface disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} /> : <Download className="h-3.5 w-3.5" strokeWidth={1.8} />}
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
