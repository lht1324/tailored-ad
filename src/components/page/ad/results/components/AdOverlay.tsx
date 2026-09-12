'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";
import { needsDarkScrim, normalizeHeadlineColor, defaultScrimStrength } from "@/lib/colorUtils";
import { estimateWrappedLines } from "@/lib/textMeasure";

interface AdOverlayProps {
    design: AdDesignLayout;
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: string | null;
    brandLogoUrl?: string | null;
    // 에디터 전용: 있으면 해당 박스를 드래그 이동 가능 (프리뷰는 미전달)
    drag?: {
        onDragHeadline?: ((x: number, y: number) => void) | null;
        onDragCta?: ((x: number, y: number) => void) | null;
    } | null;
}

function clampDrag(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

// 박스 드래그 — 이동 px를 루트 크기로 나눠 %로 콜백. 상한은 getMax가 실시간 계산.
function startBoxDrag(
    e: React.PointerEvent,
    root: HTMLElement | null,
    origin: { x: number; y: number },
    getMax: () => { maxX: number; maxY: number },
    onDrag: (x: number, y: number) => void,
) {
    e.preventDefault();
    e.stopPropagation();
    if (!root) return;
    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const target = e.currentTarget as HTMLElement;
    try {
        target.setPointerCapture(e.pointerId);
    } catch {
        /* capture 미지원 환경 — move/up 리스너로 동작 */
    }
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const onMove = (ev: PointerEvent) => {
        const { maxX, maxY } = getMax();
        const nx = clampDrag(origin.x + ((ev.clientX - startClientX) / rect.width) * 100, 0, maxX);
        const ny = clampDrag(origin.y + ((ev.clientY - startClientY) / rect.height) * 100, 0, maxY);
        onDrag(Math.round(nx * 10) / 10, Math.round(ny * 10) / 10);
    };
    const onUp = () => {
        target.removeEventListener('pointermove', onMove as EventListener);
        target.removeEventListener('pointerup', onUp);
        target.removeEventListener('pointercancel', onUp);
    };
    target.addEventListener('pointermove', onMove as EventListener);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
}

async function waitForHeadlineFont(family: string | null | undefined, weight: number | null | undefined): Promise<void> {
    // FOUT 방지: 헤드라인 폰트를 명시적으로 로드하고 대기한다.
    // 첫 paint가 폴백 폰트로 찍히면 글자폭이 달라 개행 위치가 바뀌어 타일/모달이 달라진다.
    try {
        if (family) {
            const name = family.replace(/['"]/g, '').split(',')[0].trim();
            if (name) {
                await (document as unknown as { fonts: { load: (spec: string) => Promise<unknown[]> } }).fonts.load(`${weight ?? 700} 16px "${name}"`);
            }
        }
        await document.fonts.ready;
    } catch {
        /* 로드 실패 → 폴백 폰트로 렌더 (개행이 갈릴 수 있음) */
    }
}

function AdOverlay({ design, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl, drag }: AdOverlayProps) {
    const ref = useRef<HTMLDivElement>(null);
    const headlineBoxRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [fontReady, setFontReady] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) {
            return;
        }
        const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
        update();

        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let live = true;
        void waitForHeadlineFont(headlineFontFamily, headlineFontWeight).then(() => {
            if (live) setFontReady(true);
        });
        return () => {
            live = false;
        };
    }, [headlineFontFamily, headlineFontWeight]);

    const { headline, cta, logo, scrim } = design;

    const onPointerDownHeadline = useCallback((e: React.PointerEvent) => {
        const fn = drag?.onDragHeadline;
        if (!headline || !fn) return;
        startBoxDrag(
            e,
            ref.current,
            { x: headline.x, y: headline.y },
            () => {
                // 실측 높이로 y 상한 계산 — 텍스트가 아래로 삐져나갈 수 없음
                const box = headlineBoxRef.current;
                const root = ref.current;
                let maxY = 100;
                if (box && root && root.offsetHeight > 0) {
                    maxY = Math.max(0, 100 - (box.offsetHeight / root.offsetHeight) * 100);
                }
                return { maxX: Math.max(0, 100 - headline.maxWidth), maxY };
            },
            fn,
        );
    }, [drag, headline]);

    const onPointerDownCta = useCallback((e: React.PointerEvent) => {
        const fn = drag?.onDragCta;
        if (!cta || !fn) return;
        startBoxDrag(
            e,
            ref.current,
            { x: cta.x, y: cta.y },
            () => ({
                // CTA 필 크기는 확정값이라 정확한 상한 계산 가능
                maxX: Math.max(0, 100 - cta.widthPct),
                maxY: Math.max(0, 100 - cta.fontSizePct * 2.4),
            }),
            fn,
        );
    }, [drag, cta]);

    const headlineHex = normalizeHeadlineColor(headlineColor);
    const headlineTextColor = headlineHex;
    // scrim 농도 — design 지정값 우선, 없으면 글자색 기준 기본값 (밝은 글씨 65 / 어두운 글씨 40)
    const scrimStrength = typeof design.scrimStrength === 'number'
        ? Math.min(100, Math.max(0, design.scrimStrength))
        : defaultScrimStrength(headlineColor);
    const scrimPeak = needsDarkScrim(headlineHex)
        ? `rgba(0,0,0,${scrimStrength / 100})`
        : `rgba(255,255,255,${scrimStrength / 100})`;

    // scrim 밴드 — 글자 박스 뒤에만 (전폭 아님). 좌우는 마스크 페이드.
    const scrimGeometry = useMemo(() => {
        if (!headline) return null;
        const aspect = size.w > 0 && size.h > 0 ? size.w / size.h : 1;
        const H = 1000;
        const W = H * aspect;
        const family = headlineFontFamily ?? 'sans-serif';
        const weight = headlineFontWeight ?? 700;
        const lines = estimateWrappedLines(
            headline.text,
            `${weight} ${(headline.fontSizePct / 100) * H}px ${family}`,
            (headline.maxWidth / 100) * W,
        );
        const padY = headline.fontSizePct * 1.2;
        const textH = headline.fontSizePct * 1.05 * lines;
        const top = Math.max(0, headline.y - padY);
        const bottom = Math.min(100, headline.y + textH + padY);
        const padX = 3;
        const left = Math.max(0, headline.x - padX);
        const right = Math.min(100, headline.x + headline.maxWidth + padX);
        return { top, height: Math.max(0, bottom - top), left, width: Math.max(0, right - left) };
    }, [headline, headlineFontFamily, headlineFontWeight, size]);

    // 계약(analysis 프롬프트): fontSizePct는 canvas HEIGHT의 %. 너비 기준이 아님.
    // logo의 cqh 단위도 조상 컨테이너 쿼리 없이 뷰포트 기준으로 폴백되던 버그였음. px 계산으로 통일.
    const logoFontSize = size.h > 0 && logo ? (size.h * logo.fontSizePct) / 100 : 12;
    const textVisibility = fontReady ? 'visible' : 'hidden';

    return (
        <div ref={ref} className="pointer-events-none absolute inset-0 select-none">
            {scrim && scrimGeometry && (
                <div
                    suppressHydrationWarning
                    className="absolute"
                    style={{
                        top: `${scrimGeometry.top}%`,
                        height: `${scrimGeometry.height}%`,
                        left: `${scrimGeometry.left}%`,
                        width: `${scrimGeometry.width}%`,
                        backgroundImage: `linear-gradient(to bottom, transparent, ${scrimPeak} 50%, transparent)`,
                        maskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
                    }}
                />
            )}
            {scrim && !scrimGeometry && (
                <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                        height: '68%',
                        backgroundImage: `linear-gradient(to top, ${scrimPeak}, transparent)`,
                    }}
                />
            )}

            {logo && (
                <div
                    className="absolute flex items-center gap-[0.45em]"
                    style={{ left: `${logo.x}%`, top: `${logo.y}%`, width: `${logo.widthPct}%` }}
                >
                        {brandLogoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brandLogoUrl} alt={logo.brand} className="h-auto w-full object-contain" style={{ maxHeight: logoFontSize * 6 }} />
                        ) : (
                            <>
                                <span
                                    className="h-[0.5em] w-[0.5em] shrink-0 rounded-full bg-accent"
                                    style={{ fontSize: logoFontSize }}
                                />
                                <span
                                    className="font-bold uppercase tracking-[0.08em] text-white"
                                    style={{ fontSize: logoFontSize, visibility: textVisibility }}
                                >
                                    {logo.brand}
                                </span>
                            </>
                        )}
                </div>
            )}

            {headline && (
                <div
                    ref={headlineBoxRef}
                    className={`absolute ${drag?.onDragHeadline ? 'cursor-grab active:cursor-grabbing hover:[outline:2px_dashed_white] hover:[outline-offset:3px] hover:[box-shadow:0_0_0_5px_rgba(0,0,0,0.35)]' : ''}`}
                    onPointerDown={drag?.onDragHeadline ? onPointerDownHeadline : undefined}
                    style={{
                        left: `${headline.x}%`,
                        top: `${headline.y}%`,
                        width: `${headline.maxWidth}%`,
                        textAlign: headline.align,
                        ...(drag?.onDragHeadline ? { touchAction: 'none', pointerEvents: 'auto' as const } : {}),
                    }}
                >
                    <h3
                        className="font-bold leading-[1.05] tracking-[-0.02em]"
                        style={{
                            fontSize: size.h > 0 ? (size.h * headline.fontSizePct) / 100 : 24,
                            color: headlineTextColor,
                            fontFamily: headlineFontFamily ?? undefined,
                            fontWeight: headlineFontWeight ?? undefined,
                            visibility: textVisibility,
                        }}
                    >
                        {headline.text}
                    </h3>
                </div>
            )}

            {cta && (
                <div
                    className="absolute"
                    style={{ left: `${cta.x}%`, top: `${cta.y}%` }}
                >
                    <span
                        className={`flex items-center justify-center rounded-full bg-white font-semibold text-black ${drag?.onDragCta ? 'cursor-grab active:cursor-grabbing hover:[outline:2px_dashed_white] hover:[outline-offset:3px] hover:[box-shadow:0_0_0_5px_rgba(0,0,0,0.35)]' : ''}`}
                        onPointerDown={drag?.onDragCta ? onPointerDownCta : undefined}
                        style={{
                            width: size.w > 0 ? (size.w * cta.widthPct) / 100 : 96,
                            height: size.h > 0 ? (size.h * cta.fontSizePct * 2.4) / 100 : 28,
                            fontSize: size.h > 0 ? (size.h * cta.fontSizePct) / 100 : 12,
                            visibility: textVisibility,
                            ...(drag?.onDragCta ? { touchAction: 'none', pointerEvents: 'auto' as const } : {}),
                        }}
                    >
                        {cta.text}
                    </span>
                </div>
            )}
        </div>
    );
}

export default memo(AdOverlay);
