import { Hono } from "hono";
import { usersServerAPI } from "@worker/lib/api/server/usersServerAPI";
import { usageServerAPI } from "@worker/lib/api/server/usageServerAPI";
import { getDodoClient } from "@worker/lib/dodoClient";
import { resolveDodoPlan, resolveDodoProductId } from "@worker/lib/dodoProducts";
import { getServerEnv } from "@worker/lib/serverEnv";
import { getBaseResponse } from "@worker/lib/utils/getBaseResponse";
import {
    DODO_FIRST_ORDER_DISCOUNT_CODE,
    PLAN_DISPLAY_NAME,
    PLAN_IMAGE_LIMIT,
    PLAN_PRICE_USD,
    type DodoPaidPlan,
} from "@shared/lib/dodo";
import { SubscriptionPlan } from "@shared/types/supabase/Users";
import type { OrderData } from "@shared/types/api/dodo/orders/OrderData";
import type { SubscriptionData } from "@shared/types/api/dodo/subscriptions/SubscriptionData";
import type { AppEnv } from "../env";
import type { AuthVariables } from "../middleware/auth";

/**
 * Dodo 결제 — `/api/dodo/*` (상품 목록은 `public.ts`에 따로 있음)
 *
 * ## 예전과 달라진 점
 * - `x-internal-secret` 검사 삭제 → 세션은 미들웨어가 검증.
 * - `?userId=` 쿼리 삭제 → `context.get("user").id`.
 * - `?email=` 쿼리도 **세션 이메일을 쓴다.** 쿼리를 신뢰하면 남의 결제내역을 조회할 수 있다.
 */
const dodoRoutes = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

const VALID_PLANS: DodoPaidPlan[] = [
    SubscriptionPlan.PLAN_1,
    SubscriptionPlan.PLAN_2,
    SubscriptionPlan.PLAN_3,
];

/**
 * 체크아웃 세션 생성 — `POST /api/dodo/checkouts`
 * body는 `{plan, theme?}`만 받는다. product 매핑은 서버(`resolveDodoProductId`)가 진실원천.
 * 유저 귀속은 metadata `{userId, plan}` — 웹훅이 금액-플랜 교차검증에 쓴다.
 */
dodoRoutes.post("/dodo/checkouts", async (context) => {
    const userId = context.get("user").id;

    let plan: string;
    let theme: string | undefined;
    try {
        ({ plan, theme } = await context.req.json());
    } catch {
        return getBaseResponse({ success: false, status: 400, error: "Invalid request body." });
    }

    if (!VALID_PLANS.includes(plan as DodoPaidPlan)) {
        return getBaseResponse({ success: false, status: 400, error: `Unsupported plan: ${plan}` });
    }

    let productId: string;
    try {
        productId = await resolveDodoProductId(plan as DodoPaidPlan);
    } catch (error) {
        // 조용한 400이 원인 추적을 며칠 잡아먹었다 — 매핑 실패는 무조건 로그
        console.error(`[dodo/checkouts] product unmapped (plan=${plan}):`, error instanceof Error ? error.message : error);
        return getBaseResponse({
            success: false,
            status: 400,
            error: error instanceof Error ? error.message : `No product mapped for plan: ${plan}`,
        });
    }

    const user = await usersServerAPI.getUserByUserId(userId);
    if (!user) {
        return getBaseResponse({ success: false, status: 404, error: "User not found" });
    }

    try {
        const dodo = await getDodoClient();
        // return_url은 브라우저 귀환용이라 출발지 Origin을 우선한다 (dev/prd 둘 다 정답).
        const baseUrl = await getServerEnv("BASE_URL");
        const origin = context.req.header("origin");
        const clientOrigin = origin && /^https?:\/\//.test(origin) ? origin : baseUrl;

        // 첫 유료 한정 자동 할인 — Starter 플랜만, 유료 이력이 있으면 정가.
        let discountCode: string | undefined;
        let firstCharge: number | null = null;
        if (plan === SubscriptionPlan.PLAN_1) {
            try {
                if (!(await usageServerAPI.hasPaidGrant(userId))) {
                    discountCode = DODO_FIRST_ORDER_DISCOUNT_CODE;
                    firstCharge = PLAN_PRICE_USD[plan as DodoPaidPlan] / 2;
                }
            } catch (discountError) {
                console.error(
                    `[dodo/checkouts] discount eligibility failed (user=${userId}) — full price:`,
                    discountError,
                );
            }
        }

        const session = await dodo.checkoutSessions.create({
            product_cart: [{ product_id: productId, quantity: 1 }],
            // 로그인 계정 값으로 prefill — 이메일은 고정(웹훅 귀속 기준), 이름만 수정 허용.
            customer: { email: user.email, name: user.name ?? undefined },
            feature_flags: { allow_customer_editing_email: false, allow_customer_editing_name: true },
            metadata: { userId, plan },
            return_url: `${clientOrigin}/checkout/success`,
            // USD 고정 — 대시보드의 Adaptive Currency 설정과 무관.
            billing_currency: "USD",
            ...(theme === "light" || theme === "dark" ? { customization: { theme } } : {}),
            ...(discountCode ? { discount_codes: [discountCode] } : {}),
        });

        return getBaseResponse({
            success: true,
            status: 200,
            data: {
                checkoutUrl: session.checkout_url,
                sessionId: session.session_id,
                discountApplied: discountCode != null,
                firstCharge,
            },
            message: "Dodo checkout session created.",
        });
    } catch (error) {
        console.error(`[dodo/checkouts] create failed (user=${userId}, plan=${plan}):`, error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create Dodo checkout session",
        });
    }
});

/** 결제내역 — `GET /api/dodo/orders` (세션 이메일 기준) */
dodoRoutes.get("/dodo/orders", async (context) => {
    const email = context.get("user").email;
    if (!email) {
        return getBaseResponse({ success: false, status: 400, error: "Session has no email." });
    }

    try {
        const dodo = await getDodoClient();

        let customerId: string | null = null;
        const customers = await dodo.customers.list({ email });
        for await (const customer of customers) {
            const candidate = customer as unknown as { customer_id?: string; id?: string; email?: string };
            if ((candidate.email ?? "").toLowerCase() === email.toLowerCase()) {
                customerId = candidate.customer_id ?? candidate.id ?? null;
                break;
            }
        }
        if (!customerId) {
            return getBaseResponse({
                success: true,
                status: 200,
                data: { orderList: [] },
                message: "No customer found with the provided email.",
            });
        }

        const payments = await dodo.payments.list({ customer_id: customerId, status: "succeeded" });
        const orderList: OrderData[] = [];
        for await (const payment of payments) {
            const item = payment as unknown as {
                total_amount?: number;
                currency?: string;
                status?: string;
                created_at?: string;
                subscription_ids?: string[];
            };

            // 상품명: 연결된 구독 → product 역매핑 (없으면 TailoredAd)
            let productName = "TailoredAd";
            const subId = item.subscription_ids?.[0];
            if (subId) {
                try {
                    const subscription = (await dodo.subscriptions.retrieve(subId)) as unknown as { product_id?: string };
                    const plan = subscription.product_id ? await resolveDodoPlan(subscription.product_id) : null;
                    if (plan) productName = PLAN_DISPLAY_NAME[plan] ?? plan;
                } catch {
                    /* 구독 조회 실패 — 기본 표시 유지 */
                }
            }

            const rawStatus = String(item.status ?? "").toLowerCase();
            orderList.push({
                productName,
                totalAmount: Number(item.total_amount ?? 0) || 0,
                currency: item.currency ?? "USD",
                status: ["succeeded", "paid", "completed", "billed"].includes(rawStatus) ? "paid" : rawStatus,
                createdAt: item.created_at ?? new Date().toISOString(),
                kind: "purchase",
            });
        }
        orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return getBaseResponse({
            success: true,
            status: 200,
            data: { orderList },
            message: "Successfully fetched orders from Dodo.",
        });
    } catch (error) {
        console.error("[route/dodo] orders failed:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch orders from Dodo.",
        });
    }
});

/** 활성 구독 — `GET /api/dodo/subscriptions` (세션 이메일 기준) */
dodoRoutes.get("/dodo/subscriptions", async (context) => {
    const sessionUser = context.get("user");
    const email = sessionUser.email;
    if (!email) {
        return getBaseResponse({ success: false, status: 400, error: "Session has no email." });
    }

    try {
        const dodo = await getDodoClient();

        let customerId: string | null = null;
        const customers = await dodo.customers.list({ email });
        for await (const customer of customers) {
            const candidate = customer as unknown as { customer_id?: string; id?: string; email?: string };
            if ((candidate.email ?? "").toLowerCase() === email.toLowerCase()) {
                customerId = candidate.customer_id ?? candidate.id ?? null;
                break;
            }
        }
        if (!customerId) {
            return getBaseResponse({
                success: true,
                status: 200,
                data: { subscriptionData: null },
                message: "No customer found with the provided email.",
            });
        }

        const subs = await dodo.subscriptions.list({ customer_id: customerId, status: "active" });
        type SubItem = {
            subscription_id?: string;
            id?: string;
            status?: string;
            created_at?: string;
            product_id?: string;
            currency?: string;
            previous_billing_date?: string;
            next_billing_date?: string;
            cancel_at_next_billing_date?: boolean;
        };
        let latest: SubItem | null = null;
        for await (const sub of subs) {
            const candidate = sub as unknown as SubItem;
            if (!latest || new Date(candidate.created_at ?? 0).getTime() > new Date(latest.created_at ?? 0).getTime()) {
                latest = candidate;
            }
        }
        if (!latest) {
            return getBaseResponse({
                success: true,
                status: 200,
                data: { subscriptionData: null },
                message: "No active subscription found.",
            });
        }

        const productId = latest.product_id ?? "";
        const plan = productId ? await resolveDodoPlan(productId) : null;
        const user = await usersServerAPI.getUserByUserId(sessionUser.id);
        const rawScheduled = user?.downgrade_target_plan_id ?? null;
        const scheduledPlan = rawScheduled
            ? PLAN_DISPLAY_NAME[rawScheduled]
                ? rawScheduled
                : ((await resolveDodoPlan(rawScheduled)) ?? rawScheduled)
            : null;

        const subscriptionData: SubscriptionData = {
            id: latest.subscription_id ?? latest.id ?? "",
            status: latest.status ?? "active",
            productId,
            productName: plan ? (PLAN_DISPLAY_NAME[plan] ?? plan) : "TailoredAd",
            amount: 0,
            currency: latest.currency ?? "USD",
            billingCycle: "month",
            billingInterval: 1,
            currentPeriodStart: latest.previous_billing_date ?? latest.created_at ?? new Date().toISOString(),
            currentPeriodEnd: latest.next_billing_date ?? undefined,
            cancelAtPeriodEnd: latest.cancel_at_next_billing_date ?? false,
            createdAt: latest.created_at ?? new Date().toISOString(),
            scheduledPlan,
            scheduledAppliesAt: scheduledPlan ? (latest.next_billing_date ?? null) : null,
        };

        return getBaseResponse({
            success: true,
            status: 200,
            data: { subscriptionData },
            message: "Successfully fetched subscription.",
        });
    } catch (error) {
        console.error("[route/dodo] subscriptions failed:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch subscription from Dodo.",
        });
    }
});

/**
 * 구독 해지 — `DELETE /api/dodo/subscriptions/cancel?subscriptionId=`
 * 기간 말 해지(당장은 유지, 다음 사이클부터 갱신 없음). 잔액제라 남은 잔액은 계속 쓴다.
 * DB의 `subscription_id`와 대조해 **본인 구독만** 해지한다.
 */
dodoRoutes.delete("/dodo/subscriptions/cancel", async (context) => {
    const userId = context.get("user").id;
    const subscriptionId = context.req.query("subscriptionId");

    if (!subscriptionId) {
        return getBaseResponse({
            success: false,
            status: 400,
            error: "subscriptionId is required as a query parameter.",
        });
    }

    const user = await usersServerAPI.getUserByUserId(userId);
    if (!user) {
        return getBaseResponse({ success: false, status: 404, error: "User not found." });
    }
    if (user.subscription_id !== subscriptionId) {
        return getBaseResponse({
            success: false,
            status: 403,
            error: "You do not have permission to cancel this subscription.",
        });
    }

    try {
        const dodo = await getDodoClient();
        await dodo.subscriptions.update(subscriptionId, { cancel_at_next_billing_date: true });

        return getBaseResponse({
            success: true,
            status: 200,
            message:
                "Subscription canceled successfully. It will remain active until the end of the current billing period.",
        });
    } catch (error) {
        console.error("[route/dodo] cancel failed:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to cancel subscription.",
        });
    }
});

/**
 * 플랜 변경 — `POST /api/dodo/subscriptions/change` (body `{newPlan}`)
 *
 * 업그레이드: 즉시 적용 + 차액 즉시 청구. 잔액 차액 부여는 **웹훅**이 담당(멱등).
 * 다운그레이드: 다음 사이클 예약 + 목표 플랜을 `users.downgrade_target_plan_id`에 기록.
 */
dodoRoutes.post("/dodo/subscriptions/change", async (context) => {
    const userId = context.get("user").id;

    let newPlan: string;
    try {
        ({ newPlan } = await context.req.json());
    } catch {
        return getBaseResponse({ success: false, status: 400, error: "Invalid request body." });
    }

    if (!VALID_PLANS.includes(newPlan as DodoPaidPlan)) {
        return getBaseResponse({ success: false, status: 400, error: `Unsupported plan: ${newPlan}` });
    }

    let newProductId: string;
    try {
        newProductId = await resolveDodoProductId(newPlan as DodoPaidPlan);
    } catch (error) {
        return getBaseResponse({
            success: false,
            status: 400,
            error: error instanceof Error ? error.message : `No product mapped for plan: ${newPlan}`,
        });
    }

    const user = await usersServerAPI.getUserByUserId(userId);
    if (!user) {
        return getBaseResponse({ success: false, status: 404, error: "User not found." });
    }
    if (!user.subscription_id) {
        return getBaseResponse({
            success: false,
            status: 400,
            error: "No active subscription. Subscribe via checkout first.",
        });
    }

    try {
        const dodo = await getDodoClient();
        const subscription = (await dodo.subscriptions.retrieve(user.subscription_id)) as unknown as {
            cancel_at_next_billing_date?: boolean;
            product_id?: string;
        };

        // 취소 예약된 구독은 플랜 변경 불가 — 먼저 예약을 풀어야 한다
        if (subscription.cancel_at_next_billing_date) {
            return getBaseResponse({
                success: false,
                status: 400,
                error: "Subscription is scheduled to cancel. Reactivate it before changing plans.",
            });
        }

        const currentProductId = subscription.product_id ?? "";
        // 판정 기준은 DB(현재 과금의 진실)
        const dbPlan =
            (Object.values(SubscriptionPlan) as string[]).includes(user.plan ?? "") &&
            user.plan !== SubscriptionPlan.NONE
                ? (user.plan as DodoPaidPlan)
                : null;
        const baselinePlan = dbPlan ?? (currentProductId ? await resolveDodoPlan(currentProductId) : null);
        if (!baselinePlan) {
            return getBaseResponse({ success: false, status: 400, error: "Current plan unknown. Refresh and try again." });
        }
        if (newPlan === baselinePlan) {
            return getBaseResponse({ success: false, status: 400, error: "Already on this plan." });
        }
        if (currentProductId === newProductId) {
            return getBaseResponse({ success: false, status: 400, error: "Already scheduled to this plan." });
        }

        // 업/다운 판정은 월 부여 장수 순서 (PLAN_1 < PLAN_2 < PLAN_3)
        const isUpgrade = PLAN_IMAGE_LIMIT[newPlan as DodoPaidPlan] > PLAN_IMAGE_LIMIT[baselinePlan];

        if (isUpgrade) {
            await dodo.subscriptions.changePlan(user.subscription_id, {
                product_id: newProductId,
                proration_billing_mode: "prorated_immediately",
                quantity: 1,
            });
            // 이전 다운그레이드 예약이 있었다면 무효화
            await usersServerAPI
                .patchUserByUserId(userId, {
                    downgrade_target_plan_id: null,
                    scheduled_downgrade_at: null,
                })
                .catch(() => {});

            return getBaseResponse({
                success: true,
                status: 200,
                message: "Subscription upgraded successfully. The difference was charged immediately.",
            });
        }

        await dodo.subscriptions.changePlan(user.subscription_id, {
            product_id: newProductId,
            proration_billing_mode: "prorated_immediately",
            effective_at: "next_billing_date",
            quantity: 1,
        });
        const subscriptionAfter = (await dodo.subscriptions.retrieve(user.subscription_id)) as unknown as {
            next_billing_date?: string;
        };
        await usersServerAPI.patchUserByUserId(userId, {
            downgrade_target_plan_id: newPlan as DodoPaidPlan,
            scheduled_downgrade_at: subscriptionAfter.next_billing_date ?? undefined,
        });

        return getBaseResponse({
            success: true,
            status: 200,
            message: "Downgrade scheduled successfully. It will be applied at the start of the next billing cycle.",
        });
    } catch (error) {
        console.error("[route/dodo] change plan failed:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to change subscription plan.",
        });
    }
});

/**
 * 예약 되돌리기 — `POST /api/dodo/subscriptions/revert` (body `{what}`)
 * `plan-change` = 다음 사이클 적용 예약 취소 / `cancellation` = 기간 말 해지 철회.
 * 되돌리기는 과금 없음 (차액 0 → 웹훅이 잔액을 건드리지 않는다).
 */
dodoRoutes.post("/dodo/subscriptions/revert", async (context) => {
    const userId = context.get("user").id;

    let what: string;
    try {
        ({ what } = await context.req.json());
    } catch {
        return getBaseResponse({ success: false, status: 400, error: "Invalid request body." });
    }

    if (what !== "plan-change" && what !== "cancellation") {
        return getBaseResponse({ success: false, status: 400, error: `Unsupported revert target: ${what}` });
    }

    const user = await usersServerAPI.getUserByUserId(userId);
    if (!user) {
        return getBaseResponse({ success: false, status: 404, error: "User not found." });
    }
    if (!user.subscription_id) {
        return getBaseResponse({ success: false, status: 400, error: "No active subscription." });
    }

    try {
        const dodo = await getDodoClient();

        if (what === "plan-change") {
            const target = user.downgrade_target_plan_id;
            if (!target) {
                return getBaseResponse({ success: false, status: 400, error: "No scheduled plan change to revert." });
            }
            await dodo.subscriptions.cancelChangePlan(user.subscription_id);
            await usersServerAPI
                .patchUserByUserId(userId, {
                    downgrade_target_plan_id: null,
                    scheduled_downgrade_at: null,
                })
                .catch(() => {});

            return getBaseResponse({
                success: true,
                status: 200,
                message: "Scheduled plan change reverted. Your current plan stays.",
            });
        }

        const subscription = (await dodo.subscriptions.retrieve(user.subscription_id)) as unknown as {
            cancel_at_next_billing_date?: boolean;
        };
        if (!subscription.cancel_at_next_billing_date) {
            return getBaseResponse({ success: false, status: 400, error: "Subscription is not scheduled to cancel." });
        }

        await dodo.subscriptions.update(user.subscription_id, { cancel_at_next_billing_date: false });
        // 예약 상태 그대로 복귀 — items·DB 목표는 손대지 않는다.
        return getBaseResponse({
            success: true,
            status: 200,
            message: "Cancellation reverted. Your subscription will renew normally.",
        });
    } catch (error) {
        console.error("[route/dodo] revert failed:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to revert.",
        });
    }
});

export default dodoRoutes;
