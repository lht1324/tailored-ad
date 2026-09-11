'use client';

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { toBlob } from 'html-to-image';
import JSZip from 'jszip';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import type { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";

/**
 * 합성본 다운로드 — 화면에 보이는 오버레이 DOM을 그대로 PNG로 뽑는다.
 * 구 canvas 합성과 달리 "같은 레이아웃 엔진"이라 프리뷰와 구조적으로 동일하다
 * (개행 위치·자간·폰트·scrim 전부 일치).
 *
 * 원본 이미지(Supabase signed URL)와 웹폰트는 html-to-image가 인라인하므로
 * CORS가 열려 있어야 한다. 둘 다 열려 있음 (Supabase Storage *, Google Fonts *).
 */

// 다운로드 해상도 — 기존 canvas 합성과 동일 (1080 베이스)
export const COMPOSITE_SIZES: Record<string, { w: number; h: number }> = {
    '1_1': { w: 1080, h: 1080 },
    '4_5': { w: 1080, h: 1350 },
    '9_16': { w: 1080, h: 1920 },
    '16_9': { w: 1920, h: 1080 },
    '2_3': { w: 1080, h: 1620 },
};

// 파일명 통일 — 콜론 없음 (1:1 → 1_1 그대로 사용)
export function buildDownloadFileName(creativeIndex: number, ratioKey: string): string {
    return `tailorad-c${String(creativeIndex + 1).padStart(2, '0')}-${ratioKey}.png`;
}

export interface CompositeDownloadOptions {
    imageUrl: string;
    design: AdDesignLayout;
    ratioKey: string;
    creativeIndex: number;
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: string | null;
    brandLogoUrl?: string | null;
}

function SnapshotView({ imageUrl, design, size, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl }: {
    imageUrl: string;
    design: AdDesignLayout;
    size: { w: number; h: number };
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: string | null;
    brandLogoUrl?: string | null;
}) {
    return (
        <div style={{ position: 'relative', width: size.w, height: size.h, overflow: 'hidden', background: '#000' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={imageUrl}
                alt=""
                crossOrigin="anonymous"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <AdOverlay
                design={design}
                headlineFontFamily={headlineFontFamily ?? null}
                headlineFontWeight={headlineFontWeight ?? null}
                headlineColor={headlineColor ?? 'white'}
                brandLogoUrl={brandLogoUrl ?? null}
            />
        </div>
    );
}

async function waitForSnapshotReady(host: HTMLElement, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    try {
        // 원본 이미지 디코딩 대기 (캐시 적중 시 즉시)
        const img = host.querySelector('img');
        if (img) {
            await Promise.race([
                img.decode().catch(() => {}),
                new Promise((resolve) => setTimeout(resolve, timeoutMs)),
            ]);
        }
        // 웹폰트 (오버레이 내부 폰트 게이트의 load 포함) + 레이아웃 2프레임
        try {
            await Promise.race([
                document.fonts.ready,
                new Promise((resolve) => setTimeout(resolve, timeoutMs)),
            ]);
        } catch {}
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const remaining = deadline - Date.now();
        if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 120)));
        }
    } catch {
        /* 준비 실패해도 스냅샷은 진행 (폴백 폰트 가능성) */
    }
}

export async function downloadCompositedImage(opts: CompositeDownloadOptions): Promise<void> {
    const size = COMPOSITE_SIZES[opts.ratioKey] ?? { w: 1080, h: 1350 };
    const blob = await renderSnapshotBlob(opts, size);
    triggerBlobDownload(blob, buildDownloadFileName(opts.creativeIndex, opts.ratioKey));
}

export interface ZipProgress {
    done: number;
    total: number;
    phase: 'render' | 'zip';
}

// 벌크 ZIP — 순차 합성(메모리 피크 억제) 후 1발로 묶어 저장
export async function downloadItemsAsZip(
    items: CompositeDownloadOptions[],
    zipFileName: string,
    onProgress?: (p: ZipProgress) => void,
): Promise<{ saved: number; total: number }> {
    const zip = new JSZip();
    let saved = 0;
    for (const item of items) {
        const size = COMPOSITE_SIZES[item.ratioKey] ?? { w: 1080, h: 1350 };
        const blob = await renderSnapshotBlob(item, size);
        zip.file(buildDownloadFileName(item.creativeIndex, item.ratioKey), blob);
        saved += 1;
        onProgress?.({ done: saved, total: items.length, phase: 'render' });
    }
    const content = await zip.generateAsync({ type: 'blob' }, () => {
        onProgress?.({ done: saved, total: items.length, phase: 'zip' });
    });
    triggerBlobDownload(content, zipFileName);
    return { saved, total: items.length };
}

function triggerBlobDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function renderSnapshotBlob(opts: CompositeDownloadOptions, size: { w: number; h: number }): Promise<Blob> {
    // 화면 밖 렌더용 호스트 (display:none이면 레이아웃이 안 잡히므로 offscreen 배치)
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-100000px;top:0;width:${size.w}px;height:${size.h}px;overflow:hidden;`;
    document.body.appendChild(host);
    const root = createRoot(host);

    try {
        flushSync(() => {
            root.render(
                <SnapshotView
                    imageUrl={opts.imageUrl}
                    design={opts.design}
                    size={size}
                    headlineFontFamily={opts.headlineFontFamily ?? null}
                    headlineFontWeight={opts.headlineFontWeight ?? null}
                    headlineColor={opts.headlineColor ?? 'white'}
                    brandLogoUrl={opts.brandLogoUrl ?? null}
                />
            );
        });
        await waitForSnapshotReady(host, 15000);

        const node = host.firstElementChild as HTMLElement | null;
        if (!node) throw new Error('snapshot node missing');

        const blob = await toBlob(node, {
            canvasWidth: size.w,
            canvasHeight: size.h,
            pixelRatio: 1,
            cacheBust: false,
        });
        if (!blob) throw new Error('snapshot render failed');
        return blob;
    } finally {
        root.unmount();
        host.remove();
    }
}
