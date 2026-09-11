/**
 * 헤드라인 색 정규화 — LLM은 white/black 토큰만 출력, 에디터는 임의 hex 허용.
 * 저장 시 hex로 통일하고, 렌더 시 레거시 토큰도 수용한다.
 */

export function normalizeHeadlineColor(value: string | null | undefined): string {
    if (value === 'black') return '#000000';
    if (!value || value === 'white') return '#FFFFFF';
    const hex = value.startsWith('#') ? value : `#${value}`;
    return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex.toUpperCase() : '#FFFFFF';
}

export function isValidHexColor(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const hex = value.startsWith('#') ? value : `#${value}`;
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// 상대 휘도 (WCAG) — scrim 방향 판정용
export function hexLuminance(hex: string): number {
    const h = normalizeHeadlineColor(hex).slice(1);
    const channel = (i: number) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

// 밝은 글씨에는 어두운 scrim
export function needsDarkScrim(hex: string): boolean {
    return hexLuminance(hex) >= 0.4;
}

// scrim 기본 농도 — 밝은 글씨 65 / 어두운 글씨 40
export function defaultScrimStrength(headlineColor: string | null | undefined): number {
    return needsDarkScrim(normalizeHeadlineColor(headlineColor)) ? 65 : 40;
}
