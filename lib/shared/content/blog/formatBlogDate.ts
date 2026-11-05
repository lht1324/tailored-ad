/**
 * 'YYYY-MM-DD' → "Oct 24, 2026" 표기 변환.
 * Intl/시간대 의존을 피하기 위해 파싱을 직접 한다 — 서버·클라 포맷 불일치(hydration) 원천 차단.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatBlogDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map((part) => Number(part));
    if (!year || !month || !day || month < 1 || month > 12) {
        return isoDate;
    }
    return `${MONTHS[month - 1]} ${day}, ${year}`;
}
