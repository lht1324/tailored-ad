import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { DEFAULT_MONTHLY_IMAGE_QUOTA, getMonthStartKST } from "@/lib/billing";

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
};
