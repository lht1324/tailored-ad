'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from "@/lib/auth/client";

/**
 * OAuth verifier 교환 페이지 — 서버 콜백에 세션이 없을 때 여기로 온다.
 * SDK가 URL의 verifier를 교환(퍼스트파티 쿠키 설정)하면 서버 콜백으로 복귀.
 * 10초 안에 세션 안 생기면 실패 처리.
 */
export default function CallbackSessionClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        let cancelled = false;
        const redirectTo = searchParams.get('redirectTo');
        const backTo = `/callback/auth${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;
        (async () => {
            for (let i = 0; i < 20 && !cancelled; i++) {
                try {
                    const { data } = await authClient.getSession();
                    if (!cancelled && data?.session) {
                        router.replace(backTo);
                        return;
                    }
                } catch {
                    /* 재시도 */
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            if (!cancelled) router.replace('/sign-in?error=oauth_failed');
        })();
        return () => {
            cancelled = true;
        };
    }, [router, searchParams]);

    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                Signing you in…
            </p>
        </main>
    );
}
