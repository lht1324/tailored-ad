'use client';

import { memo } from 'react';
import { Player } from '@remotion/player';
import { AdStillComposition, type AdStillInput } from "@/components/page/ad/projects/[projectId]/edit/AdStillComposition";
import { COMPOSITE_SIZES } from "@/components/page/ad/projects/[projectId]/components/compositeDownload";

function EditorCanvas({ ratioKey, input, onDragHeadline, onDragCta, selectedElement, onSelectHeadline, onSelectCta }: {
    ratioKey: string;
    input: AdStillInput;
    onDragHeadline?: ((x: number, y: number) => void) | null;
    onDragCta?: ((x: number, y: number) => void) | null;
    selectedElement?: 'headline' | 'cta' | null;
    onSelectHeadline?: (() => void) | null;
    onSelectCta?: (() => void) | null;
}) {
    // 가로형은 열 너비대로, 세로형은 뷰포트 높이에 맞춰 (스크롤 없이 크게) — 표시 폭은 호출부 래퍼가 담당
    const size = COMPOSITE_SIZES[ratioKey] ?? { w: 1080, h: 1350 };
    return (
        <Player
            key={ratioKey}
            component={AdStillComposition}
            inputProps={{ ...input, onDragHeadline: onDragHeadline ?? null, onDragCta: onDragCta ?? null, selectedElement: selectedElement ?? null, onSelectHeadline: onSelectHeadline ?? null, onSelectCta: onSelectCta ?? null }}
            durationInFrames={1}
            compositionWidth={size.w}
            compositionHeight={size.h}
            fps={30}
            controls={false}
            autoPlay={false}
            loop={false}
            clickToPlay={false}
            acknowledgeRemotionLicense
            style={{
                width: '100%',
                borderRadius: '1.5rem',
                overflow: 'hidden',
                border: '1px solid var(--ad-hairline)',
            }}
        />
    );
}

export default memo(EditorCanvas);
