import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { resolveDodoPlan } from "@/lib/dodoProducts";
import { PLAN_IMAGE_LIMIT, PLAN_PRICE_USD } from "@/lib/dodo";
import { getDodoClient } from "@/lib/dodoClient";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Dodo 웹훅 처리부 — POST /api/dodo/process
 * `/api/webhook/dodo`(수신부)이 서명 검증 후 fire-and-forget으로 넘긴다.
 * S2S 전용. grant는 usageServerAPI 유니크(구독, 사이클, 사유)로 멱등 (재시도 흡수).
 * polar_subscription_id 컬럼을 구독 ID 저장소로 재사용 (문자열, 제약 동일).
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

function resolveSubId(data: DodoSubscriptionData): string {
    return data.subscription_id ?? data.id ?? '';
}

function resolveUserId(data: DodoSubscriptionData): string | null {
    const fromMeta = data.metadata?.userId;
    if (typeof fromMeta === 'string' && fromMeta !== '') return fromMeta;
    return null;
}

function resolvePeriod(data: DodoSubscriptionData): { start?: string; end?: string } {
    return {
        start: data.current_period_start ?? data.currentBillingPeriod?.startsAt,
        end: data.current_period_end ?? data.currentBillingPeriod?.endsAt,
    };
}

// 비례환불 — refund.succeeded 1건당 해당 사이클 미사용분만 회수 (약관 §2).
// 환불액(USD) → 회수 장수 역산 후 음수 grant 행 기록. 동일 refund_id 중복은 유니크로 흡수.
// 전제: USD 고정 상품 (Adaptive/PPP OFF). 첫주문 할인가 결제는 정가 기준이라 과다 회수 가능 —
// 미사용 상한으로 차단. 14일 규칙은 대시보드 수동 환불(지원 메일) 쪽에서 지킴.
interface DodoRefundData {
    refund_id?: unknown;
    payment_id?: unknown;
    amount?: unknown; // 최소 단위 (USD → cents)
    currency?: unknown;
    subscription_id?: unknown;
}

async function handleRefundSucceeded(data: DodoRefundData) {
    const refundId = typeof data.refund_id === 'string' ? data.refund_id : '';
    const paymentId = typeof data.payment_id === 'string' ? data.payment_id : '';
    const amountCents = typeof data.amount === 'number' ? data.amount : NaN;
    if (!refundId || !paymentId || !Number.isFinite(amountCents) || amountCents <= 0) {
        console.warn(`[dodo/process] refund.succeeded: unmapped payload (refund=${refundId})`);
        return;
    }
    if (typeof data.currency === 'string' && data.currency !== '' && data.currency !== 'USD') {
        console.warn(`[dodo/process] refund.succeeded: non-USD currency, skipping (refund=${refundId})`);
        return;
    }

    let subId = typeof data.subscription_id === 'string' ? data.subscription_id : '';
    if (!subId) {
        // 페이로드에 구독 연결이 없으면 결제 조회로 역추적 (결제 읽기 권한 사용)
        try {
            const dodo = await getDodoClient();
            const payment = await dodo.payments.retrieve(paymentId);
            subId = (payment as unknown as { subscription_id?: unknown }).subscription_id as string ?? '';
        } catch (error) {
            console.warn(`[dodo/process] refund.succeeded: payment lookup failed (refund=${refundId}):`, error);
            return;
        }
    }
    if (!subId) {
        console.warn(`[dodo/process] refund.succeeded: subscription unmapped (refund=${refundId})`);
        return;
    }

    const latest = await usageServerAPI.latestGrantForSubscription(subId);
    if (!latest) {
        console.warn(`[dodo/process] refund.succeeded: no grant row (refund=${refundId}, subscription=${subId})`);
        return;
    }
    const cycleTarget = await usageServerAPI.sumGrantedForSubscriptionCycle(subId, latest.cycle_start);
    const user = await usersServerAPI.getUserByUserId(latest.user_id);
    const price = user?.plan ? (PLAN_PRICE_USD[user.plan as keyof typeof PLAN_PRICE_USD] ?? 0) : 0;
    if (!user || price <= 0 || cycleTarget <= 0) {
        console.warn(`[dodo/process] refund.succeeded: price unmapped (refund=${refundId}, subscription=${subId})`);
        return;
    }

    const usedInCycle = await usageServerAPI.countImagesInWindow(latest.user_id, latest.cycle_start, latest.cycle_end);
    const unused = Math.max(0, cycleTarget - usedInCycle);
    const revoke = Math.min(Math.round((amountCents / 100 / price) * cycleTarget), unused);
    if (revoke <= 0) {
        console.warn(`[dodo/process] refund.succeeded: nothing to revoke (refund=${refundId}, unused=${unused})`);
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

async function handleSubscriptionEvent(type: string, data: DodoSubscriptionData) {
    const subId = resolveSubId(data);
    const userId = resolveUserId(data);
    if (!userId) {
        console.warn(`[dodo/process] ${type}: user unmapped (subscription=${subId})`);
        return;
    }
    const productId = data.product_id ?? '';
    const plan = await resolveDodoPlan(productId);
    if (!plan) {
        console.warn(`[dodo/process] ${type}: unknown product (subscription=${subId}, product=${productId})`);
        return;
    }

    // metadata 변조 가드 — 결제 상품(product) 기준이 진실, 불일치는 로그
    const claimedPlan = data.metadata?.plan;
    if (typeof claimedPlan === 'string' && claimedPlan !== '' && claimedPlan !== plan) {
        console.warn(`[dodo/process] ${type}: plan mismatch custom=${claimedPlan} product-derived=${plan} (subscription=${subId})`);
    }

    const { start: periodStart, end: periodEnd } = resolvePeriod(data);

    // 해지계 — 잔액은 유지(돈 낸 권리), 플랜 표시만 해제 (Paddle과 동일 정책)
    if (type === 'subscription.cancelled' || type === 'subscription.expired' || data.status === 'cancelled') {
        await usersServerAPI.patchUserByUserId(userId, {
            plan: SubscriptionPlan.NONE,
            subscription_id: subId,
            subscription_current_period_start: periodStart ?? null,
            subscription_current_period_end: periodEnd ?? null,
        });
        return;
    }

    // DB 현재 플랜 조회 — updated 이벤트의 예약/적용 판정용
    const currentUser = await usersServerAPI.getUserByUserId(userId);
    const currentPlan = currentUser?.plan ?? null;
    const currentLimit = currentPlan && (Object.values(SubscriptionPlan) as string[]).includes(currentPlan)
        ? (IMAGE_LIMIT[currentPlan as keyof typeof IMAGE_LIMIT] ?? 0)
        : 0;
    const target = IMAGE_LIMIT[plan];

    // updated + target <= DB 플랜 → 다운그레이드 예약 순간 (적용은 다음 사이클)
    if (type === 'subscription.updated' && target <= currentLimit && currentLimit > 0) {
        console.log(`[dodo/process] ${type}: scheduled downgrade moment, skipping sync (subscription=${subId})`);
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
                reason: 'subscription',
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
        image_limit: IMAGE_LIMIT[plan],
        subscription_current_period_start: periodStart ?? null,
        subscription_current_period_end: periodEnd ?? null,
    });
}

export async function POST(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const { type, data } = await request.json() as { type: string; data: unknown };
        switch (type) {
            case 'subscription.active':
            case 'subscription.renewed':
            case 'subscription.updated':
            case 'subscription.cancelled':
            case 'subscription.expired':
                await handleSubscriptionEvent(type, data as DodoSubscriptionData);
                break;
            case 'refund.succeeded':
                await handleRefundSucceeded(data as DodoRefundData);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('[dodo/process] handling failed:', error);
    }

    return getNextBaseResponse({
        success: true,
        status: 200,
        message: 'Dodo event processed.',
    });
}
