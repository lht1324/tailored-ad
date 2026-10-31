'use client'

/**
 * UTM 귀속 캡처 (10-20)
 *
 * 목적: "어느 채널에서 사람이 왔고 → 트라이얼 → 결제로 이어졌나"를 외부 도구 없이
 * 우리 DB에서 바로 보기. 다음 달 예산을 어디에 쓸지 정하는 근거가 이것.
 *
 * 흐름: 랜딩 진입 시 URL의 utm_* 를 localStorage에 저장 → OAuth 로그인(리다이렉트)
 *      → 프로필 로드 후 1회 PATCH로 users 행에 기록 → 저장값 삭제(재사용 방지).
 */

export interface UtmParams {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
}

const STORAGE_KEY = 'ta_utm';
const MAX_LEN = 120;

function sanitize(value: string | null): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim().slice(0, MAX_LEN);
    return trimmed === '' ? undefined : trimmed;
}

/** 랜딩에서 1회 호출 — URL의 utm 파라미터를 저장(없으면 아무것도 안 함) */
export function captureUtmFromUrl(): void {
    if (typeof window === 'undefined') return;
    try {
        const params = new URLSearchParams(window.location.search);
        const captured: UtmParams = {
            utm_source: sanitize(params.get('utm_source')),
            utm_medium: sanitize(params.get('utm_medium')),
            utm_campaign: sanitize(params.get('utm_campaign')),
            utm_content: sanitize(params.get('utm_content')),
        };
        if (!captured.utm_source && !captured.utm_medium && !captured.utm_campaign && !captured.utm_content) {
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
    } catch {
        /* localStorage 불가 환경(프라이빗 모드) — 무시 */
    }
}

/** 저장된 UTM을 읽고 삭제 — 한 번만 쓰고 회수 */
export function consumeStoredUtm(): UtmParams | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        window.localStorage.removeItem(STORAGE_KEY);
        const parsed = JSON.parse(raw) as UtmParams;
        if (!parsed.utm_source && !parsed.utm_medium && !parsed.utm_campaign && !parsed.utm_content) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

/** 현재 URL의 UTM (저장값 삭제 없이 읽기) — 수집 폼용 */
export function readCurrentUtm(): UtmParams {
    if (typeof window === 'undefined') return {};
    try {
        const params = new URLSearchParams(window.location.search);
        return {
            utm_source: sanitize(params.get('utm_source')),
            utm_medium: sanitize(params.get('utm_medium')),
            utm_campaign: sanitize(params.get('utm_campaign')),
            utm_content: sanitize(params.get('utm_content')),
        };
    } catch {
        return {};
    }
}
