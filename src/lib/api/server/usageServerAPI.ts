import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { DEFAULT_MONTHLY_IMAGE_QUOTA, getMonthStartKST } from "@/lib/billing";
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

export interface MonthlyUsage {
    used: number;
    limit: number;
    remaining: number;
    periodStart: string;
}

/** 잔액제 사용량 — 유료(부여 이력 있음) 유저용. 사용은 누적 전체, 소멸 없음(이월). */
export interface BalanceUsage {
    mode: 'balance';
    used: number; // 누적 사용 (원장 전체)
    granted: number; // 누적 부여 (grants 합)
    remaining: number; // granted - used (0 하한)
    periodStart: string | null; // 현재 사이클 시작 (없으면 null)
    periodEnd: string | null; // 현재 사이클 종료 (없으면 null)
}

/** 달력월 사용량 — 무료·부여 이력 없음 유저용 (KST 1일 리셋, 기존 동작) */
export interface CycleUsage {
    mode: 'monthly';
    used: number;
    limit: number;
    remaining: number;
    periodStart: string;
    periodEnd: null;
}

export type UsageStatus = BalanceUsage | CycleUsage;

export interface GrantRecord {
    userId: string;
    polarSubscriptionId: string;
    cycleStart: string; // ISO
    cycleEnd: string; // ISO
    granted: number; // 양수=부여, 음수=회수(환불)
    reason: string; // 'subscription' | 'refund'
}

export const usageServerAPI = {
    // 원장 기록 — 중복(웹훅 재시도)은 무시, 그 외 실패는 throw
    async recordImageUsage(record: UsageRecord): Promise<'recorded' | 'duplicate'> {
        const supabase = createSupabaseServiceRoleClient();
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

    async countImagesSince(userId: string, sinceIso: string): Promise<number> {
        const supabase = createSupabaseServiceRoleClient();
        const { count, error } = await supabase
            .from('usage_ledger')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', sinceIso);
        if (error) {
            throw new Error(`Failed to count image usage: ${error.message}`);
        }
        return count ?? 0;
    },

    async getMonthlyUsage(userId: string, limit: number | null): Promise<MonthlyUsage> {
        const periodStart = getMonthStartKST();
        const used = await usageServerAPI.countImagesSince(userId, periodStart.toISOString());
        const quota = limit ?? DEFAULT_MONTHLY_IMAGE_QUOTA;
        return {
            used,
            limit: quota,
            remaining: Math.max(0, quota - used),
            periodStart: periodStart.toISOString(),
        };
    },

    // 부여 기록 — append-only. 동일(구독, 사이클, 사유) 중복은 무시, 그 외 실패는 throw
    async recordGrant(record: GrantRecord): Promise<'recorded' | 'duplicate'> {
        const supabase = createSupabaseServiceRoleClient();
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

    async sumGrantedAllTime(userId: string): Promise<{ granted: number; hasHistory: boolean }> {
        const supabase = createSupabaseServiceRoleClient();
        const { data, error } = await supabase
            .from('subscription_grants')
            .select('granted')
            .eq('user_id', userId);
        if (error) {
            throw new Error(`Failed to sum grants: ${error.message}`);
        }
        const rows = data ?? [];
        return {
            granted: rows.reduce((sum, row) => sum + (row.granted ?? 0), 0),
            hasHistory: rows.length > 0,
        };
    },

    async countImagesAllTime(userId: string): Promise<number> {
        const supabase = createSupabaseServiceRoleClient();
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
    ): Promise<{ user_id: string; cycle_start: string; cycle_end: string; granted: number } | null> {
        const supabase = createSupabaseServiceRoleClient();
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

    // 사용량 상태 — 부여 이력 있으면 잔액제, 없으면 KST 달력월제
    async getUsageStatus(user: User): Promise<UsageStatus> {
        const { granted, hasHistory } = await usageServerAPI.sumGrantedAllTime(user.id);
        if (hasHistory) {
            const used = await usageServerAPI.countImagesAllTime(user.id);
            return {
                mode: 'balance',
                used,
                granted,
                remaining: Math.max(0, granted - used),
                periodStart: user.subscription_current_period_start ?? null,
                periodEnd: user.subscription_current_period_end ?? null,
            };
        }
        const monthly = await usageServerAPI.getMonthlyUsage(user.id, user.image_limit ?? null);
        return { ...monthly, mode: 'monthly', periodEnd: null };
    },
};
