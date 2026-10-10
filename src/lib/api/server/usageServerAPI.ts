import { and, count, desc, eq } from "drizzle-orm";
import { getNeonDb, isNeonUniqueViolation, neonErrorMessage } from "@/lib/db/neon";
import { subscriptionGrants, usageLedger } from "@/lib/db/schema";
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
        const db = await getNeonDb();
        try {
            await db.insert(usageLedger).values({
                user_id: record.userId,
                batch_id: record.batchId,
                creative_index: record.creativeIndex,
                ratio_key: record.ratioKey,
            });
        } catch (error) {
            if (isNeonUniqueViolation(error)) return 'duplicate';
            throw new Error(`Failed to record image usage: ${neonErrorMessage(error)}`);
        }
        return 'recorded';
    },

    // 부여 기록 — append-only. 동일(구독, 사이클, 사유) 중복은 무시, 그 외 실패는 throw
    async recordGrant(record: GrantRecord): Promise<'recorded' | 'duplicate'> {
        const db = await getNeonDb();
        try {
            await db.insert(subscriptionGrants).values({
                user_id: record.userId,
                polar_subscription_id: record.polarSubscriptionId,
                cycle_start: record.cycleStart,
                cycle_end: record.cycleEnd,
                granted: record.granted,
                reason: record.reason,
            });
        } catch (error) {
            if (isNeonUniqueViolation(error)) return 'duplicate';
            throw new Error(`Failed to record grant: ${neonErrorMessage(error)}`);
        }
        return 'recorded';
    },

    async sumGrantedAllTime(userId: string): Promise<{ granted: number; hasHistory: boolean; hasPaid: boolean }> {
        const db = await getNeonDb();
        try {
            const rows = await db
                .select({
                    granted: subscriptionGrants.granted,
                    reason: subscriptionGrants.reason,
                })
                .from(subscriptionGrants)
                .where(eq(subscriptionGrants.user_id, userId));
            return {
                granted: rows.reduce((sum, row) => sum + (row.granted ?? 0), 0),
                hasHistory: rows.length > 0,
                hasPaid: rows.some((row) => row.reason === 'subscription' && (row.granted ?? 0) > 0),
            };
        } catch (error) {
            throw new Error(`Failed to sum grants: ${neonErrorMessage(error)}`);
        }
    },

    async countImagesAllTime(userId: string): Promise<number> {
        const db = await getNeonDb();
        try {
            const rows = await db
                .select({ value: count() })
                .from(usageLedger)
                .where(eq(usageLedger.user_id, userId));
            return rows[0]?.value ?? 0;
        } catch (error) {
            throw new Error(`Failed to count all-time usage: ${neonErrorMessage(error)}`);
        }
    },

    // 환불 회수용 — 해당 구독의 최신 'subscription' 부여행
    async latestGrantForSubscription(
        polarSubscriptionId: string,
    ): Promise<{ user_id: string; cycle_start: string; cycle_end: string; granted: number } | null> {
        const db = await getNeonDb();
        try {
            const rows = await db
                .select({
                    user_id: subscriptionGrants.user_id,
                    cycle_start: subscriptionGrants.cycle_start,
                    cycle_end: subscriptionGrants.cycle_end,
                    granted: subscriptionGrants.granted,
                })
                .from(subscriptionGrants)
                .where(eq(subscriptionGrants.polar_subscription_id, polarSubscriptionId))
                .orderBy(desc(subscriptionGrants.cycle_start))
                .limit(1);
            return rows[0] ?? null;
        } catch (error) {
            throw new Error(`Failed to fetch latest grant: ${neonErrorMessage(error)}`);
        }
    },

    // 사이클 순부여합 — 같은 구독·사이클에 찍힌 전 사유 합 (subscription + upgrade:* − refund).
    // 업그레이드 차액 계산 + 환불 전액 회수용. 행 없으면 0.
    async sumGrantedForSubscriptionCycle(
        polarSubscriptionId: string,
        cycleStart: string,
    ): Promise<number> {
        const db = await getNeonDb();
        try {
            const rows = await db
                .select({ granted: subscriptionGrants.granted })
                .from(subscriptionGrants)
                .where(
                    and(
                        eq(subscriptionGrants.polar_subscription_id, polarSubscriptionId),
                        eq(subscriptionGrants.cycle_start, cycleStart),
                    ),
                );
            return (rows ?? []).reduce((sum, row) => sum + (row.granted ?? 0), 0);
        } catch (error) {
            throw new Error(`Failed to sum cycle grants: ${neonErrorMessage(error)}`);
        }
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
        const db = await getNeonDb();
        try {
            const rows = await db
                .select({ value: count() })
                .from(subscriptionGrants)
                .where(
                    and(
                        eq(subscriptionGrants.user_id, userId),
                        eq(subscriptionGrants.reason, 'subscription'),
                    ),
                );
            return (rows[0]?.value ?? 0) > 0;
        } catch (error) {
            throw new Error(`Failed to check paid grants: ${neonErrorMessage(error)}`);
        }
    },
};
