'use client'

import { memo } from 'react';
import { Plus } from 'lucide-react';
import ThemeToggle from "@/components/page/ad/ThemeToggle";

// 가라 사용량 (mock — 실 데이터 연동 시 교체)
const MOCK_USAGE = { used: 847, total: 1000 };

function AppHeader() {
    return (
        <header className="fixed inset-x-0 top-4 z-50 px-4">
            <nav className="mx-auto flex max-w-[87.5rem] items-center justify-between rounded-full border border-hairline bg-surface/70 py-2 pl-5 pr-2 backdrop-blur-xl">
                <a href="/ad" className="flex items-center gap-2.5">
                    <span className="text-[15px] font-bold tracking-tight text-text1">ShortReal</span>
                    <span className="rounded-[6px] bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-canvas">
                        Ad
                    </span>
                </a>

                <div className="hidden items-center gap-3 md:flex">
                    <a
                        href="/ad/projects"
                        className="rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text2 transition-colors hover:bg-canvas hover:text-text1"
                    >
                        Projects
                    </a>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                        {MOCK_USAGE.used.toLocaleString()} / {MOCK_USAGE.total.toLocaleString()} images
                    </span>
                    <span className="rounded-full border border-hairline px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                        Growth plan
                    </span>
                </div>

                <a
                    href="/ad/create"
                    className="flex items-center gap-2 rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                    <span>New generation</span>
                </a>
            </nav>
            <ThemeToggle />
        </header>
    );
}

export default memo(AppHeader);
