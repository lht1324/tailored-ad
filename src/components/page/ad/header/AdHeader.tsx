'use client'

import { memo } from 'react';

const NAV_ITEMS = [
    { label: 'Portfolio', href: '#portfolio' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
];

function AdHeader() {
    return (
        <header className="fixed inset-x-0 top-4 z-50 px-4">
            <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-hairline bg-surface/70 py-2 pl-5 pr-2 backdrop-blur-xl">
                <a href="#top" className="flex items-center gap-2.5">
                    <span className="text-[15px] font-bold tracking-tight text-text1">ShortReal</span>
                    <span className="rounded-[6px] bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-canvas">
                        Ad
                    </span>
                </a>
                <div className="hidden items-center gap-1 md:flex">
                    {NAV_ITEMS.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className="rounded-full px-4 py-2 text-[13px] font-medium text-text2 transition-colors duration-200 hover:text-text1"
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
                <a
                    href="#pricing"
                    className="rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    Start creating
                </a>
            </nav>
        </header>
    );
}

export default memo(AdHeader);
