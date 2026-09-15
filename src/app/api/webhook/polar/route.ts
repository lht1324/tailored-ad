import { NextRequest } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { getPlanByPolarProduct, PLAN_IMAGE_LIMIT } from "@/lib/polar";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Polar 웹훅 리시버 — POST /api/webhook/polar
 * 인증은 S2S 시크릿이 아니라 Polar 서명(Standard Webhooks)으로 검증한다.
 * grant 적립은 (구독, 사이클, 사유) 유니크로冪等 — 재시도·중계복 안전.
 * 처리 실패해도 200으로 응답한다 (멱등이므로 Polar 재시도가 안전).
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
        console.warn(`[webhook/polar] ${type}: user unmapped (subscription=${data.id})`);
        return;
    }
    const productId = data.product_id ?? data.product?.id ?? '';
    const plan = getPlanByPolarProduct(productId);
    if (!plan) {
        console.warn(`[webhook/polar] ${type}: unknown product (subscription=${data.id}, product=${productId})`);
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

    // active/cycled/updated(활성) — 사이클 부여 + 유저 동기화
    if (periodStart && periodEnd) {
        await usageServerAPI.recordGrant({
            userId,
            polarSubscriptionId: data.id,
            cycleStart: periodStart,
            cycleEnd: periodEnd,
            granted: PLAN_IMAGE_LIMIT[plan],
            reason: 'subscription',
        });
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
        console.warn(`[webhook/polar] order.refunded: no subscription (order=${data.id})`);
        return;
    }
    // 해당 구독의 최신 사이클 부여분을 전액 회수 (부분환불도 동일 처리 — 감사 로그로 금액 추적)
    const latest = await usageServerAPI.latestGrantForSubscription(subscriptionId);
    if (!latest) {
        console.warn(`[webhook/polar] order.refunded: no grant found (subscription=${subscriptionId})`);
        return;
    }
    await usageServerAPI.recordGrant({
        userId: latest.user_id,
        polarSubscriptionId: subscriptionId,
        cycleStart: latest.cycle_start,
        cycleEnd: latest.cycle_end,
        granted: -latest.granted,
        reason: 'refund',
    });
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const secret = process.env.POLAR_WEBHOOK_SECRET ?? '';
    if (!secret) {
        console.error('[webhook/polar] missing POLAR_WEBHOOK_SECRET');
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Webhook secret not configured.',
        });
    }

    let event: { type: string; data: unknown };
    try {
        event = validateEvent(rawBody, Object.fromEntries(request.headers.entries()), secret) as {
            type: string;
            data: unknown;
        };
    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: 'Invalid webhook signature.',
            });
        }
        throw error;
    }

    try {
        switch (event.type) {
            case 'subscription.active':
            case 'subscription.cycled':
            case 'subscription.updated':
            case 'subscription.canceled':
            case 'subscription.revoked':
                await handleSubscriptionEvent(event.type, event.data as PolarSubscriptionData);
                break;
            case 'order.refunded':
                await handleOrderRefunded(event.data as PolarOrderData);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error(`[webhook/polar] handling failed (type=${event.type}):`, error);
    }

    return getNextBaseResponse({
        success: true,
        status: 200,
        message: 'Polar webhook received.',
    });
}
