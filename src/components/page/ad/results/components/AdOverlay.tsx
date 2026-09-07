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

function AdOverlay({ design, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl }: AdOverlayProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) {
            return;
        }
        const update = () => setWidth(el.offsetWidth);
        update();

        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const { headline, cta, logo, scrim } = design;

    const headlineTextColor = headlineColor === 'black' ? '#0A0A0A' : '#FFFFFF';
    const headlineScrimClass = headlineColor === 'black' ? 'from-white/70 via-white/20 to-transparent' : 'from-black/65 via-black/25 to-transparent';

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
                        <img src={brandLogoUrl} alt={logo.brand} className="h-auto w-full object-contain" style={{ maxHeight: `${logo.fontSizePct * 6}cqh` }} />
                    ) : (
                        <>
                            <span
                                className="h-[0.5em] w-[0.5em] shrink-0 rounded-full bg-accent"
                                style={{ fontSize: `${logo.fontSizePct}cqh` }}
                            />
                            <span
                                className="font-bold uppercase tracking-[0.08em] text-white"
                                style={{ fontSize: `${logo.fontSizePct}cqh` }}
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
                            fontSize: width > 0 ? (width * headline.fontSizePct) / 100 : 24,
                            color: headlineTextColor,
                            fontFamily: headlineFontFamily ?? undefined,
                            fontWeight: headlineFontWeight ?? undefined,
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
                            width: width > 0 ? (width * cta.widthPct) / 100 : 96,
                            height: width > 0 ? (width * cta.fontSizePct * 2.4) / 100 : 28,
                            fontSize: width > 0 ? (width * cta.fontSizePct) / 100 : 12,
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
