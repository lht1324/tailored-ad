import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import {
    FUNGIES_IMAGE_LIMIT,
    FUNGIES_CUSTOM_FIELD_USER_ID,
    getPlanByFungiesAmount,
    type FungiesPaidPlan,
} from "@/lib/fungies";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Fungies 웹훅 처리부 — POST /api/fungies/process
 * `/api/webhook/fungies`(수신부)이 서명 검증 후 fire-and-forget으로 넘긴다.
 * S2S 전용. grant는 usageServerAPI 유니크(구독, 사이클, 사유)로 멱등 (재시도 흡수).
 * polar_subscription_id 컬럼을 구독 ID 저장소로 재사용 (문자열, 제약 동일).
 * 판정 잣대는 DB 단일 소스 (Paddle과 동일 정책).
 */

interface FungiesUserData {
    id?: unknown;
    email?: unknown;
    internalId?: unknown;
}

interface FungiesPaymentData {
    value?: unknown;
}

interface FungiesSubscriptionData {
    id?: unknown;
    currentIntervalStart?: unknown;
    currentIntervalEnd?: unknown;
}

interface FungiesEventData {
    user?: FungiesUserData | null;
    customFields?: Record<string, unknown> | null;
    lastPayment?: FungiesPaymentData | null;
    subscription?: FungiesSubscriptionData | null;
}

function resolveUserId(data: FungiesEventData): string | null {
    const fromCustom = data.customFields?.[FUNGIES_CUSTOM_FIELD_USER_ID];
    if (typeof fromCustom === 'string' && fromCustom !== '') return fromCustom;
    const fromInternal = data.user?.internalId;
    if (typeof fromInternal === 'string' && fromInternal !== '') return fromInternal;
    return null;
}

function resolveSubscriptionId(data: FungiesEventData): string {
    const id = data.subscription?.id;
    return typeof id === 'string' ? id : '';
}

function toISO(value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return new Date(value).toISOString();
    }
    if (typeof value === 'string' && value !== '') return value;
    return null;
}

async function handleSubscriptionEvent(type: string, data: FungiesEventData) {
    const userId = resolveUserId(data);
    const subscriptionId = resolveSubscriptionId(data);
    if (!userId || !subscriptionId) {
        console.warn(`[fungies/process] ${type}: user or subscription unmapped (subscription=${subscriptionId})`);
        return;
    }

    // 이메일 교차검증 — customFields 변조 가드 (Paddle custom_data 가드와 동일 역할)
    const email = data.user?.email;
    if (typeof email === 'string' && email !== '') {
        const user = await usersServerAPI.getUserByUserId(userId);
        if (user && user.email.toLowerCase() !== email.toLowerCase()) {
            console.warn(`[fungies/process] ${type}: email mismatch user=${userId} webhook=${email} (subscription=${subscriptionId})`);
            return;
        }
    }

    // 해지계 — 잔액은 유지(돈 낸 권리), 플랜 표시만 해제 (Paddle과 동일 정책)
    if (type === 'subscription_cancelled') {
        await usersServerAPI.patchUserByUserId(userId, {
            plan: SubscriptionPlan.NONE,
            subscription_id: subscriptionId,
            subscription_current_period_start: toISO(data.subscription?.currentIntervalStart),
            subscription_current_period_end: toISO(data.subscription?.currentIntervalEnd),
        });
        return;
    }

    // 금액 기준 플랜 판정 (진실원천 — customFields는 매칭용)
    const amount = data.lastPayment?.value;
    const plan: FungiesPaidPlan | null = typeof amount === 'number' ? getPlanByFungiesAmount(amount) : null;
    if (!plan) {
        console.warn(`[fungies/process] ${type}: unknown amount (subscription=${subscriptionId}, amount=${String(amount)})`);
        return;
    }

    const periodStart = toISO(data.subscription?.currentIntervalStart);
    const periodEnd = toISO(data.subscription?.currentIntervalEnd);
    const target = FUNGIES_IMAGE_LIMIT[plan];

    // created/interval(갱신) → 사이클 부여. updated → 차액 top-up만 (Paddle updated 규칙과 동일)
    if (periodStart && periodEnd) {
        const already = await usageServerAPI.sumGrantedForSubscriptionCycle(subscriptionId, periodStart);
        if (already === 0) {
            await usageServerAPI.recordGrant({
                userId,
                polarSubscriptionId: subscriptionId,
                cycleStart: periodStart,
                cycleEnd: periodEnd,
                granted: target,
                reason: 'subscription',
            });
        } else if (target > already) {
            await usageServerAPI.recordGrant({
                userId,
                polarSubscriptionId: subscriptionId,
                cycleStart: periodStart,
                cycleEnd: periodEnd,
                granted: target - already,
                reason: `upgrade:${plan}`,
            });
        }
    }
    await usersServerAPI.patchUserByUserId(userId, {
        plan,
        subscription_id: subscriptionId,
        image_limit: FUNGIES_IMAGE_LIMIT[plan],
        subscription_current_period_start: periodStart,
        subscription_current_period_end: periodEnd,
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
            case 'subscription_created':
            case 'subscription_interval':
            case 'subscription_updated':
            case 'subscription_cancelled':
                await handleSubscriptionEvent(type, data as FungiesEventData);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('[fungies/process] handling failed:', error);
    }

    return getNextBaseResponse({
        success: true,
        status: 200,
        message: 'Fungies event processed.',
    });
}
