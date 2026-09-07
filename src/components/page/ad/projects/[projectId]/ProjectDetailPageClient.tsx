'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Download, Layers, Loader2, Palette, RefreshCw } from 'lucide-react';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import CreativeRow from "@/components/page/ad/projects/[projectId]/components/CreativeRow";
import AdLightboxModal from "@/components/page/ad/projects/[projectId]/components/AdLightboxModal";
import { adProjectClientAPI, getProjectProgress } from "@/lib/api/client/ad/adProjectClientAPI";
import { AdGenerationBatch, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";
import { supabase } from "@/lib/supabase/supabaseClient";

type DetailStatus = 'loading' | 'ready' | 'error';

export default function ProjectDetailPageClient({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [project, setProject] = useState<AdGenerationBatch | null>(null);
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
    const [brandLogoSignedUrl, setBrandLogoSignedUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<DetailStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [lightboxKey, setLightboxKey] = useState<string | null>(null);

    const fetchProject = useCallback(async (showPolling = false) => {
        if (showPolling) setIsPolling(true);
        try {
            const data = await adProjectClientAPI.getProject(projectId);
            setProject(data.project);
            setSignedUrls(data.signedUrls);
            setBrandLogoSignedUrl((data as unknown as { brandLogoSignedUrl?: string | null }).brandLogoSignedUrl ?? null);
            setStatus('ready');
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load project');
            setStatus('error');
        } finally {
            setIsPolling(false);
        }
    }, [projectId]);

    useEffect(() => {
        setStatus('loading');
        fetchProject(false);
    }, [fetchProject]);

    const isRunning = useMemo(() => {
        if (!project) return false;
        return project.status !== 'completed' && project.status !== 'failed';
    }, [project]);

    // Realtime 구독 — 해당 batch의 변경 시 즉시 갱신 (폴링 제거, 끊기면 Refresh 버튼으로 수동 갱신)
    // StrictMode 이중 마운트 충돌 방지: 채널명 랜덤 suffix, 세션 확보 후 구독(RLS)
    useEffect(() => {
        if (status !== 'ready') return;

        let channel: ReturnType<typeof supabase.channel> | null = null;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel = supabase
                .channel(`ad-batch-${projectId}-${Math.random().toString(36).slice(2, 6)}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'ad_generation_batches', filter: `id=eq.${projectId}` },
                    () => {
                        // payload.new에는 메타만 있고 signedUrls는 서버에서 재계산해야 하므로 전체 fetch
                        fetchProject(true);
                    },
                )
                .subscribe();
        })();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [projectId, status, fetchProject]);

    // Realtime 끊김 대비 폴링 안전망 — running일 때만 4초 간격
    useEffect(() => {
        if (!isRunning || status !== 'ready') return;
        const intervalId = window.setInterval(() => {
            fetchProject(true);
        }, 4000);
        return () => window.clearInterval(intervalId);
    }, [isRunning, status, fetchProject]);

    const progress = useMemo(() => {
        if (!project) return null;
        return getProjectProgress(project);
    }, [project]);

    const sortedCreatives = useMemo(() => {
        if (!project) return [];
        const count = project.concept_count;
        const specs = project.ad_creative_specs ?? [];
        const results = project.ad_creative_results ?? [];

        const mapSpec = new Map(specs.map((s) => [s.creativeIndex, s]));
        const mapResult = new Map(results.map((r) => [r.creativeIndex, r]));

        // concept_count 범위 내에서 creative 0..count-1 모두 생성 (spec 없는 것도 pending으로 표시)
        const indices = Array.from({ length: count }, (_, i) => i);

        // 완료된 건 best score 내림차순, 그 외는 인덱스순 — but running 중엔 인덱스순 유지가 덜 혼란
        const withScores = indices.map((idx) => {
            const r = mapResult.get(idx);
            let best: number | null = null;
            if (r) {
                for (const rk of project.aspect_ratios) {
                    const ir = (r.imageResults as Record<string, { score?: number | null }>)[rk as string];
                    if (ir?.score != null && (best == null || ir.score > best)) best = ir.score;
                }
            }
            return { idx, best };
        });

        const shouldSortByScore = !isRunning && withScores.some((x) => x.best != null);
        const ordered = shouldSortByScore
            ? [...withScores].sort((a, b) => (b.best ?? -1) - (a.best ?? -1) || a.idx - b.idx).map((x) => x.idx)
            : indices;

        return ordered.map((idx) => ({
            creativeIndex: idx,
            spec: mapSpec.get(idx) ?? null,
            result: mapResult.get(idx) ?? null,
        }));
    }, [project, isRunning]);

    const onSelectTile = useCallback((key: string) => {
        setSelectedKey(key);
    }, []);

    const onExpandTile = useCallback((key: string) => {
        setLightboxKey(key);
        setSelectedKey(key);
    }, []);

    const onCloseLightbox = useCallback(() => {
        setLightboxKey(null);
    }, []);

    const totalAssets = project ? project.concept_count * project.aspect_ratios.length : 0;

    const onClickBack = useCallback(() => {
        router.push('/ad/projects');
    }, [router]);

    if (status === 'loading') {
        return (
            <>
                <AppHeader />
                <main className="mx-auto max-w-[90rem] px-8 pb-24 pt-32">
                    <div className="animate-pulse space-y-6">
                        <div className="h-6 w-32 rounded bg-canvas" />
                        <div className="h-10 w-64 rounded bg-canvas" />
                        <div className="grid gap-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-48 rounded-[1.5rem] border border-hairline bg-surface" />
                            ))}
                        </div>
                    </div>
                </main>
            </>
        );
    }

    if (status === 'error' || !project || !progress) {
        return (
            <>
                <AppHeader />
                <main className="mx-auto max-w-[90rem] px-8 pb-24 pt-32">
                    <button type="button" onClick={onClickBack} className="inline-flex items-center gap-2 text-[13px] text-text2 hover:text-text1">
                        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                        Back to Projects
                    </button>
                    <div className="mt-8 rounded-[1.5rem] border border-hairline bg-surface px-8 py-16 text-center">
                        <p className="text-[13px] text-[#F87171]">{error ?? 'Project not found.'}</p>
                        <Link href="/ad/projects" className="mt-4 inline-flex rounded-full bg-text1 px-6 py-2.5 text-[13px] font-semibold text-canvas">
                            Go to Projects
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    const hasFailure = progress.failed > 0;
    const isCompleted = project.status === 'completed';

    return (
        <>
            <AppHeader />

            <main className="mx-auto max-w-[90rem] px-8 pb-24 pt-32">
                <button type="button" onClick={onClickBack} className="inline-flex items-center gap-2 text-[13px] text-text2 hover:text-text1">
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                    Back to Projects
                </button>

                {/* Project 헤더 — 상황실 바 */}
                <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-hairline bg-surface">
                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-text1">
                                    Project {project.id.slice(0, 6)}
                                </h1>
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                                    isCompleted && !hasFailure
                                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400'
                                        : isRunning
                                            ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400'
                                            : hasFailure
                                                ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300'
                                                : 'bg-surface text-text2 border-hairline'
                                }`}>
                                    {isRunning ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} /> : isCompleted && !hasFailure ? <CheckCircle2 className="h-3 w-3" strokeWidth={2} /> : <AlertTriangle className="h-3 w-3" strokeWidth={2} />}
                                    {project.status}
                                    {hasFailure && isCompleted ? ' · partial' : ''}
                                    {isPolling ? ' · updating…' : ''}
                                </span>
                                <span className="font-mono text-[11px] text-text2">#{project.id.slice(0, 8)}</span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 text-[12px] text-text2">
                                    <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                                    {new Date(project.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 text-[12px] text-text2">
                                    <Layers className="h-3.5 w-3.5" strokeWidth={1.8} />
                                    {project.concept_count} creatives · {project.aspect_ratios.length} formats = {totalAssets} assets
                                </span>
                                {project.brand_palette && project.brand_palette.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 text-[12px] text-text2">
                                        <Palette className="h-3.5 w-3.5" strokeWidth={1.8} />
                                        <span className="flex items-center gap-1">
                                            {project.brand_palette.map((hex) => (
                                                <span key={hex} className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                                            ))}
                                        </span>
                                    </span>
                                )}
                                <span className="rounded-full border border-hairline bg-canvas px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text2">
                                    {project.cta_enabled ? 'CTA on' : 'no CTA'}
                                </span>
                            </div>

                            <p className="mt-3 text-[13px] leading-relaxed text-text2">
                                {isRunning
                                    ? `Live — ${progress.completed}/${progress.total} ready · ${progress.failed ? `${progress.failed} failed · ` : ''}${progress.pending} pending. New creatives appear as their prompts complete.`
                                    : hasFailure
                                        ? `Completed with partial failures — ${progress.completed}/${progress.total} ready · ${progress.failed} failed. Failed tiles can be retried next phase.`
                                        : `Completed — ${progress.completed}/${progress.total} assets ready. Downloads are unlimited.`}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fetchProject(true)}
                                disabled={isPolling}
                                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-2 text-[13px] font-medium text-text1 hover:bg-surface disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${isPolling ? 'animate-spin' : ''}`} strokeWidth={1.8} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* 진행 바 */}
                    <div className="h-1.5 w-full bg-canvas">
                        <div
                            className={`h-full transition-all duration-700 ${hasFailure ? 'bg-amber-500' : isRunning ? 'bg-sky-500' : 'bg-emerald-500'}`}
                            style={{ width: `${progress.total > 0 ? Math.round(((progress.completed + progress.failed) / progress.total) * 100) : 0}%` }}
                        />
                    </div>

                    {/* 비율 pill */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-canvas/40 px-6 py-3">
                        {project.aspect_ratios.map((rk) => (
                            <span key={rk} className="rounded-full border border-hairline bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text2">
                                {(rk as string).replace('_', ':')}
                            </span>
                        ))}
                        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-text2">
                            {progress.completed} ready · {progress.failed} failed · {progress.pending} pending
                        </span>
                    </div>
                </div>

                {/* Creative 리스트 */}
                <div className="mt-8 space-y-5">
                    {sortedCreatives.map(({ creativeIndex, spec, result }) => (
                        <CreativeRow
                            key={creativeIndex}
                            creativeIndex={creativeIndex}
                            spec={spec}
                            result={result}
                            batch={project}
                            signedUrls={signedUrls}
                            brandLogoUrl={brandLogoSignedUrl}
                            isProjectRunning={isRunning}
                            selectedKey={selectedKey}
                            onSelectTile={onSelectTile}
                            onExpandTile={onExpandTile}
                        />
                    ))}
                </div>

                {/* 선택된 타일 디테일 — 간단 다운로드 바 */}
                {selectedKey && (() => {
                    const sep = selectedKey.indexOf('_');
                    const cIdxStr = sep === -1 ? selectedKey : selectedKey.slice(0, sep);
                    const ratioKey = sep === -1 ? '' : selectedKey.slice(sep + 1);
                    const cIdx = parseInt(cIdxStr, 10);
                    const url = signedUrls[selectedKey];
                    if (!url) return null;
                    const ratioLabel = (ratioKey as string).replace('_', ':');
                    return (
                        <div className="mt-6 flex items-center justify-between gap-4 rounded-[1.25rem] border border-hairline bg-surface px-5 py-4">
                            <div>
                                <p className="text-[13px] font-medium text-text1">Creative {String(cIdx + 1).padStart(2, '0')} · {ratioLabel} selected</p>
                                <p className="mt-0.5 font-mono text-[11px] text-text2">Signed URL expires in 24h · downloads unlimited</p>
                            </div>
                            <a
                                href={url}
                                download={`shortreal-project-${project.id.slice(0, 6)}-c${cIdx + 1}-${ratioLabel}.png`}
                                className="inline-flex items-center gap-2 rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas hover:scale-[1.02] active:scale-[0.98] transition-transform"
                            >
                                <Download className="h-4 w-4" strokeWidth={1.8} />
                                Download {ratioLabel}
                            </a>
                        </div>
                    );
                })()}

                {/* 라이트박스 — WorkspaceEditor와 동일 패턴 */}
                {lightboxKey && (() => {
                    const url = signedUrls[lightboxKey];
                    if (!url) return null;
                    const sep2 = lightboxKey.indexOf('_');
                    const cIdxStr = sep2 === -1 ? lightboxKey : lightboxKey.slice(0, sep2);
                    const ratioKey = sep2 === -1 ? '' : lightboxKey.slice(sep2 + 1);
                    const cIdx = parseInt(cIdxStr, 10);
                    const ratioLabel = (ratioKey as string).replace('_', ':');
                    const creative = sortedCreatives.find((c) => c.creativeIndex === cIdx);
                    const ir = creative?.result?.imageResults?.[ratioKey as AdRatioKey] as { design?: import("@/lib/api/types/supabase/ad/AdGenerationBatch").AdImageResult['design']; score?: number | null } | undefined;
                    const copyForLightbox = creative?.result?.copy as unknown as { fontFamily?: string | null; fontWeight?: number | null; headlineColor?: 'white' | 'black' | null } | undefined;
                    const designHeadlineColor = (ir as unknown as { design?: { headline?: { color?: string | null } } })?.design?.headline?.color as 'white' | 'black' | null | undefined;
                    return (
                        <AdLightboxModal
                            imageUrl={url}
                            ratioLabel={ratioLabel}
                            creativeIndex={cIdx}
                            design={(ir?.design as AdDesignLayout) ?? null}
                            score={ir?.score ?? null}
                            headline={creative?.result?.copy?.headline ?? null}
                            headlineFontFamily={copyForLightbox?.fontFamily ?? null}
                            headlineFontWeight={copyForLightbox?.fontWeight ?? null}
                            headlineColor={designHeadlineColor ?? copyForLightbox?.headlineColor ?? 'white'}
                            brandLogoUrl={brandLogoSignedUrl}
                            onClose={onCloseLightbox}
                        />
                    );
                })()}
            </main>
        </>
    );
}
