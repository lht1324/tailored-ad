let measureContext: CanvasRenderingContext2D | null = null;

/**
 * CSS 줄바꿈 근사 — letter-spacing 미반영이라 보수적(줄 수 과대 추정 가능, 클램프는 안전측).
 * SSR에서는 document가 없어 1줄 반환 (호출처에서 suppressHydrationWarning 처리).
 */
export function estimateWrappedLines(text: string, font: string, boxPx: number): number {
    try {
        if (typeof document === 'undefined') return 1;
        if (!measureContext) {
            const canvas = document.createElement('canvas');
            measureContext = canvas.getContext('2d');
        }
        if (!measureContext) return 1;
        const words = text.split(' ').filter((w) => w.length > 0);
        if (words.length === 0) return 1;
        measureContext.font = font;
        let lines = 1;
        let line = '';
        for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (measureContext.measureText(test).width > boxPx && line) {
                lines += 1;
                line = word;
            } else {
                line = test;
            }
        }
        return Math.max(1, lines);
    } catch {
        return 1;
    }
}
