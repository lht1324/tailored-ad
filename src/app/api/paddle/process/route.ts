import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@/lib/api/server/usageServerAPI";
import { getPlanByPaddlePrice, PLAN_IMAGE_LIMIT } from "@/lib/paddle";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * Paddle 웹훅 처리부 — POST /api/paddle/process
 * `/api/webhook/paddle`(수신부)이 서명 검증 후 fire-and-forget으로 넘긴다.
 * S2S 전용. grant는 usageServerAPI 유니크(구독, 사이클, 사유)로 멱등 (재시도 흡수).
 * polar_subscription_id 컬럼을 구독 ID 저장소로 재사용 (Paddle sub id도 문자열, 제약 동일).
 */

// 이미지 장수표 단일 진실원천 (lib/polar와 동일 값 — Paddle 이식 후 polar.ts로 일원화 예정)
const IMAGE_LIMIT = PLAN_IMAGE_LIMIT;

interface PaddleCustomData {
    userId?: unknown;
    plan?: unknown;
}

interface PaddleSubscriptionData {
    id: string;
    status?: string;
    customData?: PaddleCustomData | null;
    items?: Array<{ price?: { id?: string } }>;
    currentBillingPeriod?: { startsAt?: string; endsAt?: string } | null;
    customerId?: string;
}

function resolveUserId(data: PaddleSubscriptionData): string | null {
    const fromCustom = data.customData?.userId;
    if (typeof fromCustom === 'string' && fromCustom !== '') return fromCustom;
    return null;
}

function resolvePriceId(data: PaddleSubscriptionData): string {
    return data.items?.[0]?.price?.id ?? '';
}

async function handleSubscriptionEvent(type: string, data: PaddleSubscriptionData) {
    const userId = resolveUserId(data);
    if (!userId) {
        console.warn(`[paddle/process] ${type}: user unmapped (subscription=${data.id})`);
        return;
    }
    const priceId = resolvePriceId(data);
    const plan = await getPlanByPaddlePrice(priceId);
    if (!plan) {
        console.warn(`[paddle/process] ${type}: unknown price (subscription=${data.id}, price=${priceId})`);
        return;
    }

    // customData 변조 가드 — 결제 금액(price) 기준이 진실, 불일치는 로그
    const claimedPlan = data.customData?.plan;
    if (typeof claimedPlan === 'string' && claimedPlan !== '' && claimedPlan !== plan) {
        console.warn(`[paddle/process] ${type}: plan mismatch custom=${claimedPlan} price-derived=${plan} (subscription=${data.id})`);
    }

    const periodStart = data.currentBillingPeriod?.startsAt;
    const periodEnd = data.currentBillingPeriod?.endsAt;

    // Paddle 모델 (실측): 다운그레이드 예약(prorated_next_billing_period)은 items를 즉시 교체하고
    // 과금만 다음 사이클로 미룬다. scheduled_change는 생기지 않는다 (cancel/pause만 생성).
    // 그래서 updated 이벤트만으로 예약 vs 적용을 구분한다:
    // - updated + scheduledChange 있음 → pending (건드리지 않음)
    // - updated + target > DB 플랜 → 즉시 업그레이드 적용 → 동기화+차액
    // - updated + target <= DB 플랜 → 예약 순간 → 스킵 (적용은 다음 cycled에서)
    // - cycled/created → 새 사이클 진실 → 항상 동기화
    // - canceled → 기존 해지 처리
    const scheduled = (data as unknown as { scheduledChange?: { action?: string } | null }).scheduledChange;
    if (scheduled && data.status === 'active') {
        console.log(`[paddle/process] ${type}: pending scheduled change (${scheduled.action}), skipping sync (subscription=${data.id})`);
        return;
    }

    // 해지계 — 잔액은 유지(돈 낸 권리), 플랜 표시만 해제 (Polar와 동일 정책)
    if (type === 'subscription.canceled' || data.status === 'canceled') {
        await usersServerAPI.patchUserByUserId(userId, {
            plan: SubscriptionPlan.NONE,
            subscription_id: data.id,
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

    // updated + target <= DB 플랜 → 다운그레이드 예약 순간 (items는 이미 교체됨, 과금·적용은 다음 사이클)
    if (type === 'subscription.updated' && target <= currentLimit && currentLimit > 0) {
        console.log(`[paddle/process] ${type}: scheduled downgrade moment, skipping sync (subscription=${data.id})`);
        return;
    }

    // active/created/cycled/updated(업그레이드) — 사이클 부여 (차액 top-up 포함)
    if (periodStart && periodEnd) {
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
            case 'subscription.created':
            case 'subscription.updated':
            case 'subscription.canceled':
                await handleSubscriptionEvent(type, data as PaddleSubscriptionData);
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('[paddle/process] handling failed:', error);
    }

    return getNextBaseResponse({
        success: true,
        status: 200,
        message: 'Paddle event processed.',
    });
}
