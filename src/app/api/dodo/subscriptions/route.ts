import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getDodoClient } from "@/lib/dodoClient";
import { getPlanByDodoProduct, PLAN_DISPLAY_NAME } from "@/lib/dodo";
import type { SubscriptionData } from "@/lib/api/types/api/dodo/subscriptions/SubscriptionData";

/**
 * Dodo 활성 구독 조회 — GET /api/dodo/subscriptions?email=
 * C2S 진입은 client-gateway 경유 (gateway가 userId 주입, 본인 확인용).
 * 이메일로 고객을 찾아 최신 활성 구독 1건 반환. 없으면 subscriptionData: null (정상).
 * 예약 다운그레이드 표시는 users 테이블(downgrade_target_plan_id)에서 취합.
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
        const dodo = await getDodoClient();

        let customerId: string | null = null;
        const customers = await dodo.customers.list({ email });
        for await (const c of customers) {
            const cand = c as unknown as { customer_id?: string; id?: string; email?: string };
            if ((cand.email ?? '').toLowerCase() === email.toLowerCase()) {
                customerId = cand.customer_id ?? cand.id ?? null;
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

        const subs = await dodo.subscriptions.list({ customer_id: customerId, status: 'active' });
        type SubItem = {
            subscription_id?: string; id?: string; status?: string; created_at?: string;
            product_id?: string; currency?: string;
            recurring_pre_tax_amount?: number;
            previous_billing_date?: string; next_billing_date?: string;
            cancel_at_next_billing_date?: boolean;
        };
        let latest: SubItem | null = null;
        for await (const s of subs) {
            const candidate = s as unknown as SubItem;
            if (!latest || new Date(candidate.created_at ?? 0).getTime() > new Date(latest.created_at ?? 0).getTime()) {
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

        const productId = latest.product_id ?? '';
        const plan = productId ? getPlanByDodoProduct(productId) : null;
        const user = await usersServerAPI.getUserByUserId(userId);
        const rawScheduled = user?.downgrade_target_plan_id ?? null;
        const scheduledPlan = rawScheduled
            ? (PLAN_DISPLAY_NAME[rawScheduled] ? rawScheduled : (getPlanByDodoProduct(rawScheduled) ?? rawScheduled))
            : null;

        const subscriptionData: SubscriptionData = {
            id: latest.subscription_id ?? latest.id ?? '',
            status: latest.status ?? 'active',
            productId,
            productName: plan ? (PLAN_DISPLAY_NAME[plan] ?? plan) : 'TailoredAd',
            amount: 0,
            currency: latest.currency ?? 'USD',
            billingCycle: 'month',
            billingInterval: 1,
            currentPeriodStart: latest.previous_billing_date ?? latest.created_at ?? new Date().toISOString(),
            currentPeriodEnd: latest.next_billing_date ?? undefined,
            cancelAtPeriodEnd: latest.cancel_at_next_billing_date ?? false,
            createdAt: latest.created_at ?? new Date().toISOString(),
            scheduledPlan,
            scheduledAppliesAt: scheduledPlan ? (latest.next_billing_date ?? null) : null,
        };

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { subscriptionData },
            message: "Successfully fetched subscription."
        });
    } catch (error) {
        console.error("Error in GET /api/dodo/subscriptions:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch subscription from Dodo."
        });
    }
}
