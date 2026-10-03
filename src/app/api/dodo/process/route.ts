import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { getPlanByDodoProduct, PLAN_IMAGE_LIMIT } from "@/lib/dodo";
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

async function handleSubscriptionEvent(type: string, data: DodoSubscriptionData) {
    const subId = resolveSubId(data);
    const userId = resolveUserId(data);
    if (!userId) {
        console.warn(`[dodo/process] ${type}: user unmapped (subscription=${subId})`);
        return;
    }
    const productId = data.product_id ?? '';
    const plan = getPlanByDodoProduct(productId);
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
