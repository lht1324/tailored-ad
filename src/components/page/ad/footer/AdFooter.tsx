'use client'

import { memo } from 'react';

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
                        <span className="text-[15px] font-bold tracking-tight text-text1">ShortReal</span>
                        <span className="rounded-[6px] bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-canvas">
                            Ad
                        </span>
                    </div>
                    <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-text2">
                        Ad creatives that don't look like AI stock. Built for growth teams without a designer.
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
                    <a href="/" className="text-[13px] font-medium text-text2 transition-colors duration-200 hover:text-text1">
                        ShortReal Video Studio
                    </a>
                </div>
            </div>
            <div className="mx-auto mt-10 flex max-w-6xl flex-col justify-between gap-4 border-t border-hairline pt-8 md:flex-row md:items-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                    © {new Date().getFullYear()} ShortReal
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
                </div>
            </div>
        </footer>
    );
}

export default memo(AdFooter);
