'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DodoPayments } from "dodopayments-checkout";

/**
 * DodoPayments.js 공용 초기화 — 환경은 env에서만 읽고 조용히 기본값 추론 금지.
 * checkout.redirect(결제 완료 후 return_url 이동) → 오버레이 닫고 /checkout/success.
 * 적립은 웹훅 담당. 닫기만 한 경우(checkout.closed)는 이동 없음.
 */
export function useDodo(): { ready: boolean; envError: string | null } {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [envError, setEnvError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        // 동기 setState는 lint(react-hooks/set-state-in-effect) 위반이라 마이크로태스크로 지연
        void Promise.resolve().then(() => {
            if (!live) return;
            const env = process.env.NEXT_PUBLIC_DODO_ENV;
            if (env !== 'test' && env !== 'live') {
                setEnvError("Dodo client is not configured (NEXT_PUBLIC_DODO_ENV). Refusing to run against an unknown environment.");
                return;
            }
            try {
                DodoPayments.Initialize({
                    mode: env,
                    displayType: 'inline',
                    onEvent: (event) => {
                        if (event?.event_type === 'checkout.redirect') {
                            try {
                                DodoPayments.Checkout.close();
                            } catch {
                                /* 이미 닫힘 — 무시 */
                            }
                            router.push('/checkout/success');
                        }
                    },
                });
                setReady(true);
            } catch (e) {
                setEnvError(e instanceof Error ? e.message : 'Failed to initialize DodoPayments.js');
            }
        });
        return () => {
            live = false;
        };
    }, [router]);

    return { ready, envError };
}
