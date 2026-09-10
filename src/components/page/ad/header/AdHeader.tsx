'use client'

import { memo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
    { label: 'Portfolio', href: '#portfolio' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
];

function AdHeader() {
    const { supabaseUser, isInitializingAuthContext } = useAuth();
    const isSignedIn = supabaseUser != null;

    return (
        <header className="fixed inset-x-0 top-4 z-50 px-4">
            <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-hairline bg-surface/70 py-2 pl-5 pr-2 backdrop-blur-xl">
                <a href="#top" className="flex items-center gap-2.5">
                    <span className="text-[15px] font-bold tracking-tight text-text1">TailorAd</span>
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
                <div className="flex items-center gap-1">
                    {isInitializingAuthContext ? (
                        <span className="h-9 w-28 animate-pulse rounded-full bg-canvas" aria-hidden="true" />
                    ) : isSignedIn ? (
                        <Link
                            href="/projects"
                            className="inline-flex items-center gap-1.5 rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Open studio
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className="rounded-full px-4 py-2 text-[13px] font-medium text-text2 transition-colors duration-200 hover:text-text1"
                            >
                                Sign in
                            </Link>
                            <a
                                href="#pricing"
                                className="rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Start creating
                            </a>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}

export default memo(AdHeader);
