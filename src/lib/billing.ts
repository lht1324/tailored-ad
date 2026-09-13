/**
 * 과금 기준 — 이미지 1장 = 저장 확정된 완성 이미지 1개 (실패·재시도는 무료).
 * 월 경계는 KST 1일 00:00 (서버 TZ 무관 확정식).
 */

// 요금제 확정 전 기본 월 quota (users.image_limit이 있으면 그 값 우선)
export const DEFAULT_MONTHLY_IMAGE_QUOTA = 50;

export function getMonthStartKST(now: Date = new Date()): Date {
    const kst = new Date(now.getTime() + 9 * 3600 * 1000);
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1) - 9 * 3600 * 1000);
}
