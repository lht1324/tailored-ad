'use client'

import { memo } from 'react';
import { AdAspectRatio, AdUploadedComponent, AdTaskStatus } from "@/lib/api/client/ad/adClientAPI";

const ASPECT_CLASS: Record<AdAspectRatio, string> = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
    '2:3': 'aspect-[2/3]',
};

const STAGE_LABELS: Record<AdTaskStatus, string> = {
    queued: 'Queued',
    generating: 'Generating background & composite',
    designing: 'Designing layout with AI',
    rendering: 'Rendering deterministic output',
    completed: 'Completed',
    failed: 'Failed',
};

const STAGE_ORDER: AdTaskStatus[] = ['queued', 'generating', 'designing', 'rendering', 'completed'];

interface PreviewCanvasProps {
    aspectRatio: AdAspectRatio;
    backgroundPrompt: string | null;
    backgroundImage: AdUploadedComponent | null;
    product: AdUploadedComponent | null;
    person: AdUploadedComponent | null;
    status: AdTaskStatus | null;
}

function PreviewCanvas({
    aspectRatio,
    backgroundPrompt,
    backgroundImage,
    product,
    person,
    status,
}: PreviewCanvasProps) {
    const isGenerating = status !== null && status !== 'completed' && status !== 'failed';

    return (
        <div className={`relative mx-auto h-[72vh] max-w-full overflow-hidden rounded-[1.5rem] border border-hairline bg-surface ${ASPECT_CLASS[aspectRatio]}`}>
            {/* 배경 레이어 */}
            {backgroundImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={backgroundImage.previewUrl}
                    alt="Background"
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1B1B20] via-[#121215] to-[#0C0C0E] px-8 text-center">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">Background · T2I</span>
                    {backgroundPrompt ? (
                        <p className="max-w-[32ch] min-w-0 text-left text-[13px] leading-relaxed break-words whitespace-pre-line text-text2">
                            {backgroundPrompt}
                        </p>
                    ) : (
                        <p className="text-[13px] text-text2">Your generated background will appear here.</p>
                    )}
                </div>
            )}

            {/* 상품/인물 레이어 */}
            {(product || person) && (
                <div className="absolute bottom-4 right-4 flex gap-2">
                    {product && (
                        <div className="overflow-hidden rounded-xl border border-hairline bg-surface/80 p-1 backdrop-blur-sm transition-transform duration-300 origin-bottom-right hover:scale-[2.0]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.previewUrl} alt="Product" className="h-32 w-32 rounded-lg object-cover" />
                            <p className="mt-1 text-center text-[11px] text-text2">
                                Product
                            </p>
                        </div>
                    )}
                    {person && (
                        <div className="overflow-hidden rounded-xl border border-hairline bg-surface/80 p-1 backdrop-blur-sm transition-transform duration-300 origin-bottom-right hover:scale-[2.0]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={person.previewUrl} alt="Person" className="h-32 w-32 rounded-lg object-cover" />
                            <p className="mt-1 text-center text-[11px] text-text2">
                                Person
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* 생성 진행 오버레이 */}
            {isGenerating && status && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-canvas/85 backdrop-blur-sm">
                    <div className="w-3/5 space-y-3">
                        <div className="h-5 w-2/3 animate-pulse rounded-md bg-surface" />
                        <div className="h-5 w-full animate-pulse rounded-md bg-surface" />
                        <div className="h-4 w-1/2 animate-pulse rounded-md bg-surface" />
                    </div>
                    <div className="w-3/5">
                        <div className="h-9 w-full animate-pulse rounded-full bg-surface" />
                    </div>

                    <div className="flex w-3/5 flex-col items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text1">
                            {STAGE_LABELS[status]}
                        </span>
                        <div className="h-px w-full overflow-hidden bg-hairline">
                            <div
                                className="h-full bg-accent transition-all duration-700 ease-out"
                                style={{
                                    width: `${((STAGE_ORDER.indexOf(status) + 1) / STAGE_ORDER.length) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(PreviewCanvas);
