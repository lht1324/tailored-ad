import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { User } from "@/lib/api/types/supabase/Users";

/**
 * 사용량 원장 API — usage_ledger append-only (수정·삭제 없음).
 * 1행 = 유저 1명의 이미지 1장. 유니크(batch, creative, ratio)가 중복을 흡수.
 */
export interface UsageRecord {
    userId: string;
    batchId: string;
    creativeIndex: number;
    ratioKey: string;
}

/** 무료 체험 1회 부여량 — 평생 1회, 소멸 없음 */
export const TRIAL_GRANT_IMAGES = 10;

/** 잔액제 사용량 — 누적 부여 − 누적 사용, 소멸 없음(이월). */
export interface BalanceUsage {
    mode: 'balance';
    used: number; // 누적 사용 (원장 전체)
    granted: number; // 누적 부여 (grants 합)
    remaining: number; // granted - used (0 하한)
    hasPaid: boolean; // 유료(subscription) 부여 이력 — 첫주문 할인 eligibility용
    periodStart: string | null; // 현재 사이클 시작 (없으면 null)
    periodEnd: string | null; // 현재 사이클 종료 (없으면 null)
}

export type UsageStatus = BalanceUsage;

export interface GrantRecord {
    userId: string;
    polarSubscriptionId: string | null; // trial은 null
    cycleStart: string; // ISO
    cycleEnd: string; // ISO
    granted: number; // 양수=부여, 음수=회수(환불)
    reason: string; // 'trial' | 'subscription' | 'refund'
}

export const usageServerAPI = {
    // 원장 기록 — 중복(웹훅 재시도)은 무시, 그 외 실패는 throw
    async recordImageUsage(record: UsageRecord): Promise<'recorded' | 'duplicate'> {
        const supabase = await createSupabaseServiceRoleClient();
        const { error } = await supabase.from('usage_ledger').insert({
            user_id: record.userId,
            batch_id: record.batchId,
            creative_index: record.creativeIndex,
            ratio_key: record.ratioKey,
        });
        if (error) {
            if (error.code === '23505') return 'duplicate';
            throw new Error(`Failed to record image usage: ${error.message}`);
        }
        return 'recorded';
    },

    // 부여 기록 — append-only. 동일(구독, 사이클, 사유) 중복은 무시, 그 외 실패는 throw
    async recordGrant(record: GrantRecord): Promise<'recorded' | 'duplicate'> {
        const supabase = await createSupabaseServiceRoleClient();
        const { error } = await supabase.from('subscription_grants').insert({
            user_id: record.userId,
            polar_subscription_id: record.polarSubscriptionId,
            cycle_start: record.cycleStart,
            cycle_end: record.cycleEnd,
            granted: record.granted,
            reason: record.reason,
        });
        if (error) {
            if (error.code === '23505') return 'duplicate';
            throw new Error(`Failed to record grant: ${error.message}`);
        }
        return 'recorded';
    },

    async sumGrantedAllTime(userId: string): Promise<{ granted: number; hasHistory: boolean; hasPaid: boolean }> {
        const supabase = await createSupabaseServiceRoleClient();
        const { data, error } = await supabase
            .from('subscription_grants')
            .select('granted, reason')
            .eq('user_id', userId);
        if (error) {
            throw new Error(`Failed to sum grants: ${error.message}`);
        }
        const rows = data ?? [];
        return {
            granted: rows.reduce((sum, row) => sum + (row.granted ?? 0), 0),
            hasHistory: rows.length > 0,
            hasPaid: rows.some((row) => row.reason === 'subscription' && (row.granted ?? 0) > 0),
        };
    },

    async countImagesAllTime(userId: string): Promise<number> {
        const supabase = await createSupabaseServiceRoleClient();
        const { count, error } = await supabase
            .from('usage_ledger')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        if (error) {
            throw new Error(`Failed to count all-time usage: ${error.message}`);
        }
        return count ?? 0;
    },

    // 환불 회수용 — 해당 구독의 최신 'subscription' 부여행
    async latestGrantForSubscription(
        polarSubscriptionId: string,
    ): Promise<{ user_id: string; cycle_start: string; cycle_end: string; granted: number } | null> {        const supabase = await createSupabaseServiceRoleClient();
        const { data, error } = await supabase
            .from('subscription_grants')
            .select('user_id, cycle_start, cycle_end, granted')
            .eq('polar_subscription_id', polarSubscriptionId)
            .eq('reason', 'subscription')
            .order('cycle_start', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            throw new Error(`Failed to fetch latest grant: ${error.message}`);
        }
        return data;
    },

    // 사이클 순부여합 — 같은 구독·사이클에 찍힌 전 사유 합 (subscription + upgrade:* − refund).
    // 업그레이드 차액 계산 + 환불 전액 회수용. 행 없으면 0.
    async sumGrantedForSubscriptionCycle(
        polarSubscriptionId: string,
        cycleStart: string,
    ): Promise<number> {
        const supabase = await createSupabaseServiceRoleClient();
        const { data, error } = await supabase
            .from('subscription_grants')
            .select('granted')
            .eq('polar_subscription_id', polarSubscriptionId)
            .eq('cycle_start', cycleStart);
        if (error) {
            throw new Error(`Failed to sum cycle grants: ${error.message}`);
        }
        return (data ?? []).reduce((sum, row) => sum + (row.granted ?? 0), 0);
    },

    // 사용량 상태 — 잔액제 단일. 부여 이력 없으면 trial 10장 lazy 부여 후 잔액제.
    // 월 리셋 없음 (무료 폴백 폐지). trial 유니크(user_id WHERE reason='trial')가 동시호출 흡수.
    async getUsageStatus(user: User): Promise<UsageStatus> {
        let summary = await usageServerAPI.sumGrantedAllTime(user.id);
        if (!summary.hasHistory) {
            // trial 적립 실패해도 조회는 죽이지 않는다 (잔액 0 폴백, 로그로 추적)
            try {
                const now = new Date().toISOString();
                await usageServerAPI.recordGrant({
                    userId: user.id,
                    polarSubscriptionId: null,
                    cycleStart: now,
                    cycleEnd: now,
                    granted: TRIAL_GRANT_IMAGES,
                    reason: 'trial',
                });
                summary = await usageServerAPI.sumGrantedAllTime(user.id);
            } catch (grantError) {
                console.error(`[usage] trial grant failed (user=${user.id}):`, grantError);
            }
        }
        const used = await usageServerAPI.countImagesAllTime(user.id);
        return {
            mode: 'balance',
            used,
            granted: summary.granted,
            remaining: Math.max(0, summary.granted - used),
            hasPaid: summary.hasPaid,
            periodStart: user.subscription_current_period_start ?? null,
            periodEnd: user.subscription_current_period_end ?? null,
        };
    },

    // 첫 유료 여부 — 체크아웃 첫주문 할인 eligibility용 (trial은 유료 아님)
    async hasPaidGrant(userId: string): Promise<boolean> {
        const supabase = await createSupabaseServiceRoleClient();
        const { count, error } = await supabase
            .from('subscription_grants')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('reason', 'subscription')
            .limit(1);
        if (error) {
            throw new Error(`Failed to check paid grants: ${error.message}`);
        }
        return (count ?? 0) > 0;
    },
};
