'use client'

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import { useAuth } from "@/context/AuthContext";
import { paddleClientAPI } from "@/lib/api/client/paddleClientAPI";
import { PLAN_IMAGE_LIMIT, type PaidPlan } from "@/lib/paddle";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

const TEST_PLANS: { plan: PaidPlan; name: string; price: string }[] = [
    { plan: SubscriptionPlan.PLAN_1, name: 'Starter', price: '$19 / month' },
    { plan: SubscriptionPlan.PLAN_2, name: 'Growth', price: '$49 / month' },
    { plan: SubscriptionPlan.PLAN_3, name: 'Pro', price: '$99 / month' },
];

function PaddleTestClient() {
    const router = useRouter();
    const { user, supabaseUser, isInitializingAuthContext } = useAuth();
    const [paddle, setPaddle] = useState<Paddle | null>(null);
    const [envError, setEnvError] = useState<string | null>(null);
    const [busyPlan, setBusyPlan] = useState<PaidPlan | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isInitializingAuthContext) return;
        if (!supabaseUser) {
            router.push('/sign-in?redirectTo=/sandbox/paddle-test');
            return;
        }
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
                    router.push('/checkout/success');
                }
            },
        }).then((p) => {
            if (live && p) setPaddle(p);
        }).catch((e) => {
            if (live) setEnvError(e instanceof Error ? e.message : 'Failed to initialize Paddle.js');
        });
        return () => {
            live = false;
        };
    }, [isInitializingAuthContext, supabaseUser, router]);

    const userEmail = useMemo(() => user?.email ?? supabaseUser?.email ?? null, [user?.email, supabaseUser?.email]);

    const onClickSubscribe = useCallback(async (plan: PaidPlan) => {
        if (!paddle) return;
        setError(null);
        setBusyPlan(plan);
        try {
            const transactionId = await paddleClientAPI.createTransaction(plan);
            if (!transactionId) {
                throw new Error('Could not create transaction.');
            }
            paddle.Checkout.open({
                transactionId,
                ...(userEmail ? { customer: { email: userEmail } } : {}),
                settings: {
                    displayMode: 'overlay',
                    variant: 'one-page',
                },
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Checkout failed.');
        } finally {
            setBusyPlan(null);
        }
    }, [paddle, userEmail]);

    return (
        <div className="min-h-screen bg-canvas text-text1">
            <AppHeader />
            <main className="mx-auto max-w-3xl px-8 pb-24 pt-32">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                    Sandbox only
                </p>
                <h1 className="mb-3 text-4xl font-bold tracking-tight">
                    Paddle checkout test
                </h1>
                <p className="mb-10 text-base text-text2">
                    Server-created transaction + overlay. Test card 4242 4242 4242 4242.
                </p>
                {envError && (
                    <p className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-500">
                        {envError}
                    </p>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {TEST_PLANS.map(({ plan, name, price }) => (
                        <div key={plan} className="rounded-2xl border border-hairline bg-surface/60 p-6 text-center">
                            <p className="text-lg font-bold">{name}</p>
                            <p className="mt-1 text-sm text-text2">{price}</p>
                            <p className="mt-1 text-[11px] text-text2">
                                {PLAN_IMAGE_LIMIT[plan].toLocaleString()} images / month
                            </p>
                            <button
                                onClick={() => onClickSubscribe(plan)}
                                disabled={!paddle || busyPlan !== null}
                                className="mt-5 w-full rounded-xl bg-text1 px-4 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {busyPlan === plan ? 'Opening…' : 'Subscribe'}
                            </button>
                        </div>
                    ))}
                </div>
                {error && (
                    <p className="mt-6 text-center text-sm text-red-500">{error}</p>
                )}
            </main>
        </div>
    );
}

export default memo(PaddleTestClient);
