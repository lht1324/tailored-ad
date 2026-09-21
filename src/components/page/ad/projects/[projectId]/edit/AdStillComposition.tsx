'use client';

import { AbsoluteFill, Img } from 'remotion';
import AdOverlay from "@/components/public/AdOverlay";
import type { AdDesignLayout } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * Remotion 스틸 컴포지션 — 프리뷰·다운로드와 같은 AdOverlay를 그대로 쓴다.
 * 같은 컴포넌트라 에디터 캔버스와 타일/모달/PNG가 구조적으로 동일하다.
 * (스틸 1프레임. 모션 광고 시 duration·keyframes만 늘리면 됨)
 */
export interface AdStillInput {
    imageUrl: string;
    design: AdDesignLayout;
    headlineFontFamily?: string | null;
    headlineFontWeight?: number | null;
    headlineColor?: string | null;
    brandLogoUrl?: string | null;
    // 에디터 전용 드래그 (프리뷰 경로에서는 미전달)
    onDragHeadline?: ((x: number, y: number) => void) | null;
    onDragCta?: ((x: number, y: number) => void) | null;
    // 에디터 전용 선택 (팝오버용, 프리뷰 경로에서는 미전달)
    selectedElement?: 'headline' | 'cta' | null;
    onSelectHeadline?: (() => void) | null;
    onSelectCta?: (() => void) | null;
}

export function AdStillComposition({ imageUrl, design, headlineFontFamily, headlineFontWeight, headlineColor, brandLogoUrl, onDragHeadline, onDragCta, selectedElement, onSelectHeadline, onSelectCta }: AdStillInput) {
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            <Img src={imageUrl} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' }} />
            <AdOverlay
                design={design}
                headlineFontFamily={headlineFontFamily ?? null}
                headlineFontWeight={headlineFontWeight ?? null}
                headlineColor={headlineColor ?? 'white'}
                brandLogoUrl={brandLogoUrl ?? null}
                drag={onDragHeadline || onDragCta ? { onDragHeadline: onDragHeadline ?? null, onDragCta: onDragCta ?? null } : null}
                select={onSelectHeadline || onSelectCta ? { selected: selectedElement ?? null, onSelectHeadline: onSelectHeadline ?? null, onSelectCta: onSelectCta ?? null } : null}
            />
        </AbsoluteFill>
    );
}
