'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface FungiesCheckoutApi {
    Checkout: {
        open: (options: {
            checkoutUrl: string;
            settings?: { mode?: 'overlay' | 'embed'; frameTarget?: string };
            customFields?: Record<string, string>;
            discountCode?: string;
            customerEmail?: string;
        }) => void;
        close: () => void;
    };
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Fungies?: any;
    }
}

/** fungies.js pinned (exact — 0.x breaking 방지) */
const FUNGIES_CDN = "https://cdn.jsdelivr.net/npm/@fungies/fungies-js@0.7.3/dist/index.min.js";

/** 전역 모양 차이 흡수 — 실측: window.Fungies = { DOM_CHECKOUT_EVENTS, Fungies } */
function resolveFungiesApi(): FungiesCheckoutApi | null {
    const root = window.Fungies;
    const api = root?.Checkout ? root : root?.Fungies;
    return api?.Checkout ? (api as FungiesCheckoutApi) : null;
}

/**
 * fungies.js 공용 초기화 — 환경은 env에서만 읽고 조용히 기본값 추론 금지.
 * fungies:checkout:complete → /checkout/success (적립은 웹훅 담당).
 */
export function useFungies(): { fungies: FungiesCheckoutApi | null; envError: string | null } {
    const router = useRouter();
    const [fungies, setFungies] = useState<FungiesCheckoutApi | null>(null);
    const [envError, setEnvError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        // 동기 setState는 lint(react-hooks/set-state-in-effect) 위반이라 마이크로태스크로 지연
        void Promise.resolve().then(() => {
            if (!live) return;
            const env = process.env.NEXT_PUBLIC_FUNGIES_ENV;
            if (env !== 'sandbox' && env !== 'production') {
                setEnvError("Fungies client is not configured (NEXT_PUBLIC_FUNGIES_ENV). Refusing to run against an unknown environment.");
                return;
            }
            const resolved = resolveFungiesApi();
            if (resolved) {
                setFungies(resolved);
                return;
            }
            const script = document.createElement('script');
            script.src = FUNGIES_CDN;
            script.async = true;
            script.onload = () => {
                if (!live) return;
                const resolved = resolveFungiesApi();
                if (resolved) {
                    setFungies(resolved);
                } else {
                    setEnvError('Failed to initialize Fungies.js');
                }
            };
            script.onerror = () => {
                setEnvError('Failed to load Fungies.js');
            };
            document.head.appendChild(script);
        });
        const onComplete = () => {
            router.push('/checkout/success');
        };
        document.addEventListener('fungies:checkout:complete', onComplete);
        return () => {
            live = false;
            document.removeEventListener('fungies:checkout:complete', onComplete);
        };
    }, [router]);

    return { fungies, envError };
}
