'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { usersClientAPI, type UserUsageSummary } from "@/lib/api/client/usersClientAPI";
import { supabase } from "@/lib/supabase/supabaseClient";

type SuccessStatus = 'checking' | 'ready' | 'timeout';

const CONFIRM_TIMEOUT_MS = 30000;

/**
 * 결제 성공 랜딩 — 읽기만 한다. 권리 부여는 웹훅이 DB에 쓴다.
 * Realtime primary (내 grants INSERT 감지) + 30초 타임아웃 폴백 (수동 새로고침).
 */
function CheckoutSuccessClient() {
    const { supabaseUser, isInitializingAuthContext } = useAuth();
    const userId = supabaseUser?.id;
    const [status, setStatus] = useState<SuccessStatus>('checking');
    const [usage, setUsage] = useState<UserUsageSummary | null>(null);

    const fetchUsage = useCallback(async (isCancelled: () => boolean) => {
        if (!userId) return false;
        const summary = await usersClientAPI.getUserUsageSummary(userId);
        if (isCancelled()) return false;
        setUsage(summary);
        if (summary && summary.mode === 'balance' && (summary.granted ?? 0) > 0) {
            setStatus('ready');
            return true;
        }
        return false;
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        let cancelled = false;
        const isCancelled = () => cancelled;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        // 동기 setState는 lint(react-hooks/set-state-in-effect) 위반이라 마이크로태스크로 지연
        void Promise.resolve().then(() => {
            if (cancelled) return;
            void fetchUsage(isCancelled).then((done) => {
                if (cancelled || done) return;
                // Realtime 구독 — 내 grants 행 INSERT 시 즉시 재조회
                void supabase.auth.getUser().then(({ data: { user } }) => {
                    if (cancelled || !user) return;
                    channel = supabase
                        .channel(`checkout-grants-${user.id}-${Math.random().toString(36).slice(2, 6)}`)
                        .on(
                            'postgres_changes',
                            { event: 'INSERT', schema: 'public', table: 'subscription_grants', filter: `user_id=eq.${user.id}` },
                            () => {
                                void fetchUsage(isCancelled);
                            },
                        )
                        .subscribe();
                });
            });
        });

        const timer = setTimeout(() => {
            void Promise.resolve().then(() => {
                if (cancelled) return;
                setStatus((prev) => (prev === 'ready' ? prev : 'timeout'));
            });
        }, CONFIRM_TIMEOUT_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchUsage, userId]);

    const onClickRefresh = useCallback(() => {
        setStatus('checking');
        void fetchUsage(() => false);
    }, [fetchUsage]);

    const remainingText = useMemo(() => {
        if (!usage) return null;
        return `${usage.remaining.toLocaleString()} images available`;
    }, [usage]);

    if (isInitializingAuthContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-text2" strokeWidth={1.8} />
                <h1 className="mt-5 text-2xl font-bold tracking-tight text-text1">Confirming your payment…</h1>
                <p className="mt-3 text-[15px] text-text2">This usually takes a few seconds. Don&apos;t close this tab.</p>
            </main>
        );
    }

    if (!supabaseUser) {
        return (
            <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-text1">Payment received</h1>
                <p className="mt-3 text-[15px] text-text2">Sign in to see your updated balance.</p>
                <Link
                    href="/sign-in?redirectTo=/checkout/success"
                    className="mt-8 inline-flex items-center justify-center rounded-full bg-text1 px-6 py-3 text-[14px] font-semibold text-canvas"
                >
                    Sign in
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
            {status === 'ready' ? (
                <>
                    <CheckCircle2 className="h-12 w-12 text-green-500" strokeWidth={1.8} />
                    <h1 className="mt-5 text-2xl font-bold tracking-tight text-text1">You&apos;re subscribed</h1>
                    {remainingText && (
                        <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.18em] text-text2">
                            {remainingText}
                        </p>
                    )}
                    <div className="mt-8 flex items-center gap-3">
                        <Link
                            href="/create"
                            className="inline-flex items-center justify-center rounded-full bg-text1 px-6 py-3 text-[14px] font-semibold text-canvas"
                        >
                            Start creating
                        </Link>
                        <Link
                            href="/projects"
                            className="inline-flex items-center justify-center rounded-full border border-hairline px-6 py-3 text-[14px] font-semibold text-text1"
                        >
                            View projects
                        </Link>
                    </div>
                </>
            ) : status === 'timeout' ? (
                <>
                    <h1 className="text-2xl font-bold tracking-tight text-text1">Still confirming…</h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-text2">
                        Your payment went through, but we haven&apos;t seen the confirmation yet.
                        It usually lands within a minute.
                    </p>
                    <button
                        type="button"
                        onClick={onClickRefresh}
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-text1 px-6 py-3 text-[14px] font-semibold text-canvas"
                    >
                        <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
                        <span>Check again</span>
                    </button>
                </>
            ) : (
                <>
                    <Loader2 className="h-10 w-10 animate-spin text-text2" strokeWidth={1.8} />
                    <h1 className="mt-5 text-2xl font-bold tracking-tight text-text1">Confirming your payment…</h1>
                    <p className="mt-3 text-[15px] text-text2">This usually takes a few seconds. Don&apos;t close this tab.</p>
                </>
            )}
        </main>
    );
}

export default CheckoutSuccessClient;
