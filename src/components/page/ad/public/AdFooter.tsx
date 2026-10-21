'use client'

import { memo } from 'react';
import Link from 'next/link';
import BrandMark from "@/components/public/BrandMark";

const FOOTER_LINKS = [
    { label: 'Portfolio', href: '#portfolio' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
];

function AdFooter() {
    return (
        <footer className="border-t border-hairline px-4 py-14">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 md:flex-row md:items-center">
                <div>
                    <div className="flex items-center gap-2.5">
                        <BrandMark size={22} />
                        <span className="text-[15px] font-bold tracking-tight text-text1">TailoredAd</span>
                    </div>
                    <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-text2">
                        Ad creatives that don&apos;t look like AI stock. Built for growth teams without a designer.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    {FOOTER_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-[13px] font-medium text-text2 transition-colors duration-200 hover:text-text1"
                        >
                            {link.label}
                        </a>
                    ))}
                    <Link href="/projects" className="text-[13px] font-medium text-text2 transition-colors duration-200 hover:text-text1">
                        TailoredAd Studio
                    </Link>
                </div>
            </div>
            <div className="mx-auto mt-10 flex max-w-6xl flex-col justify-between gap-4 border-t border-hairline pt-8 md:flex-row md:items-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                    © {new Date().getFullYear()} TailoredAd
                </p>
                <div className="flex items-center gap-8">
                    <span className="rotate-[2deg] rounded-[6px] border border-hairline px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                        No AI stock ✌
                    </span>
                    <a href="/legal/terms" className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2 transition-colors duration-200 hover:text-text1">
                        Terms
                    </a>
                    <a href="/legal/privacy" className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2 transition-colors duration-200 hover:text-text1">
                        Privacy
                    </a>
                    <a href="/legal/refunds" className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2 transition-colors duration-200 hover:text-text1">
                        Refunds
                    </a>
                    {/* Bro Find AI 배지 — 검증기가 서버 렌더 HTML을 읽어서 링크를 확인함.
                        JS로 나중에 주입되는 Live widget 방식은 검증이 안 되므로 HTML 이미지로 넣는다. */}
                    <a
                        href="https://brofindai.com/tools/tailoredad-355eab"
                        target="_blank"
                        rel="noopener"
                        className="shrink-0 overflow-hidden rounded-[6px]"
                        aria-label="TailoredAd on Bro Find AI"
                    >
                        {/* 배지 원본 SVG URL을 그대로 써야 검증기가 img src를 찾음 */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://brofindai.com/api/badge/tailoredad-355eab.svg"
                            alt="TailoredAd on Bro Find AI"
                            width={250}
                            height={54}
                            className="h-[32px] w-[150px]"
                        />
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default memo(AdFooter);
