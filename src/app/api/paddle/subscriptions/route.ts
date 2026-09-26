import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getPaddleClient } from "@/lib/paddleClient";
import { getPlanByPaddlePrice, PLAN_DISPLAY_NAME } from "@/lib/paddle";
import type { SubscriptionData } from "@/lib/api/types/api/paddle/subscriptions/SubscriptionData";

/**
 * Paddle 활성 구독 조회 — GET /api/paddle/subscriptions?email=
 * C2S 진입은 client-gateway 경유 (gateway가 userId 주입, 본인 확인용).
 * 이메일로 고객을 찾아 최신 활성 구독 1건 반환. 없으면 subscriptionData: null (정상).
 * 예약 다운그레이드 표시는 users 테이블(downgrade_target_plan_id)에서 취합 —
 * Paddle scheduled_change에 목표 플랜이 안 담기기 때문.
 */
export async function GET(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "email is required and must be a string."
        });
    }

    try {
        const paddle = await getPaddleClient();

        let customerId: string | null = null;
        const customers = await paddle.customers.list({ search: email, perPage: 1 });
        for await (const c of customers) {
            if (c.email.toLowerCase() === email.toLowerCase()) {
                customerId = c.id;
                break;
            }
        }
        if (!customerId) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { subscriptionData: null },
                message: "No customer found with the provided email."
            });
        }

        const subs = await paddle.subscriptions.list({ customerId: [customerId], status: ['active'] });
        type SubItem = {
            id: string; status: string; createdAt: string;
            items: Array<{ price?: { id?: string; name?: string; description?: string | null; unitPrice?: { amount?: string; currencyCode?: string } | null; billingCycle?: { interval?: string } | null } | null; recurring?: boolean | null }>;
            currentBillingPeriod: { startsAt: string; endsAt: string } | null;
            nextBilledAt: string | null;
            canceledAt: string | null;
            scheduledChange: { action: string } | null;
        };
        let latest: SubItem | null = null;
        for await (const s of subs) {
            const candidate = s as unknown as SubItem;
            if (!latest || new Date(candidate.createdAt).getTime() > new Date(latest.createdAt).getTime()) {
                latest = candidate;
            }
        }
        if (!latest) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { subscriptionData: null },
                message: "No active subscription found."
            });
        }

        const item = latest.items.find((i) => i.recurring !== false) ?? latest.items[0];
        const priceId = item?.price?.id ?? '';
        const plan = priceId ? await getPlanByPaddlePrice(priceId) : null;
        const amount = Number(item?.price?.unitPrice?.amount ?? 0) || 0;
        const currency = item?.price?.unitPrice?.currencyCode ?? 'USD';
        const user = await usersServerAPI.getUserByUserId(userId);
        // 예약 목표: plan id 그대로 두되, 구버전 price id 저장분은 역매핑 (둘 다 표시명 해석됨)
        const rawScheduled = user?.downgrade_target_plan_id ?? null;
        const scheduledPlan = rawScheduled
            ? (PLAN_DISPLAY_NAME[rawScheduled] ? rawScheduled : (await getPlanByPaddlePrice(rawScheduled) ?? rawScheduled))
            : null;

        const subscriptionData: SubscriptionData = {
            id: latest.id,
            status: latest.status,
            productId: priceId,
            productName: plan ? (PLAN_DISPLAY_NAME[plan] ?? plan) : (item?.price?.name ?? 'TailoredAd'),
            productDescription: item?.price?.description ?? undefined,
            amount,
            currency,
            billingCycle: item?.price?.billingCycle?.interval ?? 'month',
            billingInterval: 1,
            currentPeriodStart: latest.currentBillingPeriod?.startsAt ?? latest.createdAt,
            currentPeriodEnd: latest.currentBillingPeriod?.endsAt ?? latest.nextBilledAt ?? undefined,
            cancelAtPeriodEnd: latest.scheduledChange?.action === 'cancel',
            canceledAt: latest.canceledAt ?? undefined,
            createdAt: latest.createdAt,
            scheduledPlan,
            scheduledAppliesAt: scheduledPlan
                ? (latest.currentBillingPeriod?.endsAt ?? latest.nextBilledAt ?? null)
                : null,
        };

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { subscriptionData },
            message: "Successfully fetched subscription."
        });
    } catch (error) {
        console.error("Error in GET /api/paddle/subscriptions:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch subscription from Paddle."
        });
    }
}
