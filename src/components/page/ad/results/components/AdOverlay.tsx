'use client'

import { memo, useEffect, useRef, useState } from 'react';
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";

interface AdOverlayProps {
    design: AdDesignLayout;
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: 'white' | 'black' | null;
    brandLogoUrl?: string | null;
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

function AdOverlay({ design, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl }: AdOverlayProps) {
    const ref = useRef<HTMLDivElement>(null);
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

    const headlineTextColor = headlineColor === 'black' ? '#0A0A0A' : '#FFFFFF';
    const headlineScrimClass = headlineColor === 'black' ? 'from-white/70 via-white/20 to-transparent' : 'from-black/65 via-black/25 to-transparent';

    // 계약(analysis 프롬프트): fontSizePct는 canvas HEIGHT의 %. 너비 기준이 아님.
    // logo의 cqh 단위도 조상 컨테이너 쿼리 없이 뷰포트 기준으로 폴백되던 버그였음. px 계산으로 통일.
    const logoFontSize = size.h > 0 && logo ? (size.h * logo.fontSizePct) / 100 : 12;
    const textVisibility = fontReady ? 'visible' : 'hidden';

    return (
        <div ref={ref} className="pointer-events-none absolute inset-0 select-none">
            {scrim && (
                <div className={`absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t ${headlineScrimClass}`} />
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
                    className="absolute"
                    style={{
                        left: `${headline.x}%`,
                        top: `${headline.y}%`,
                        width: `${headline.maxWidth}%`,
                        textAlign: headline.align,
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
                        className="flex items-center justify-center rounded-full bg-white font-semibold text-black"
                        style={{
                            width: size.w > 0 ? (size.w * cta.widthPct) / 100 : 96,
                            height: size.h > 0 ? (size.h * cta.fontSizePct * 2.4) / 100 : 28,
                            fontSize: size.h > 0 ? (size.h * cta.fontSizePct) / 100 : 12,
                            visibility: textVisibility,
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
