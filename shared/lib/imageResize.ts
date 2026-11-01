/**
 * 참조 이미지 다운스케일 — Generate 클릭 시점에 업로드 직전 호출한다.
 * 미리보기는 원본 그대로 보여주고(눈속임), 전송되는 파일만 줄인다.
 *
 * 근거 (긴 변 1024):
 * - 프롬프트 LLM(Gemini 계열 vision)은 768x768 타일 처리 — 초대형 원본은 타일 수만 늘려 토큰 낭비
 * - FLUX.2 입력은 1MP 상한(1024x1024)으로 내부 리사이즈됨 — 그 이상은 잘려나감
 * - Replicate 입력 과금 $0.014/MP — 작을수록 직접 절감
 *
 * 규칙: 비율 유지, 긴 변 초과 시에만 축소(업스케일 금지), 원 포맷 유지(PNG 투명 보존),
 * 실패하면 원본 그대로 반환(fail-soft). 서버(Workers CPU 10ms) 처리는 불가라 클라이언트 전용.
 */

/** 참조 이미지 긴 변 상한 (px) */
export const MAX_REFERENCE_LONG_EDGE = 1024;

/** 8의 배수로 반올림 (JPEG 블록 정합) */
function roundToBlock8(value: number): number {
    return Math.max(8, Math.round(value / 8) * 8);
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image for resize.'));
        image.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type || undefined);
    });
}

export async function downscaleImageFile(
    file: File,
    maxLongEdge: number = MAX_REFERENCE_LONG_EDGE,
): Promise<File> {
    let objectUrl: string | null = null;
    try {
        objectUrl = URL.createObjectURL(file);
        const image = await loadImage(objectUrl);
        const srcWidth = image.naturalWidth;
        const srcHeight = image.naturalHeight;

        if (!srcWidth || !srcHeight || Math.max(srcWidth, srcHeight) <= maxLongEdge) {
            return file;
        }

        const scale = maxLongEdge / Math.max(srcWidth, srcHeight);
        const dstWidth = roundToBlock8(srcWidth * scale);
        const dstHeight = roundToBlock8(srcHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = dstWidth;
        canvas.height = dstHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return file;
        }
        ctx.drawImage(image, 0, 0, dstWidth, dstHeight);

        const blob = await canvasToBlob(canvas, file.type);
        if (!blob) {
            return file;
        }

        console.info(`[imageResize] ${file.name}: ${srcWidth}x${srcHeight} -> ${dstWidth}x${dstHeight}`);
        return new File([blob], file.name, { type: file.type || blob.type, lastModified: Date.now() });
    } catch (error) {
        console.warn('[imageResize] downscale failed, uploading original:', error);
        return file;
    } finally {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    }
}
