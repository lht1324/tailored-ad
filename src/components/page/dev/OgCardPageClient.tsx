'use client'

import { useCallback, useRef, useState } from 'react';
import { toJpeg } from 'html-to-image';
import BrandMark from "@/components/public/BrandMark";

/**
 * OG 카드 캡처 페이지 (개발 전용 /dev/og)
 * 1200×630 (링크 공유 카드 표준) 카드를 라이트·다크 2벌 렌더하고,
 * html-to-image로 JPEG 저장한다 (OG는 webp를 까다로워 하는 파서가 많아 JPEG).
 * pixelRatio 2로 캡처해 실제 파일은 2400×1260 — 선명도 확보, 선언 치수는 1200×630.
 * 산출물은 public/og/og.jpg로 넣고 page.tsx OG·twitter 메타에 연결.
 */

const POLAROIDS = [
    { src: '/preview/hero-tumbler-locker.webp', className: 'right-[46px] top-[54px] w-[228px] rotate-[3deg]' },
    { src: '/preview/hero-perfume-dusk.webp', className: 'right-[220px] top-[210px] w-[204px] -rotate-[2.5deg]' },
    { src: '/preview/hero-suit-reading.webp', className: 'right-[64px] top-[330px] w-[220px] rotate-[2deg]' },
];

function OgCard({ dark, innerRef }: { dark: boolean; innerRef: React.Ref<HTMLDivElement> }) {
    return (
        <div
            ref={innerRef}
            className={`relative overflow-hidden ${dark ? 'bg-text1' : 'bg-canvas'}`}
            style={{ width: 1200, height: 630 }}
        >
            {/* 워드마크 — 좌상단 */}
            <div className="absolute left-12 top-10 flex items-center gap-3">
                <BrandMark size={40} />
                <span className={`text-2xl font-bold tracking-tight ${dark ? 'text-canvas' : 'text-text1'}`}>
                    TailoredAd
                </span>
            </div>
            {/* 헤드라인 — 카드 축소에서도 읽히는 크기 */}
            <h1
                className={`absolute left-12 top-[248px] w-[620px] text-[64px] font-bold leading-[1.06] tracking-tight ${
                    dark ? 'text-canvas' : 'text-text1'
                }`}
            >
                Ads that don&apos;t look like AI stock.
            </h1>
            {/* 도메인 — 좌하단 */}
            <p
                className={`absolute bottom-10 left-12 font-mono text-sm uppercase tracking-[0.2em] ${
                    dark ? 'text-canvas/60' : 'text-text2'
                }`}
            >
                tailoredad.com
            </p>
            {/* 폴라로이드 — 우측 미장림 (랜딩 Hero와 동일 어휘) */}
            {POLAROIDS.map((item) => (
                <div key={item.src} aria-hidden="true" className={`absolute ${item.className}`}>
                    <div className="border border-hairline bg-white p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.src} alt="" className="block aspect-[4/5] w-full object-cover" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function OgCardPageClient() {
    const lightRef = useRef<HTMLDivElement>(null);
    const darkRef = useRef<HTMLDivElement>(null);
    const [isBusy, setIsBusy] = useState(false);

    const onClickDownloadOg = useCallback(async (variant: 'light' | 'dark') => {
        const node = variant === 'light' ? lightRef.current : darkRef.current;
        if (!node || isBusy) return;
        setIsBusy(true);
        try {
            // 캡처 직전 준비 게이트 — 폰트·이미지 디코드·레이아웃 2프레임
            await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 5000))]);
            await Promise.all(
                Array.from(node.querySelectorAll('img')).map((img) => img.decode().catch(() => {})),
            );
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            // toJpeg는 data URL을 반환 — 다운로드용 Blob으로 변환
            const dataUrl = await toJpeg(node, {
                quality: 0.92,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
            });
            const blob = await (await fetch(dataUrl)).blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `og-${variant}.jpg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error) {
            console.error('[dev/og] capture failed:', error);
        } finally {
            setIsBusy(false);
        }
    }, [isBusy]);

    return (
        <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-text1">OG card — 1200×630</h1>
                <p className="text-[15px] text-text2">
                    Download the variant you prefer and it becomes the link-share card. Files are 2× (2400×1260), declared as 1200×630.
                </p>
            </header>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">Light</h2>
                    <button
                        type="button"
                        onClick={() => onClickDownloadOg('light')}
                        disabled={isBusy}
                        className="rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                    >
                        {isBusy ? 'Rendering…' : 'Download og-light.jpg'}
                    </button>
                </div>
                <OgCard dark={false} innerRef={lightRef} />
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">Dark</h2>
                    <button
                        type="button"
                        onClick={() => onClickDownloadOg('dark')}
                        disabled={isBusy}
                        className="rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                    >
                        {isBusy ? 'Rendering…' : 'Download og-dark.jpg'}
                    </button>
                </div>
                <OgCard dark={true} innerRef={darkRef} />
            </section>
        </main>
    );
}
