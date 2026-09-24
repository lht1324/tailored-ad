'use client'

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import Reveal from "@/components/page/ad/Reveal";
import { useAuth } from "@/context/AuthContext";
import { polarClientAPI } from "@/lib/api/client/polarClientAPI";
import { usersClientAPI } from "@/lib/api/client/usersClientAPI";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";
import type { PaidPlan } from "@/lib/polar";

interface Plan {
    planId: PaidPlan;
    name: string;
    price: number;
    images: string;
    perImage: number;
    className?: string;
    features: string[];
}

const PLANS: Plan[] = [
    {
        planId: SubscriptionPlan.PLAN_1,
        name: 'Starter',
        price: 19,
        images: '100 images / month',
        perImage: 0.190,
        className: 'md:translate-y-6',
        features: [
            'Quality-gated batches',
            'All sizes: 1:1, 4:5, 9:16, 16:9, 2:3',
            'Multi-reference compositing',
            'Unlimited downloads',
            'Unused images never expire',
            'Deterministic type & logo',
        ],
    },
    {
        planId: SubscriptionPlan.PLAN_2,
        name: 'Growth',
        price: 49,
        images: '500 images / month',
        perImage: 0.098,
        className: '-rotate-[0.5deg] md:translate-y-10',
        features: [
            'Everything in Starter',
            '500 images for continuous testing',
        ],
    },
    {
        planId: SubscriptionPlan.PLAN_3,
        name: 'Pro',
        price: 99,
        images: '1,000 images / month',
        perImage: 0.099,
        className: 'rotate-[0.5deg] md:translate-y-8',
        features: [
            'Everything in Growth',
            '1,000 images for high-volume testing',
        ],
    },
];

function PricingCard({ plan, busy, showDiscountNote, onClickCheckout }: {
    plan: Plan;
    busy: boolean;
    showDiscountNote: boolean;
    onClickCheckout: (planId: PaidPlan) => void;
}) {
    return (
        <div
            className="flex h-full flex-col rounded-[1.5rem] border border-hairline bg-surface p-8 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] md:p-9"
        >
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold tracking-tight text-text1">
                    {plan.name}
                </h3>
                {showDiscountNote && (
                    <span className="whitespace-nowrap rounded-full border border-accent px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                        −50% first month
                    </span>
                )}
            </div>
            <div className="mt-6 flex items-baseline gap-1.5 text-text1">
                {showDiscountNote ? (
                    <>
                        <span className="text-3xl font-medium tracking-tight text-text2/60 line-through">
                            ${plan.price}
                        </span>
                        <span className="text-5xl font-bold tracking-tight">
                            ${(plan.price / 2).toFixed(2)}
                        </span>
                    </>
                ) : (
                    <span className="text-5xl font-bold tracking-tight">
                        ${plan.price}
                    </span>
                )}
                <span className="text-[15px] font-medium text-text2">/ mo</span>
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                {plan.images}
            </p>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                {showDiscountNote ? (
                    <>
                        <span className="text-text2/60 line-through">
                            ${plan.perImage.toFixed(3)}
                        </span>{' '}
                        ${(plan.perImage / 2).toFixed(3)} / image
                    </>
                ) : (
                    <>${plan.perImage.toFixed(3)} / image</>
                )}
            </p>
            {showDiscountNote && (
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                    then ${plan.price}/mo
                </p>
            )}
            <ul className="mt-8 flex-1 space-y-3.5">
                {plan.features.map((feature) => {
                    const unlimited = feature.includes('Unlimited downloads');
                    return (
                        <li
                            key={feature}
                            className={`flex items-start gap-3 text-[14px] leading-snug text-text2 ${unlimited ? 'font-semibold text-text1' : ''}`}
                        >
                            <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" />
                            {feature}
                        </li>
                    );
                })}
            </ul>
            <button
                type="button"
                onClick={() => onClickCheckout(plan.planId)}
                disabled={busy}
                className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-text1 py-3.5 text-[14px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100"
            >
                {busy ? 'Redirecting…' : `Choose ${plan.name}`}
            </button>
        </div>
    );
}

export default function PricingSection() {
    const { supabaseUser } = useAuth();
    const router = useRouter();
    const [busyPlan, setBusyPlan] = useState<PaidPlan | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [discountEligible, setDiscountEligible] = useState(false);

    // 첫주문 할인 표시 — 로그아웃·무료는 표시, 유료 이력만 숨김 (서버는 유료 이력 기준 부과)
    useEffect(() => {
        let live = true;
        // 동기 setState는 lint(react-hooks/set-state-in-effect) 위반이라 마이크로태스크로 지연
        void Promise.resolve().then(() => {
            if (!live) return;
            if (!supabaseUser) {
                setDiscountEligible(true);
                return;
            }
            void usersClientAPI.getUserUsageSummary(supabaseUser.id).then((summary) => {
                if (live) setDiscountEligible(!!summary && !summary.hasPaid);
            });
        });
        return () => {
            live = false;
        };
    }, [supabaseUser?.id]);

    const onClickCheckout = useCallback(async (planId: PaidPlan) => {
        if (!supabaseUser) {
            router.push('/sign-in?redirectTo=/#pricing');
            return;
        }
        // 구독 중이면 체크아웃 대신 Projects로 (이중 구독 방지)
        try {
            const summary = await usersClientAPI.getUserUsageSummary(supabaseUser.id);
            const activePlan = (summary as unknown as { plan?: string | null } | null)?.plan;
            if (activePlan && activePlan !== 'none') {
                router.push('/projects');
                return;
            }
        } catch {
            // 조회 실패 시 체크아웃 계속 (막지 않음)
        }
        setCheckoutError(null);
        setBusyPlan(planId);
        const url = await polarClientAPI.createCheckout(planId);
        setBusyPlan(null);
        if (!url) {
            setCheckoutError('Could not start checkout. Please try again.');
            return;
        }
        window.location.href = url;
    }, [supabaseUser, router]);

    return (
        <section id="pricing" className="scroll-mt-24 border-t border-hairline bg-surface/40 px-4 py-24 md:py-32">
            <div className="mx-auto max-w-6xl">
                <Reveal>
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                            Simple pricing, honest costs.
                        </h2>
                        <p className="mt-5 text-[17px] leading-relaxed text-text2">
                            You pay for the images you generate, not downloads. Every batch is quality-gated. Failures are on us.
                        </p>
                    </div>
                </Reveal>
                <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {PLANS.map((plan, index) => (
                        <Reveal key={plan.name} delay={index * 0.08} className={plan.className}>
                            <PricingCard
                                plan={plan}
                                busy={busyPlan === plan.planId}
                                showDiscountNote={discountEligible && plan.planId === SubscriptionPlan.PLAN_1}
                                onClickCheckout={onClickCheckout}
                            />
                        </Reveal>
                    ))}
                </div>
                {checkoutError && (
                    <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] font-medium text-red-500">
                        {checkoutError}
                    </p>
                )}
                <Reveal delay={0.1}>
                    <ul className="mx-auto mt-16 max-w-2xl space-y-1.5 text-center text-[13px] leading-relaxed text-text2">
                        <li>Start with 10 free images.</li>
                        <li>Plans bill monthly. Image counts are matched to current model pricing.</li>
                        <li>We always honor the count we show you today, and we&apos;ll tell you before anything changes.</li>
                    </ul>
                </Reveal>
            </div>
        </section>
    );
}
