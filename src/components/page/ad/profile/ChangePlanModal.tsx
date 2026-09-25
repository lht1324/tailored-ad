'use client'

import { memo, useCallback, useEffect, useMemo, useState, MouseEvent } from "react";
import { AlertCircle, ArrowUp, Check, Clock, Loader2, X } from "lucide-react";
import { paddleClientAPI } from "@/lib/api/client/paddleClientAPI";
import type { ProductData } from "@/lib/api/types/api/paddle/products/ProductData";
import { PLAN_DISPLAY_NAME, PLAN_IMAGE_LIMIT, type PaidPlan } from "@/lib/paddle";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

interface ChangePlanModalProps {
    currentPlan: PaidPlan | null;
    onConfirmChangePlan: (newPlan: PaidPlan) => Promise<boolean>;
    onClickClose: () => void;
}

const MANAGED_PLANS: PaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

function formatPrice(price: number, currency: string): string {
    const amount = price / 100;
    const fixed = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
    return `$${fixed} ${currency.toUpperCase()} / month`;
}

function ChangePlanModal({
    currentPlan,
    onConfirmChangePlan,
    onClickClose,
}: ChangePlanModalProps) {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isConfirming, setIsConfirming] = useState<boolean>(false);
    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [productList, setProductList] = useState<ProductData[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);

    useEffect(() => {
        let live = true;
        paddleClientAPI.getProducts().then((list) => {
            if (!live) return;
            const managed = (list ?? [])
                .filter((p) => (MANAGED_PLANS as string[]).includes(p.planId))
                .sort((a, b) => a.price - b.price);
            setProductList(managed);
            setIsLoading(false);
        }).catch(() => {
            if (!live) return;
            setIsLoading(false);
        });
        return () => {
            live = false;
        };
    }, []);

    const productOf = useCallback((plan: PaidPlan): ProductData | undefined => {
        return productList.find((p) => p.planId === plan);
    }, [productList]);

    const selectedProduct = useMemo(() => {
        return selectedPlan ? productOf(selectedPlan) : undefined;
    }, [selectedPlan, productOf]);

    const isUpgrade = useMemo(() => {
        if (!selectedPlan || !currentPlan) return false;
        return PLAN_IMAGE_LIMIT[selectedPlan] > PLAN_IMAGE_LIMIT[currentPlan];
    }, [selectedPlan, currentPlan]);

    const noticeText = useMemo(() => {
        if (!selectedPlan || !selectedProduct) return "Select a plan to see details.";
        if (selectedPlan === currentPlan) return "This is your current plan.";
        if (isUpgrade) return "Upgrade takes effect right away. The price difference is charged immediately, and the extra images land in your balance.";
        return "Downgrade takes effect at the next billing cycle. Your current images stay untouched.";
    }, [selectedPlan, selectedProduct, currentPlan, isUpgrade]);

    const isChangeEnabled = useMemo(() => {
        return !!selectedPlan && !!selectedProduct && selectedPlan !== currentPlan && !isConfirming;
    }, [selectedPlan, selectedProduct, currentPlan, isConfirming]);

    const onClickOverlay = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !isConfirming) {
            onClickClose();
        }
    }, [onClickClose, isConfirming]);

    const onSelectPlan = useCallback((plan: PaidPlan) => {
        setSelectedPlan((prev) => (prev !== plan ? plan : null));
        setConfirmError(null);
    }, []);

    const onClickChange = useCallback(() => {
        if (selectedPlan && selectedPlan !== currentPlan) {
            setShowConfirm(true);
            setConfirmError(null);
        }
    }, [selectedPlan, currentPlan]);

    const onClickConfirm = useCallback(async () => {
        if (!selectedPlan) return;
        setIsConfirming(true);
        setConfirmError(null);
        try {
            const ok = await onConfirmChangePlan(selectedPlan);
            if (!ok) {
                setConfirmError("Failed to change plan. Please try again.");
            }
        } catch {
            setConfirmError("Failed to change plan. Please try again.");
        } finally {
            setIsConfirming(false);
        }
    }, [selectedPlan, onConfirmChangePlan]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClickOverlay}
        >
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-hairline bg-surface shadow-2xl">
                <div className="sticky top-0 z-10 border-b border-hairline bg-surface/95 px-8 py-6 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-text1">
                                Change Plan
                            </h2>
                            <p className="mt-1 text-sm text-text2">
                                Current Plan: <span className="font-semibold text-text1">{currentPlan ? PLAN_DISPLAY_NAME[currentPlan] : '-'}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClickClose}
                            className="rounded-full p-2 transition-colors hover:bg-canvas"
                            aria-label="Close modal"
                        >
                            <X className="h-5 w-5 text-text2" />
                        </button>
                    </div>
                </div>

                <div className="relative px-8 py-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-text2" />
                                <p className="font-medium text-text2">Fetching plans...</p>
                            </div>
                        </div>
                    ) : productList.length === 0 ? (
                        <p className="py-16 text-center text-sm text-text2">
                            Could not load plans. Please close and try again.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {MANAGED_PLANS.map((plan) => {
                                const product = productOf(plan);
                                if (!product) return null;
                                // 현재 플랜 판정은 DB 단일 소스 (Paddle items는 예약 시 미래값이라 이중 뱃지 원인)
                                const isCurrent = plan === currentPlan;
                                const isSelected = selectedPlan === plan;
                                return (
                                    <button
                                        key={plan}
                                        onClick={() => !isCurrent && onSelectPlan(plan)}
                                        disabled={isCurrent}
                                        className={`relative rounded-2xl border p-6 text-left transition-all ${
                                            isSelected
                                                ? 'border-text1 bg-canvas shadow-lg'
                                                : isCurrent
                                                  ? 'cursor-default border-hairline bg-canvas opacity-60'
                                                  : 'border-hairline bg-surface hover:border-text2'
                                        }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-text1">
                                                <Check className="h-4 w-4 text-canvas" strokeWidth={3} />
                                            </span>
                                        )}
                                        <p className="text-lg font-bold text-text1">
                                            {PLAN_DISPLAY_NAME[plan] ?? product.name}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-text1">
                                            {formatPrice(product.price, product.currency)}
                                        </p>
                                        <p className="mt-1 text-[13px] text-text2">
                                            {PLAN_IMAGE_LIMIT[plan].toLocaleString()} images / month
                                        </p>
                                        {isCurrent && (
                                            <p className="mt-3 text-[11px] font-bold tracking-wider text-text2 uppercase">
                                                Current plan
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {!isLoading && productList.length > 0 && (
                        <div className="mt-8 flex flex-col items-center gap-5">
                            {noticeText && (
                                <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-6 py-2.5">
                                    <p className="text-xs font-medium text-text2">
                                        {noticeText}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={onClickChange}
                                disabled={!isChangeEnabled}
                                className={`rounded-xl px-10 py-3 text-sm font-bold transition-all ${
                                    isChangeEnabled
                                        ? 'bg-text1 text-canvas hover:opacity-90'
                                        : 'cursor-not-allowed bg-canvas text-text2 opacity-50'
                                }`}
                            >
                                Change Plan
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showConfirm && selectedProduct && selectedPlan && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={() => !isConfirming && setShowConfirm(false)}
                >
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative p-8">
                            <div className="mb-6 flex justify-center">
                                <div className="rounded-full border border-hairline bg-canvas p-4">
                                    {isUpgrade ? (
                                        <ArrowUp className="h-8 w-8 text-text1" />
                                    ) : (
                                        <Clock className="h-8 w-8 text-text2" />
                                    )}
                                </div>
                            </div>
                            <h3 className="mb-2 text-center text-2xl font-bold text-text1">
                                Change to {PLAN_DISPLAY_NAME[selectedPlan]}?
                            </h3>
                            <p className="mb-6 text-center text-text2">
                                {formatPrice(selectedProduct.price, selectedProduct.currency)}
                            </p>
                            <div className="mb-6 rounded-xl border border-hairline bg-canvas p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-text2" />
                                    <div className="flex-1">
                                        {isUpgrade ? (
                                            <>
                                                <p className="mb-1 text-sm font-semibold text-text1">
                                                    Immediate Charge
                                                </p>
                                                <p className="text-xs leading-relaxed text-text2">
                                                    The price difference is charged right away, and the extra images are added to your balance.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="mb-1 text-sm font-semibold text-text1">
                                                    Next Billing Cycle
                                                </p>
                                                <p className="text-xs leading-relaxed text-text2">
                                                    Changes take effect at the next billing cycle. Your current balance stays untouched.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {confirmError && (
                                <p className="mb-4 text-center text-xs font-medium text-red-500">
                                    {confirmError}
                                </p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => !isConfirming && setShowConfirm(false)}
                                    disabled={isConfirming}
                                    className="flex-1 rounded-xl bg-canvas px-6 py-3 text-sm font-bold text-text2 transition-colors hover:text-text1 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onClickConfirm}
                                    disabled={isConfirming}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-text1 px-6 py-3 text-sm font-bold text-canvas transition-all hover:opacity-90 disabled:opacity-50"
                                >
                                    {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(ChangePlanModal);
