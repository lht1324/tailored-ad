// Forked from shortreal: the video-model config chain (VideoGenerationTasks,
// which drags in the workspace editor) is intentionally severed here.
// TailoredAd owns its own model config shape.
export interface AdModelConfig {
  [key: string]: unknown;
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string;
    plan?: SubscriptionPlan;
    created_at: string;
    updated_at: string;

    subscription_id?: string; // Polar 구독 웹훅에 추가
    /** 현재 결제 사이클 [start, end) — Polar 웹훅이 동기화. NULL이면 KST 달력월 폴백 */
    subscription_current_period_start?: string | null;
    subscription_current_period_end?: string | null;
    /** 월 이미지 quota — NULL이면 코드 기본값. Polar·어드민만 변경 (클라 PATCH 차단) */
    image_limit?: number | null;
    last_subscribed_at: string;
    scheduled_downgrade_at?: string;
    downgrade_target_plan_id?: string;

    preferred_ai_model_config?: AdModelConfig | null;

    // BYOK Keys
    fal_ai_api_key?: string | null;
    replicate_api_key?: string | null;
}

export enum SubscriptionPlan {
    NONE = "none",
    PLAN_1 = "plan-1",
    PLAN_2 = "plan-2",
    PLAN_3 = "plan-3",
    PLAN_4 = "plan-4",
}