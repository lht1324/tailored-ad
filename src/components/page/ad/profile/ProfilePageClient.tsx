'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, CreditCard, Images, ImagePlus, Loader2, Mail, Receipt, User as UserIcon, X } from "lucide-react";
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import DefaultModal from "@/components/public/DefaultModal";
import ChangePlanModal from "@/components/page/ad/profile/ChangePlanModal";
import OrderItem from "@/components/page/ad/profile/OrderItem";
import { useAuth } from "@/context/AuthContext";
import { usersClientAPI, type ProfileLogo, type UserUsageSummary } from "@/lib/api/client/usersClientAPI";
import { dodoClientAPI } from "@/lib/api/client/dodoClientAPI";
import type { OrderData } from "@/lib/api/types/api/dodo/orders/OrderData";
import type { SubscriptionData } from "@/lib/api/types/api/dodo/subscriptions/SubscriptionData";
import { PLAN_DISPLAY_NAME, type DodoPaidPlan as PaidPlan } from "@/lib/dodo";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatAmount(cents: number, currency: string): string {
    const amount = cents / 100;
    const fixed = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
    return `$${fixed} ${currency.toUpperCase()}`;
}

function ProfilePageClient() {
    const router = useRouter();
    const { user, supabaseUser, signOut, isInitializingAuthContext } = useAuth();
    const userEmail = user?.email ?? null;

    const [isLoading, setIsLoading] = useState(true);
    const [headerReady, setHeaderReady] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [usage, setUsage] = useState<UserUsageSummary | null>(null);
    const [orderList, setOrderList] = useState<OrderData[]>([]);
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
    const [showChangePlanModal, setShowChangePlanModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [revertTarget, setRevertTarget] = useState<'plan-change' | 'cancellation' | null>(null);
    const [isReverting, setIsReverting] = useState(false);
    /** 결제 조회 실패 여부 — 실패(null 아님)와 구독 없음(null)을 구분 */
    const [billingError, setBillingError] = useState(false);
    const [officialLogo, setOfficialLogo] = useState<ProfileLogo | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const onHeaderUsageLoaded = useCallback(() => {
        setHeaderReady(true);
    }, []);

    const loadBilling = useCallback(async (email: string) => {
        try {
            const [orders, subscription] = await Promise.all([
                dodoClientAPI.getOrders(email),
                dodoClientAPI.getSubscription(email),
            ]);
            setOrderList((orders ?? []).sort((a, b) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }));
            setSubscriptionData(subscription);
            setBillingError(false);
        } catch (error) {
            console.error("Error loading billing data:", error);
            setBillingError(true);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        if (!supabaseUser || !userEmail) return;
        setIsLoading(true);
        try {
            const [summary, profileLogo] = await Promise.all([
                usersClientAPI.getUserUsageSummary(supabaseUser.id),
                usersClientAPI.getProfileLogo(),
                loadBilling(userEmail),
            ]);
            setUsage(summary);
            setOfficialLogo(profileLogo);
        } catch (error) {
            console.error("Error loading profile data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabaseUser, userEmail, loadBilling]);

    const onRetryBilling = useCallback(() => {
        void loadAllData();
    }, [loadAllData]);

    useEffect(() => {
        if (isInitializingAuthContext) return;
        if (!supabaseUser) {
            router.push('/sign-in?redirectTo=/profile');
            return;
        }
        const run = async () => {
            await loadAllData();
        };
        void run();
    }, [isInitializingAuthContext, supabaseUser, loadAllData, router]);

    const planDisplayName = useMemo(() => {
        const plan = usage?.plan ?? user?.plan ?? null;
        if (!plan) return 'Free plan';
        return PLAN_DISPLAY_NAME[plan] ?? plan;
    }, [usage?.plan, user?.plan]);

    const currentPaidPlan = useMemo((): PaidPlan | null => {
        const plan = usage?.plan ?? user?.plan ?? null;
        if (plan === SubscriptionPlan.PLAN_1 || plan === SubscriptionPlan.PLAN_2 || plan === SubscriptionPlan.PLAN_3) {
            return plan;
        }
        return null;
    }, [usage?.plan, user?.plan]);

    const subscriptionStatus = useMemo(() => {
        if (!subscriptionData) return null;
        const statusMap: Record<string, string> = {
            'active': 'Active',
            'trialing': 'Trial',
            'past_due': 'Past Due',
            'canceled': 'Canceled',
            'unpaid': 'Unpaid',
        };
        return statusMap[subscriptionData.status] ?? subscriptionData.status;
    }, [subscriptionData]);

    const onClickSignOut = useCallback(async () => {
        setIsSigningOut(true);
        try {
            await signOut();
            router.push('/');
        } finally {
            setIsSigningOut(false);
        }
    }, [signOut, router]);

    const onSelectLogoFile = useCallback(async (file: File | null) => {
        if (!file || isUploadingLogo) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setLogoError('Please upload a JPG, PNG, or WebP image.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setLogoError('File is too large. Keep it under 10 MB.');
            return;
        }
        setLogoError(null);
        setIsUploadingLogo(true);
        try {
            const uploaded = await usersClientAPI.uploadProfileLogo(file);
            if (uploaded) {
                setOfficialLogo(uploaded);
            } else {
                setLogoError('Failed to upload logo. Please try again.');
            }
        } finally {
            setIsUploadingLogo(false);
        }
    }, [isUploadingLogo]);

    const onClickRemoveLogo = useCallback(async () => {
        if (isUploadingLogo) return;
        setIsUploadingLogo(true);
        try {
            const ok = await usersClientAPI.deleteProfileLogo();
            if (ok) {
                setOfficialLogo(null);
                setLogoError(null);
            } else {
                setLogoError('Failed to remove logo. Please try again.');
            }
        } finally {
            setIsUploadingLogo(false);
        }
    }, [isUploadingLogo]);

    const onConfirmChangePlan = useCallback(async (newPlan: PaidPlan): Promise<boolean> => {
        const ok = await dodoClientAPI.changePlan(newPlan);
        if (!ok) return false;
        setShowChangePlanModal(false);
        if (userEmail) {
            await loadBilling(userEmail);
            const summary = supabaseUser ? await usersClientAPI.getUserUsageSummary(supabaseUser.id) : null;
            setUsage(summary);
        }
        return true;
    }, [userEmail, supabaseUser, loadBilling]);

    const onConfirmCancelSubscription = useCallback(async () => {
        if (!subscriptionData?.id) return;
        setIsCanceling(true);
        try {
            const ok = await dodoClientAPI.cancelSubscription(subscriptionData.id);
            setShowCancelModal(false);
            if (ok && userEmail) {
                await loadBilling(userEmail);
            } else if (!ok) {
                alert("Failed to cancel subscription. Please try again later.");
            }
        } finally {
            setIsCanceling(false);
        }
    }, [subscriptionData?.id, userEmail, loadBilling]);

    const onConfirmRevert = useCallback(async () => {
        if (!revertTarget) return;
        setIsReverting(true);
        try {
            const ok = await dodoClientAPI.revertScheduled(revertTarget);
            setRevertTarget(null);
            if (ok && userEmail) {
                await loadBilling(userEmail);
            } else if (!ok) {
                alert("Failed to revert. Please try again later.");
            }
        } finally {
            setIsReverting(false);
        }
    }, [revertTarget, userEmail, loadBilling]);

    return (
        <div className="min-h-screen bg-canvas text-text1">
            <AppHeader onUsageLoaded={onHeaderUsageLoaded} />

            {(isLoading || !headerReady || isInitializingAuthContext) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-text2" />
                        <p className="text-sm font-medium text-text2">Loading Profile...</p>
                    </div>
                </div>
            )}

            <main className="mx-auto max-w-5xl px-8 pb-24 pt-32">
                <div className="mb-10">
                    <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
                        Profile
                    </h1>
                    <p className="text-base text-text2">
                        Manage your account, images, and subscription.
                    </p>
                </div>

                {/* Account */}
                <div className="mb-6 overflow-hidden rounded-2xl border border-hairline bg-surface/60">
                    <div className="border-b border-hairline p-8">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="relative">
                                {user?.avatar_url ? (
                                    <Image
                                        src={user.avatar_url}
                                        alt={user.name}
                                        width={80}
                                        height={80}
                                        className="h-20 w-20 rounded-full border border-hairline object-cover"
                                    />
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-hairline bg-canvas">
                                        <UserIcon size={32} className="text-text2" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="mb-1 truncate text-2xl font-bold">{user?.name ?? '-'}</h2>
                                <div className="flex items-center gap-2 text-sm text-text2">
                                    <Mail size={14} />
                                    <span className="truncate">{user?.email ?? '-'}</span>
                                </div>
                            </div>
                            <button
                                onClick={onClickSignOut}
                                disabled={isSigningOut}
                                className="flex items-center gap-2 rounded-xl border border-hairline px-5 py-2.5 text-sm font-bold text-text2 transition-colors hover:bg-canvas hover:text-text1 disabled:opacity-50"
                            >
                                {isSigningOut && <Loader2 size={14} className="animate-spin" />}
                                <span>Sign out</span>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
                        <div className="flex flex-col items-center p-6 md:items-start">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-text2 uppercase">
                                <Images size={13} />
                                <span>Images left</span>
                            </div>
                            <div className="text-xl font-semibold">
                                {usage ? usage.remaining.toLocaleString() : '-'}
                            </div>
                            <p className="mt-1 max-w-full truncate text-[11px] text-text2">
                                {usage ? `${usage.used.toLocaleString()} used of ${usage.granted.toLocaleString()} granted` : 'Unused images never expire'}
                            </p>
                        </div>
                        <div className="flex flex-col items-center p-6 md:items-start">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-text2 uppercase">
                                <CreditCard size={13} />
                                <span>Current Plan</span>
                            </div>
                            <div className="text-xl font-semibold">{planDisplayName}</div>
                            <p className="mt-1 max-w-full truncate text-[11px] text-text2">
                                {usage?.periodEnd ? `Renews ${formatDate(usage.periodEnd)}` : 'Free trial'}
                            </p>
                        </div>
                        <div className="flex flex-col items-center p-6 md:items-start">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-text2 uppercase">
                                <Calendar size={13} />
                                <span>Member Since</span>
                            </div>
                            <div className="text-xl font-semibold">{formatDate(user?.created_at)}</div>
                        </div>
                    </div>
                </div>

                {/* Official logo + Billing — 2열 (모바일 스택) */}
                <div className="mb-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
                {/* Official logo */}
                <div className="flex flex-col justify-center rounded-2xl border border-hairline bg-surface/60 p-8">
                    <h3 className="mb-2 text-sm font-semibold tracking-wider text-text1 uppercase">
                        Official logo
                    </h3>
                    <p className="mb-6 text-sm leading-relaxed text-text2">
                        Prefilled as the brand logo in Create. Transparent PNG works best.
                    </p>
                    <div className="flex flex-wrap items-center gap-6">
                        {officialLogo ? (
                            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-hairline bg-canvas">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={officialLogo.signedUrl} alt={officialLogo.fileName} className="h-full w-full object-contain" />
                            </div>
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-hairline bg-canvas">
                                <ImagePlus size={24} className="text-text2" />
                            </div>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                            {officialLogo && (
                                <p className="truncate text-sm font-medium text-text1">{officialLogo.fileName}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => logoInputRef.current?.click()}
                                    disabled={isUploadingLogo}
                                    className="flex items-center gap-2 rounded-xl bg-text1 px-5 py-2.5 text-sm font-bold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                    {isUploadingLogo && <Loader2 size={14} className="animate-spin" />}
                                    <span>{officialLogo ? 'Replace' : 'Upload'}</span>
                                </button>
                                {officialLogo && (
                                    <button
                                        onClick={onClickRemoveLogo}
                                        disabled={isUploadingLogo}
                                        className="flex items-center gap-2 rounded-xl border border-hairline px-5 py-2.5 text-sm font-medium text-text2 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                                    >
                                        <X size={14} />
                                        <span>Remove</span>
                                    </button>
                                )}
                            </div>
                            {logoError && (
                                <p className="text-[12px] font-medium text-red-500">{logoError}</p>
                            )}
                        </div>
                    </div>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => {
                            void onSelectLogoFile(event.target.files?.[0] ?? null);
                            event.target.value = '';
                        }}
                    />
                </div>

                {/* Subscription */}
                {billingError && !subscriptionData ? (
                    <div className="flex flex-col justify-center rounded-2xl border border-hairline bg-surface/60 p-8 text-center">
                        <h3 className="mb-2 text-xl font-bold">Could not load billing</h3>
                        <p className="mb-6 text-sm leading-relaxed text-text2">
                            Your subscription info is temporarily unavailable. Your images are safe.
                        </p>
                        <button
                            onClick={onRetryBilling}
                            className="w-full rounded-xl bg-text1 py-3 text-sm font-bold text-canvas transition-opacity hover:opacity-90"
                        >
                            Retry
                        </button>
                    </div>
                ) : subscriptionData ? (
                    <div className="rounded-2xl border border-hairline bg-surface/60 p-8">
                        <h3 className="mb-6 text-sm font-semibold tracking-wider text-text1 uppercase">
                            Subscription
                        </h3>
                        {subscriptionData.cancelAtPeriodEnd && (
                            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                                <h4 className="mb-1 text-sm font-semibold text-red-500">Subscription Ending</h4>
                                <p className="text-xs leading-relaxed text-red-500/70">
                                    Your subscription will end on {formatDate(subscriptionData.currentPeriodEnd)}. Your remaining images stay available.
                                </p>
                                <button
                                    onClick={() => setRevertTarget('cancellation')}
                                    className="mt-3 rounded-xl border border-red-500/20 bg-surface px-4 py-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-500/10"
                                >
                                    Keep subscription
                                </button>
                            </div>
                        )}
                        {subscriptionData.scheduledPlan && !subscriptionData.cancelAtPeriodEnd && (
                            <div className="mb-6 rounded-xl border border-hairline bg-canvas p-5">
                                <h4 className="mb-1 text-sm font-semibold">Scheduled Change</h4>
                                <p className="text-xs leading-relaxed text-text2">
                                    {currentPaidPlan ? (PLAN_DISPLAY_NAME[currentPaidPlan] ?? currentPaidPlan) : subscriptionData.productName} → {PLAN_DISPLAY_NAME[subscriptionData.scheduledPlan] ?? subscriptionData.scheduledPlan} on {formatDate(subscriptionData.scheduledAppliesAt)}. Your current plan stays active until then.
                                </p>
                                <button
                                    onClick={() => setRevertTarget('plan-change')}
                                    className="mt-3 rounded-xl border border-hairline bg-surface px-4 py-2 text-xs font-bold text-text2 transition-colors hover:text-text1"
                                >
                                    Cancel scheduled change
                                </button>
                            </div>
                        )}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between border-b border-hairline py-2">
                                <span className="text-text2">Status</span>
                                <span className="font-medium">{subscriptionStatus ?? '-'}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-hairline py-2">
                                <span className="text-text2">Price</span>
                                <span className="font-medium">{formatAmount(subscriptionData.amount, subscriptionData.currency)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-hairline py-2">
                                <span className="text-text2">Billing Cycle</span>
                                <span className="font-medium capitalize">{subscriptionData.billingCycle}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-hairline py-2">
                                <span className="text-text2">Next Billing</span>
                                <span className="font-medium">{formatDate(subscriptionData.currentPeriodEnd)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-text2">Started on</span>
                                <span className="font-medium">{formatDate(subscriptionData.createdAt)}</span>
                            </div>
                        </div>
                        <div className="mt-8 space-y-3">
                            <button
                                onClick={() => setShowChangePlanModal(true)}
                                className="w-full rounded-xl bg-text1 px-4 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90"
                            >
                                Change Plan
                            </button>
                            {!subscriptionData.cancelAtPeriodEnd && (
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-text2 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
                                >
                                    Cancel Subscription
                                </button>
                            )}
                        </div>
                    </div>
                ) : currentPaidPlan ? (
                    <div className="flex flex-col justify-center rounded-2xl border border-hairline bg-surface/60 p-8 text-center">
                        <h3 className="mb-2 text-xl font-bold">{PLAN_DISPLAY_NAME[currentPaidPlan] ?? currentPaidPlan}</h3>
                        <p className="mb-6 text-sm leading-relaxed text-text2">
                            {usage?.periodEnd ? `Renews ${formatDate(usage.periodEnd)}` : 'Active subscription'}
                        </p>
                        <button
                            onClick={() => setShowChangePlanModal(true)}
                            className="w-full rounded-xl bg-text1 py-3 text-sm font-bold text-canvas transition-opacity hover:opacity-90"
                        >
                            Change Plan
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col justify-center rounded-2xl border border-hairline bg-surface/60 p-8 text-center">
                        <h3 className="mb-2 text-xl font-bold">Upgrade Now</h3>
                        <p className="mb-6 text-sm leading-relaxed text-text2">
                            Get monthly images that never expire. Every batch is quality-gated.
                        </p>
                        <button
                            onClick={() => router.push('/#pricing')}
                            className="w-full rounded-xl bg-text1 py-3 text-sm font-bold text-canvas transition-opacity hover:opacity-90"
                        >
                            View Pricing
                        </button>
                    </div>
                )}
                </div>

                {/* Payment History */}
                {orderList.length > 0 && (
                    <div className="rounded-2xl border border-hairline bg-surface/60 p-8">
                        <div className="mb-6 flex items-center gap-2.5">
                            <Receipt size={18} className="text-text2" />
                            <h3 className="text-sm font-semibold tracking-wider text-text1 uppercase">
                                Payment History
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {orderList.map((order, index) => (
                                <OrderItem key={`${order.createdAt}-${index}`} orderData={order} />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {showChangePlanModal && (
                <ChangePlanModal
                    currentPlan={currentPaidPlan}
                    scheduledPlan={subscriptionData?.scheduledPlan ?? null}
                    scheduledAppliesAt={subscriptionData?.scheduledAppliesAt ?? null}
                    onConfirmChangePlan={onConfirmChangePlan}
                    onClickClose={() => setShowChangePlanModal(false)}
                />
            )}
            {showCancelModal && (
                <DefaultModal
                    title="Cancel Subscription"
                    message="Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period, and your remaining images stay available."
                    confirmText={isCanceling ? "Canceling..." : "Yes, Cancel"}
                    cancelText="No, Keep it"
                    onClickConfirm={isCanceling ? undefined : onConfirmCancelSubscription}
                    onClickCancel={() => {
                        if (!isCanceling) setShowCancelModal(false);
                    }}
                />
            )}
            {revertTarget && (
                <DefaultModal
                    title={revertTarget === 'plan-change' ? "Cancel Scheduled Change" : "Keep Subscription"}
                    message={revertTarget === 'plan-change'
                        ? "The scheduled plan change will be removed. Your current plan stays as is."
                        : "The scheduled cancellation will be removed. Your subscription will renew normally."}
                    confirmText={isReverting ? "Working..." : "Confirm"}
                    cancelText="Back"
                    onClickConfirm={isReverting ? undefined : onConfirmRevert}
                    onClickCancel={() => {
                        if (!isReverting) setRevertTarget(null);
                    }}
                />
            )}
        </div>
    );
}

export default memo(ProfilePageClient);
