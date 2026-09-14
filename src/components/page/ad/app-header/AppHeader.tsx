'use client'

import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ThemeToggle from "@/components/page/ad/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { usersClientAPI, type UserUsageSummary } from "@/lib/api/client/usersClientAPI";

function planLabel(plan: string | null | undefined): string {
    if (!plan || plan === 'none') return 'Free plan';
    return plan;
}

function AppHeader() {
    const { supabaseUser } = useAuth();
    const [usage, setUsage] = useState<UserUsageSummary | null>(null);

    useEffect(() => {
        if (!supabaseUser) {
            setUsage(null);
            return;
        }
        let live = true;
        void usersClientAPI.getUserUsageSummary(supabaseUser.id).then((result) => {
            if (live) setUsage(result);
        });
        return () => {
            live = false;
        };
    }, [supabaseUser?.id]);
    return (
        <header className="fixed inset-x-0 top-4 z-50 px-4">
            <nav className="mx-auto flex max-w-[87.5rem] items-center justify-between rounded-full border border-hairline bg-surface/70 py-2 pl-5 pr-2 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2.5">
                    <span className="text-[15px] font-bold tracking-tight text-text1">TailoredAd</span>
                    <span className="rounded-[6px] bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-canvas">
                        Ad
                    </span>
                </Link>

                <div className="hidden items-center gap-3 md:flex">
                    <Link
                        href="/projects"
                        className="rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text2 transition-colors hover:bg-canvas hover:text-text1"
                    >
                        Projects
                    </Link>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                        {usage
                            ? usage.mode === 'balance'
                                ? `${usage.remaining.toLocaleString()} images left`
                                : `${usage.used.toLocaleString()} / ${(usage.limit ?? 0).toLocaleString()} images`
                            : '… images'}
                    </span>
                    <span className="rounded-full border border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                        {usage ? planLabel(usage.plan) : '… plan'}
                    </span>
                </div>

                <Link
                    href="/create"
                    className="flex items-center gap-2 rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                    <span>New generation</span>
                </Link>
            </nav>
            <ThemeToggle />
        </header>
    );
}

export default memo(AppHeader);
