'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HeroWall from "@/components/page/ad/landing/hero-section/HeroWall";
import { useAuth } from "@/context/AuthContext";
import { usersClientAPI, type UserUsageSummary } from "@/lib/api/client/usersClientAPI";

export default function HeroSection() {
    const { supabaseUser } = useAuth();
    const userId = supabaseUser?.id;
    const [usage, setUsage] = useState<UserUsageSummary | null>(null);

    const fetchUsage = useCallback(async (isCancelled: () => boolean) => {
        if (!userId) return;
        const summary = await usersClientAPI.getUserUsageSummary(userId);
        if (isCancelled()) return;
        setUsage(summary);
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        // 동기 setState는 lint(react-hooks/set-state-in-effect) 위반이라 마이크로태스크로 지연
        void Promise.resolve().then(() => {
            if (cancelled) return;
            void fetchUsage(() => cancelled);
        });
        return () => {
            cancelled = true;
        };
    }, [fetchUsage, userId]);

    // 비로그인 → /create (proxy가 로그인 경유 후 복귀)
    // trial + 잔액 0 → /#pricing / 그 외 로그인 → /projects
    const ctaHref = useMemo(() => {
        if (!userId) return '/create';
        if (usage && usage.remaining <= 0) {
            const paid = usage.plan != null && usage.plan !== 'none';
            return paid ? '/projects' : '/#pricing';
        }
        return '/projects';
    }, [userId, usage]);
    return (
        <section id="top" className="relative overflow-hidden px-4 pb-24 pt-32 md:pb-32 md:pt-40">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse 70% 50% at 70% 20%, color-mix(in srgb, var(--ad-surface) 85%, transparent) 0%, transparent 100%)',
                }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-canvas to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent" />
            <div className="relative mx-auto flex min-h-[32.5rem] max-w-[90rem] md:min-h-[38.75rem]">
                <HeroWall />
                <div className="relative z-10 mx-auto my-auto max-w-2xl rounded-2xl border border-hairline bg-canvas/85 p-7 md:p-9">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                        AI Ad Creative Studio
                    </p>
                    <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-text1 md:text-6xl">
                        Ads that don&apos;t look like AI stock.
                    </h1>
                    <p className="mt-6 max-w-md text-[17px] leading-relaxed text-text2">
                        Brand-consistent creatives for teams without a designer. Upload your product and get platform-ready ads in minutes.
                    </p>
                    <div className="mt-10 flex flex-wrap items-center gap-4">
                        <Link
                            href={ctaHref}
                            className="group inline-flex items-center gap-3 rounded-full bg-text1 py-3 pl-6 pr-3 text-[15px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Create your first ad
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas/10 transition-transform duration-200 group-hover:translate-x-0.5">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </span>
                        </Link>
                        <a
                            href="#portfolio"
                            className="text-[15px] font-medium text-text2 underline decoration-hairline underline-offset-4 transition-colors duration-200 hover:text-text1"
                        >
                            See the portfolio
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}