'use client'

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

/**
 * Paddle.js 공용 초기화 — 환경은 env에서만 읽고 조용히 기본값 추론 금지.
 * checkout.completed → /checkout/success (적립은 웹훅 담당).
 */
export function usePaddle(): { paddle: Paddle | null; envError: string | null } {
    const router = useRouter();
    const [paddle, setPaddle] = useState<Paddle | null>(null);
    const paddleRef = useRef<Paddle | null>(null);
    const [envError, setEnvError] = useState<string | null>(null);

    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
        const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
        if (!token || (env !== 'sandbox' && env !== 'production')) {
            setEnvError("Paddle client is not configured (NEXT_PUBLIC_PADDLE_CLIENT_TOKEN / NEXT_PUBLIC_PADDLE_ENV). Refusing to run against an unknown environment.");
            return;
        }
        let live = true;
        initializePaddle({
            token,
            environment: env,
            eventCallback: (event) => {
                if (event?.name === 'checkout.completed') {
                    // 오버레이가 완료 화면을 계속 덮고 있어 명시적으로 닫아야 underlying 페이지가 보인다
                    try {
                        paddleRef.current?.Checkout.close();
                    } catch {
                        /* 이미 닫힘 — 무시 */
                    }
                    router.push('/checkout/success');
                }
            },
            checkout: {
                settings: {
                    displayMode: 'overlay',
                    variant: 'one-page',
                },
            },
        }).then((p) => {
            if (live && p) {
                paddleRef.current = p;
                setPaddle(p);
            }
        }).catch((e) => {
            if (live) setEnvError(e instanceof Error ? e.message : 'Failed to initialize Paddle.js');
        });
        return () => {
            live = false;
        };
    }, [router]);

    return { paddle, envError };
}
