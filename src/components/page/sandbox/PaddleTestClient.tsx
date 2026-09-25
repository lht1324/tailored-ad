'use client'

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Paddle } from "@paddle/paddle-js";
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import PaddleInlineModal from "@/components/page/ad/paddle/PaddleInlineModal";
import { usePaddle } from "@/components/page/ad/paddle/usePaddle";
import { useAuth } from "@/context/AuthContext";
import { paddleClientAPI } from "@/lib/api/client/paddleClientAPI";
import { PLAN_IMAGE_LIMIT, PLAN_PRICE_USD, type PaidPlan } from "@/lib/paddle";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

const TEST_PLANS: { plan: PaidPlan; name: string; price: string; images: string }[] = [
    { plan: SubscriptionPlan.PLAN_1, name: 'Starter', price: '$19 / month', images: '100 images / month' },
    { plan: SubscriptionPlan.PLAN_2, name: 'Growth', price: '$49 / month', images: '500 images / month' },
    { plan: SubscriptionPlan.PLAN_3, name: 'Pro', price: '$99 / month', images: '1,000 images / month' },
];

function PaddleTestClient() {
    const router = useRouter();
    const { user, supabaseUser, isInitializingAuthContext } = useAuth();
    const { paddle, envError } = usePaddle();
    const [busyPlan, setBusyPlan] = useState<PaidPlan | null>(null);
    const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
    const [activePlan, setActivePlan] = useState<(typeof TEST_PLANS)[number] | null>(null);
    const [activeFirstCharge, setActiveFirstCharge] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isInitializingAuthContext) return;
        if (!supabaseUser) {
            router.push('/sign-in?redirectTo=/sandbox/paddle-test');
        }
    }, [isInitializingAuthContext, supabaseUser, router]);

    const userEmail = useMemo(() => user?.email ?? supabaseUser?.email ?? null, [user?.email, supabaseUser?.email]);

    const onClickSubscribe = useCallback(async (t: (typeof TEST_PLANS)[number]) => {
        if (!paddle) return;
        setError(null);
        setBusyPlan(t.plan);
        try {
            const created = await paddleClientAPI.createTransaction(t.plan);
            if (!created) {
                throw new Error('Could not create transaction.');
            }
            // 인라인 모달로 표시 (오버레이 복구 시 아래 2줄을 paddle.Checkout.open 오버레이 호출로 교체)
            setActivePlan(t);
            setActiveFirstCharge(created.discountApplied ? created.firstCharge : null);
            setActiveTransactionId(created.transactionId);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Checkout failed.');
        } finally {
            setBusyPlan(null);
        }
    }, [paddle]);

    const onCloseInlineModal = useCallback(() => {
        setActiveTransactionId(null);
        setActivePlan(null);
        setActiveFirstCharge(null);
    }, []);

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
                    {TEST_PLANS.map((t) => (
                        <div key={t.plan} className="rounded-2xl border border-hairline bg-surface/60 p-6 text-center">
                            <p className="text-lg font-bold">{t.name}</p>
                            <p className="mt-1 text-sm text-text2">{t.price}</p>
                            <p className="mt-1 text-[11px] text-text2">
                                {PLAN_IMAGE_LIMIT[t.plan].toLocaleString()} images / month
                            </p>
                            <button
                                onClick={() => onClickSubscribe(t)}
                                disabled={!paddle || busyPlan !== null}
                                className="mt-5 w-full rounded-xl bg-text1 px-4 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {busyPlan === t.plan ? 'Opening…' : 'Subscribe'}
                            </button>
                        </div>
                    ))}
                </div>
                {error && (
                    <p className="mt-6 text-center text-sm text-red-500">{error}</p>
                )}
            </main>
            {paddle && activeTransactionId && activePlan && (
                <PaddleInlineModal
                    paddle={paddle}
                    transactionId={activeTransactionId}
                    userEmail={userEmail}
                    planName={activePlan.name}
                    basePrice={PLAN_PRICE_USD[activePlan.plan]}
                    imagesLabel={activePlan.images}
                    firstCharge={activeFirstCharge}
                    onClose={onCloseInlineModal}
                />
            )}
        </div>
    );
}

export default memo(PaddleTestClient);
