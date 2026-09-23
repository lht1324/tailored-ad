import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { getPlanByPolarProduct, PLAN_IMAGE_LIMIT } from "@/lib/polar";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Polar 웹훅 처리부 — POST /api/polar/process
 * `/api/webhook/polar`(수신부)가 서명 검증 후 fire-and-forget으로 넘긴다.
 * S2S 전용 (외부 직접 호출 차단). 멱등이라 재실행 안전, 실패해도 로그만.
 */

interface PolarCustomer {
    id?: string;
    external_id?: string | null;
    email?: string;
    metadata?: Record<string, unknown>;
}

interface PolarSubscriptionData {
    id: string;
    status?: string;
    product_id?: string;
    product?: { id?: string };
    customer_id?: string;
    customer?: PolarCustomer;
    metadata?: Record<string, unknown>;
    current_period_start?: string;
    current_period_end?: string;
}

interface PolarOrderData {
    id: string;
    subscription_id?: string | null;
    customer?: PolarCustomer;
    metadata?: Record<string, unknown>;
}

function resolveUserId(
    data: PolarSubscriptionData | PolarOrderData,
): string | null {
    const fromCustomer = data.customer?.external_id;
    if (typeof fromCustomer === 'string' && fromCustomer !== '') return fromCustomer;
    const fromMeta = data.metadata?.userId;
    if (typeof fromMeta === 'string' && fromMeta !== '') return fromMeta;
    const fromCustomerMeta = data.customer?.metadata?.userId;
    if (typeof fromCustomerMeta === 'string' && fromCustomerMeta !== '') return fromCustomerMeta;
    return null;
}

async function handleSubscriptionEvent(type: string, data: PolarSubscriptionData) {
    const userId = resolveUserId(data);
    if (!userId) {
        console.warn(`[polar/process] ${type}: user unmapped (subscription=${data.id})`);
        return;
    }
    const productId = data.product_id ?? data.product?.id ?? '';
    const plan = getPlanByPolarProduct(productId);
    if (!plan) {
        console.warn(`[polar/process] ${type}: unknown product (subscription=${data.id}, product=${productId})`);
        return;
    }

    const periodStart = data.current_period_start;
    const periodEnd = data.current_period_end;

    // 구독 종료계 — 잔액은 유지(돈 낸 권리), 플랜 표시만 해제
    if (type === 'subscription.revoked' || data.status === 'canceled') {
        await usersServerAPI.patchUserByUserId(userId, {
            plan: SubscriptionPlan.NONE,
            subscription_id: data.id,
            subscription_current_period_start: periodStart ?? null,
            subscription_current_period_end: periodEnd ?? null,
        });
        return;
    }

    // active/cycled/updated(활성) — 사이클 부여 + 유저 동기화.
    // 잔액제라 같은 사이클 중복 부여 금지: 이미 찍힌 순합과 새 플랜 한도를 비교해
    // 차액만 추가한다 (업그레이드 top-up). 차액 없으면 스킵 — 다운그레이드 pending
    // 이벤트·웹훅 재시도 흡수. reason은 'upgrade:{plan}' (사이클 내複수 업그레이드의
    // 유니크 충돌 회피. 체크제약에 LIKE 'upgrade:%' 추가 필요).
    if (periodStart && periodEnd) {
        const target = PLAN_IMAGE_LIMIT[plan];
        const already = await usageServerAPI.sumGrantedForSubscriptionCycle(data.id, periodStart);
        if (already === 0) {
            await usageServerAPI.recordGrant({
                userId,
                polarSubscriptionId: data.id,
                cycleStart: periodStart,
                cycleEnd: periodEnd,
                granted: target,
                reason: 'subscription',
            });
        } else if (target > already) {
            await usageServerAPI.recordGrant({
                userId,
                polarSubscriptionId: data.id,
                cycleStart: periodStart,
                cycleEnd: periodEnd,
                granted: target - already,
                reason: `upgrade:${plan}`,
            });
        }
    }
    await usersServerAPI.patchUserByUserId(userId, {
        plan,
        subscription_id: data.id,
        image_limit: PLAN_IMAGE_LIMIT[plan],
        subscription_current_period_start: periodStart ?? null,
        subscription_current_period_end: periodEnd ?? null,
    });
}

async function handleOrderRefunded(data: PolarOrderData) {
    const subscriptionId = data.subscription_id;
    if (!subscriptionId) {
        console.warn(`[polar/process] order.refunded: no subscription (order=${data.id})`);
        return;
    }
    // 해당 구독의 최신 사이클 순부여합을 전액 회수 (업그레이드 top-up 포함).
    // 부분환불도 동일 처리 — 감사 로그로 금액 추적
    const latest = await usageServerAPI.latestGrantForSubscription(subscriptionId);
    if (!latest) {
        console.warn(`[polar/process] order.refunded: no grant found (subscription=${subscriptionId})`);
        return;
    }
    const net = await usageServerAPI.sumGrantedForSubscriptionCycle(
        subscriptionId,
        latest.cycle_start,
    );
    if (net === 0) return;
    await usageServerAPI.recordGrant({
        userId: latest.user_id,
        polarSubscriptionId: subscriptionId,
        cycleStart: latest.cycle_start,
        cycleEnd: latest.cycle_end,
        granted: -net,
        reason: 'refund',
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
            case 'subscription.cycled':
            case 'subscription.updated':
            case 'subscription.canceled':
            case 'subscription.revoked':
                await handleSubscriptionEvent(type, data as PolarSubscriptionData);
                break;
            case 'order.refunded':
                await handleOrderRefunded(data as PolarOrderData);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('[polar/process] handling failed:', error);
    }

    return getNextBaseResponse({
        success: true,
        status: 200,
        message: 'Polar event processed.',
    });
}
