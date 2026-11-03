import { usersServerAPI } from "@server/api/usersServerAPI";
import { usageServerAPI } from "@server/api/usageServerAPI";
import { resolveDodoPlan } from "@server/dodoProducts";
import { getDodoClient } from "@server/dodoClient";
import { PLAN_IMAGE_LIMIT, PLAN_PRICE_USD, type DodoPaidPlan } from "@shared/dodo";
import { SubscriptionPlan } from "@shared/types/supabase/Users";

/**
 * Dodo 결제 이벤트 처리 — 원래 `api/dodo/process` 라우트.
 *
 * ## 무엇이 바뀌었나
 * 예전: `/api/webhook/dodo` → 자기 자신에게 HTTP → 이 라우트.
 * 지금: 웹훅 라우트가 **이 함수를 직접** 부른다 (`waitUntil`로 응답 후 실행).
 * HTTP 홉이 사라졌고, 로직은 그대로다.
 *
 * ## 멱등성
 * `subscription_grants`의 `UNIQUE (polar_subscription_id, cycle_start, reason)`가
 * 같은 구독·사이클·사유의 **중복 적립을 DB에서 막는다.** 그래서 재시도가 와도 두 배가 되지 않는다.
 * (`polar_subscription_id`는 Polar 시절 컬럼명 — 지금은 Dodo 구독 ID를 담는다)
 *
 * ## 부여량의 진실원천
 * 상품 metadata의 `imagePerMonth`. 코드 상수는 **폴백**이고, 폴백 시 warn을 남긴다.
 */

const IMAGE_LIMIT = PLAN_IMAGE_LIMIT;

interface DodoSubscriptionData {
    subscription_id?: string;
    id?: string;
    status?: string;
    product_id?: string;
    metadata?: { userId?: unknown; plan?: unknown } | null;
    current_period_start?: string;
    current_period_end?: string;
    currentBillingPeriod?: { startsAt?: string; endsAt?: string } | null;
}

interface DodoSubscriptionLookup {
    metadata?: { userId?: unknown; plan?: unknown } | null;
    product_id?: string;
    customer?: { email?: unknown } | null;
    previous_billing_date?: string;
    next_billing_date?: string;
}

interface DodoRefundData {
    refund_id?: unknown;
    payment_id?: unknown;
    amount?: unknown; // 최소 단위 (USD → cents)
    currency?: unknown;
    subscription_id?: unknown;
}

function resolveSubId(data: DodoSubscriptionData): string {
    return data.subscription_id ?? data.id ?? "";
}

function resolveUserId(data: DodoSubscriptionData): string | null {
    const fromMeta = data.metadata?.userId;
    if (typeof fromMeta === "string" && fromMeta !== "") return fromMeta;
    return null;
}

function resolvePeriod(data: DodoSubscriptionData): { start?: string; end?: string } {
    return {
        start: data.current_period_start ?? data.currentBillingPeriod?.startsAt,
        end: data.current_period_end ?? data.currentBillingPeriod?.endsAt,
    };
}

/** 페이로드가 부족할 때 Dodo 구독을 직접 조회 (이벤트당 최대 1회). API 응답이 진실원천. */
async function lookupSubscription(subId: string): Promise<DodoSubscriptionLookup | null> {
    try {
        const dodo = await getDodoClient();
        const subscription = (await dodo.subscriptions.retrieve(subId)) as unknown as DodoSubscriptionLookup;
        return subscription ?? null;
    } catch (error) {
        console.warn(`[dodo] subscription lookup failed (subscription=${subId}):`, error);
        return null;
    }
}

/** 부여량 — 상품 metadata.imagePerMonth 우선, 없으면 코드 상수 (warn) */
async function resolveGrantImages(productId: string, plan: DodoPaidPlan, subId: string): Promise<number> {
    if (productId !== "") {
        try {
            const dodo = await getDodoClient();
            const product = (await dodo.products.retrieve(productId)) as unknown as {
                metadata?: Record<string, unknown> | null;
            };
            const perMonth = Number(product.metadata?.imagePerMonth);
            if (Number.isFinite(perMonth) && perMonth > 0) return Math.floor(perMonth);
            console.warn(
                `[dodo] product imagePerMonth invalid (subscription=${subId}, product=${productId}) — code fallback`,
            );
        } catch (error) {
            console.warn(`[dodo] product lookup failed (subscription=${subId}, product=${productId}):`, error);
        }
    }
    return PLAN_IMAGE_LIMIT[plan];
}

/**
 * 비례 환불 — refund.succeeded 1건당 해당 사이클의 **미사용분만** 회수 (약관 §2).
 * 환불액(USD) → 회수 장수 역산 후 음수 grant 행. 같은 refund_id는 unique로 흡수된다.
 * 전제: USD 고정 상품. 첫주문 할인 결제는 정가 기준이라 과다 회수 가능 → 미사용 상한으로 차단.
 */
async function handleRefundSucceeded(data: DodoRefundData): Promise<void> {
    const refundId = typeof data.refund_id === "string" ? data.refund_id : "";
    const paymentId = typeof data.payment_id === "string" ? data.payment_id : "";
    const amountCents = typeof data.amount === "number" ? data.amount : Number.NaN;

    if (!refundId || !paymentId || !Number.isFinite(amountCents) || amountCents <= 0) {
        console.warn(`[dodo] refund.succeeded: unmapped payload (refund=${refundId})`);
        return;
    }
    if (typeof data.currency === "string" && data.currency !== "" && data.currency !== "USD") {
        console.warn(`[dodo] refund.succeeded: non-USD currency, skipping (refund=${refundId})`);
        return;
    }

    let subId = typeof data.subscription_id === "string" ? data.subscription_id : "";
    if (!subId) {
        // 페이로드에 구독 연결이 없으면 결제 조회로 역추적
        try {
            const dodo = await getDodoClient();
            const payment = await dodo.payments.retrieve(paymentId);
            subId = ((payment as unknown as { subscription_id?: unknown }).subscription_id as string) ?? "";
        } catch (error) {
            console.warn(`[dodo] refund.succeeded: payment lookup failed (refund=${refundId}):`, error);
            return;
        }
    }
    if (!subId) {
        console.warn(`[dodo] refund.succeeded: subscription unmapped (refund=${refundId})`);
        return;
    }

    const latest = await usageServerAPI.latestGrantForSubscription(subId);
    if (!latest) {
        console.warn(`[dodo] refund.succeeded: no grant row (refund=${refundId}, subscription=${subId})`);
        return;
    }

    const cycleTarget = await usageServerAPI.sumGrantedForSubscriptionCycle(subId, latest.cycle_start);
    const user = await usersServerAPI.getUserByUserId(latest.user_id);
    const price = user?.plan ? (PLAN_PRICE_USD[user.plan as keyof typeof PLAN_PRICE_USD] ?? 0) : 0;
    if (!user || price <= 0 || cycleTarget <= 0) {
        console.warn(`[dodo] refund.succeeded: price unmapped (refund=${refundId}, subscription=${subId})`);
        return;
    }

    const usedInCycle = await usageServerAPI.countImagesInWindow(
        latest.user_id,
        latest.cycle_start,
        latest.cycle_end,
    );
    const unused = Math.max(0, cycleTarget - usedInCycle);
    const revoke = Math.min(Math.round((amountCents / 100 / price) * cycleTarget), unused);
    if (revoke <= 0) {
        console.warn(`[dodo] refund.succeeded: nothing to revoke (refund=${refundId}, unused=${unused})`);
        return;
    }

    await usageServerAPI.recordGrant({
        userId: latest.user_id,
        polarSubscriptionId: subId,
        cycleStart: latest.cycle_start,
        cycleEnd: latest.cycle_end,
        granted: -revoke,
        reason: `refund:${refundId}`,
    });
}

async function handleSubscriptionEvent(type: string, data: DodoSubscriptionData): Promise<void> {
    const subId = resolveSubId(data);

    // 1차: 페이로드 metadata → 부족하면 구독 직접 조회로 보정
    let userId = resolveUserId(data);
    let productId = data.product_id ?? "";
    let { start: periodStart, end: periodEnd } = resolvePeriod(data);

    if ((!userId || !productId || !periodStart || !periodEnd) && subId !== "") {
        const subscription = await lookupSubscription(subId);
        if (subscription) {
            if (!userId) userId = resolveUserId(subscription);
            if (!userId && typeof subscription.customer?.email === "string" && subscription.customer.email !== "") {
                const user = await usersServerAPI.getUserByEmail(subscription.customer.email);
                if (user) {
                    userId = user.id;
                    console.log(`[dodo] ${type}: user resolved by email (subscription=${subId})`);
                }
            }
            if (!productId && typeof subscription.product_id === "string") productId = subscription.product_id;
            if (!periodStart && typeof subscription.previous_billing_date === "string") {
                periodStart = subscription.previous_billing_date;
            }
            if (!periodEnd && typeof subscription.next_billing_date === "string") {
                periodEnd = subscription.next_billing_date;
            }
        }
    }

    if (!userId) {
        console.warn(`[dodo] ${type}: user unmapped (subscription=${subId})`);
        return;
    }

    const plan = await resolveDodoPlan(productId);
    if (!plan) {
        console.warn(`[dodo] ${type}: unknown product (subscription=${subId}, product=${productId})`);
        return;
    }

    // metadata 변조 가드 — 결제 상품(product)이 진실. 불일치는 로그만.
    const claimedPlan = data.metadata?.plan;
    if (typeof claimedPlan === "string" && claimedPlan !== "" && claimedPlan !== plan) {
        console.warn(
            `[dodo] ${type}: plan mismatch custom=${claimedPlan} product-derived=${plan} (subscription=${subId})`,
        );
    }

    // 해지계 — 잔액은 유지(돈 낸 권리), 플랜 표시만 해제
    if (type === "subscription.cancelled" || type === "subscription.expired" || data.status === "cancelled") {
        await usersServerAPI.patchUserByUserId(userId, {
            plan: SubscriptionPlan.NONE,
            subscription_id: subId,
            subscription_current_period_start: periodStart ?? null,
            subscription_current_period_end: periodEnd ?? null,
        });
        return;
    }

    // DB 현재 플랜 — updated 이벤트의 예약/적용 판정용
    const currentUser = await usersServerAPI.getUserByUserId(userId);
    const currentPlan = currentUser?.plan ?? null;
    const currentLimit =
        currentPlan && (Object.values(SubscriptionPlan) as string[]).includes(currentPlan)
            ? (IMAGE_LIMIT[currentPlan as keyof typeof IMAGE_LIMIT] ?? 0)
            : 0;
    const target = await resolveGrantImages(productId, plan, subId);

    // updated + target <= DB 플랜 → 다운그레이드 예약 순간 (적용은 다음 사이클)
    if (type === "subscription.updated" && target <= currentLimit && currentLimit > 0) {
        console.log(`[dodo] ${type}: scheduled downgrade moment, skipping sync (subscription=${subId})`);
        return;
    }

    // active/renewed/created/updated(업그레이드) — 사이클 부여 (차액 top-up 포함)
    if (periodStart && periodEnd) {
        const already = await usageServerAPI.sumGrantedForSubscriptionCycle(subId, periodStart);
        if (already === 0) {
            await usageServerAPI.recordGrant({
                userId,
                polarSubscriptionId: subId,
                cycleStart: periodStart,
                cycleEnd: periodEnd,
                granted: target,
                reason: "subscription",
            });
        } else if (target > already) {
            await usageServerAPI.recordGrant({
                userId,
                polarSubscriptionId: subId,
                cycleStart: periodStart,
                cycleEnd: periodEnd,
                granted: target - already,
                reason: `upgrade:${plan}`,
            });
        }
    }

    await usersServerAPI.patchUserByUserId(userId, {
        plan,
        subscription_id: subId,
        image_limit: target,
        subscription_current_period_start: periodStart ?? null,
        subscription_current_period_end: periodEnd ?? null,
    });
}

/** 웹훅 이벤트 1건 처리 — 예외는 던지지 않는다 (웹훅은 이미 200을 반환했다) */
export async function processDodoEvent(event: { type: string; data: unknown }): Promise<void> {
    try {
        switch (event.type) {
            case "subscription.active":
            case "subscription.renewed":
            case "subscription.updated":
            case "subscription.cancelled":
            case "subscription.expired":
                await handleSubscriptionEvent(event.type, event.data as DodoSubscriptionData);
                break;
            case "refund.succeeded":
                await handleRefundSucceeded(event.data as DodoRefundData);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error("[dodo] handling failed:", error);
    }
}
