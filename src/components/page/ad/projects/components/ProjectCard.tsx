'use client'

import { memo, useMemo } from 'react';
import Image from 'next/image';
import { Clock, Layers, AlertTriangle, CheckCircle2, Loader2, ImageIcon } from 'lucide-react';
import { AdGenerationBatch, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { getProjectProgress } from "@/lib/api/client/ad/adProjectClientAPI";

const STATUS_STYLE: Record<string, string> = {
    queued: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    generating: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    designing: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    rendering: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
    failed: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
    queued: 'Queued',
    generating: 'Generating',
    designing: 'Designing',
    rendering: 'Rendering',
    completed: 'Completed',
    failed: 'Failed',
};

function formatRelative(dateString: string): string {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ProjectCardProps {
    project: AdGenerationBatch;
    thumbnailUrl?: string | null;
    thumbnailRatio?: AdRatioKey | null;
    onClick: () => void;
}

function ProjectCard({ project, thumbnailUrl, thumbnailRatio, onClick }: ProjectCardProps) {
    const progress = useMemo(() => getProjectProgress(project), [project]);
    const totalAssets = project.concept_count * project.aspect_ratios.length;

    const statusLabel = STATUS_LABEL[project.status] ?? project.status;
    const statusStyle = STATUS_STYLE[project.status] ?? 'bg-surface text-text2 border-hairline';

    const hasFailure = progress.failed > 0;
    const isRunning = project.status !== 'completed' && project.status !== 'failed';

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-hairline bg-surface text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-text2/30 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0"
        >
            {/* 썸네일 영역 — 최고점 커버 또는 상태 시각화 */}
            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-canvas">
                {thumbnailUrl ? (
                    <>
                        <Image
                            src={thumbnailUrl}
                            alt={`Project ${project.id.slice(0, 6)} thumbnail`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                            style={{
                                objectPosition:
                                    thumbnailRatio === '9_16' || thumbnailRatio === '2_3' || thumbnailRatio === '4_5'
                                        ? 'top center'
                                        : 'center',
                            }}
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/10" />
                    </>
                ) : null}

                {/* 브랜드 팔레트 점 — 상단 좌측 */}
                {project.brand_palette && project.brand_palette.length > 0 && (
                    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-black/5 bg-surface/90 px-2 py-1 backdrop-blur-sm">
                        {project.brand_palette.slice(0, 5).map((hex) => (
                            <span
                                key={hex}
                                className="h-3 w-3 rounded-full border border-black/10 shadow-sm"
                                style={{ backgroundColor: hex }}
                            />
                        ))}
                    </div>
                )}

                {/* 상태 배지 — 상단 우측 */}
                <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur-sm ${statusStyle}`}>
                    {isRunning && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />}
                    {!isRunning && project.status === 'completed' && !hasFailure && <CheckCircle2 className="h-3 w-3" strokeWidth={2} />}
                    {!isRunning && hasFailure && <AlertTriangle className="h-3 w-3" strokeWidth={2} />}
                    {statusLabel}
                    {hasFailure && project.status === 'completed' ? ' · partial' : ''}
                </span>

                {/* 중앙 상태 — 썸네일 없을 때만 */}
                {!thumbnailUrl && (
                    <div className="flex flex-col items-center gap-3 px-6 text-center">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${isRunning ? 'border-sky-500/20 bg-sky-500/10 text-sky-600' : hasFailure ? 'border-amber-500/20 bg-amber-500/10 text-amber-600' : 'border-hairline bg-surface text-text2'}`}>
                            {isRunning ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} /> : hasFailure ? <AlertTriangle className="h-5 w-5" strokeWidth={1.8} /> : <ImageIcon className="h-5 w-5" strokeWidth={1.8} />}
                        </span>
                        <div className="space-y-1">
                            <p className="text-[13px] font-medium text-text1">
                                {progress.completed}/{progress.total} assets
                                {progress.failed > 0 ? ` · ${progress.failed} failed` : ''}
                            </p>
                            <p className="text-[11px] text-text2">
                                {project.concept_count} creative{project.concept_count > 1 ? 's' : ''} · {project.aspect_ratios.length} format{project.aspect_ratios.length > 1 ? 's' : ''} · {project.cta_enabled ? 'CTA on' : 'no CTA'}
                            </p>
                        </div>
                    </div>
                )}

                {/* 썸네일 있을 때 하단 정보 오버레이 */}
                {thumbnailUrl && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
                        <p className="text-[11px] font-medium text-white drop-shadow">
                            {progress.completed}/{progress.total} assets
                            {progress.failed > 0 ? ` · ${progress.failed} failed` : ''} · {project.concept_count} creatives
                        </p>
                    </div>
                )}

                {/* 하단 진행 바 */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-hairline">
                    <div
                        className={`h-full transition-all duration-500 ${hasFailure ? 'bg-amber-500' : isRunning ? 'bg-sky-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progress.total > 0 ? Math.round(((progress.completed + progress.failed) / progress.total) * 100) : 0}%` }}
                    />
                </div>
            </div>

            {/* 메타 영역 */}
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[14px] font-semibold tracking-tight text-text1">
                        Project {project.id.slice(0, 6)}
                        <span className="ml-2 font-mono text-[11px] font-normal text-text2">#{project.id.slice(0, 8)}</span>
                    </h3>
                    <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text2">
                        <Clock className="h-3 w-3" strokeWidth={1.8} />
                        {formatRelative(project.created_at)}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {project.aspect_ratios.map((ratio) => (
                        <span
                            key={ratio}
                            className="rounded-full border border-hairline bg-canvas px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text2"
                        >
                            {(ratio as string).replace('_', ':')}
                        </span>
                    ))}
                    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] text-text2">
                        <Layers className="h-3 w-3" strokeWidth={1.8} />
                        {totalAssets} assets
                    </span>
                </div>

                <p className="line-clamp-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text2">
                    {isRunning ? `${progress.pending} pending · live updating` : hasFailure ? `${progress.failed} failed · ${progress.completed} ready` : `${progress.completed} ready · downloads unlimited`}
                </p>
            </div>
        </button>
    );
}

export default memo(ProjectCard);
