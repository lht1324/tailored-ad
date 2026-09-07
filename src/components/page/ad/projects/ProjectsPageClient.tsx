'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Plus, RefreshCw } from 'lucide-react';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import ProjectCard from "@/components/page/ad/projects/components/ProjectCard";
import { adProjectClientAPI } from "@/lib/api/client/ad/adProjectClientAPI";
import { AdGenerationBatch, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { supabase } from "@/lib/supabase/supabaseClient";

type FilterKey = 'all' | 'running' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'running', label: 'Running' },
    { key: 'completed', label: 'Completed' },
];

function isRunningStatus(status: string): boolean {
    return status !== 'completed' && status !== 'failed';
}

export default function ProjectsPageClient() {
    const router = useRouter();
    const [projects, setProjects] = useState<AdGenerationBatch[]>([]);
    const [thumbnailSignedUrls, setThumbnailSignedUrls] = useState<Record<string, string>>({});
    const [thumbnailRatioKeys, setThumbnailRatioKeys] = useState<Record<string, AdRatioKey>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [hasMore, setHasMore] = useState(false);

    const fetchProjects = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);
        try {
            const data = await adProjectClientAPI.listProjects({ limit: 20, offset: 0 });
            setProjects(data.projects);
            setThumbnailSignedUrls((data as unknown as { thumbnailSignedUrls?: Record<string, string> }).thumbnailSignedUrls ?? {});
            setThumbnailRatioKeys((data as unknown as { thumbnailRatioKeys?: Record<string, AdRatioKey> }).thumbnailRatioKeys ?? {});
            setHasMore(data.pagination.count === 20);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load projects');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Realtime 구독 — running 여부에 관계없이 변경 시 리스트를 패치 (폴링 제거, 끊기면 Refresh 버튼으로 수동 갱신)
    // StrictMode 이중 마운트로 인한 "cannot add postgres_changes after subscribe" 방지: 채널명에 랜덤 suffix
    // 썸네일은 최고점 1장의 signedUrl이라 UPDATE 시 재조회로 갱신 필요
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel = supabase
                .channel(`ad-batches-list-${user.id}-${Math.random().toString(36).slice(2, 6)}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'ad_generation_batches', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT') {
                            setProjects((prev) => [payload.new as AdGenerationBatch, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            // 최고점 썸네일이 바뀔 수 있어 전체 재조회로 signedUrl 갱신
                            fetchProjects(true);
                        } else if (payload.eventType === 'DELETE') {
                            setProjects((prev) => prev.filter((p) => p.id !== (payload.old as AdGenerationBatch).id));
                            setThumbnailSignedUrls((prev) => {
                                const next = { ...prev };
                                delete next[(payload.old as AdGenerationBatch).id];
                                return next;
                            });
                            setThumbnailRatioKeys((prev) => {
                                const next = { ...prev };
                                delete next[(payload.old as AdGenerationBatch).id];
                                return next;
                            });
                        }
                    },
                )
                .subscribe();
        })();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchProjects]);

    const onClickRefresh = useCallback(() => {
        fetchProjects(true);
    }, [fetchProjects]);

    const onClickProject = useCallback((projectId: string) => {
        router.push(`/ad/projects/${projectId}`);
    }, [router]);

    const filtered = useMemo(() => {
        if (filter === 'all') return projects;
        if (filter === 'running') return projects.filter((p) => isRunningStatus(p.status));
        return projects.filter((p) => !isRunningStatus(p.status));
    }, [projects, filter]);

    const onClickLoadMore = useCallback(async () => {
        try {
            const data = await adProjectClientAPI.listProjects({ limit: 20, offset: projects.length });
            setProjects((prev) => [...prev, ...data.projects]);
            const moreThumbs = (data as unknown as { thumbnailSignedUrls?: Record<string, string> }).thumbnailSignedUrls ?? {};
            const moreRatios = (data as unknown as { thumbnailRatioKeys?: Record<string, AdRatioKey> }).thumbnailRatioKeys ?? {};
            setThumbnailSignedUrls((prev) => ({ ...prev, ...moreThumbs }));
            setThumbnailRatioKeys((prev) => ({ ...prev, ...moreRatios }));
            setHasMore(data.pagination.count === 20);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more');
        }
    }, [projects.length]);

    return (
        <>
            <AppHeader />

            <main className="mx-auto max-w-[90rem] px-8 pb-24 pt-32">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Projects</span>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text1 md:text-4xl">
                            Your generations
                        </h1>
                        <p className="mt-2 max-w-[48ch] text-[13px] leading-relaxed text-text2">
                            Every generation you ran — live progress and completed assets in one place. Re-download anytime.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClickRefresh}
                            disabled={isRefreshing || isLoading}
                            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-text1 transition-colors hover:bg-canvas disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.8} />
                            Refresh
                        </button>
                        <a
                            href="/ad/create"
                            className="inline-flex items-center gap-2 rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus className="h-4 w-4" strokeWidth={2} />
                            New generation
                        </a>
                    </div>
                </div>

                {/* 필터 */}
                <div className="mt-8 flex items-center gap-2 border-b border-hairline pb-4">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                                filter === f.key
                                    ? 'bg-text1 text-canvas'
                                    : 'bg-surface text-text2 hover:bg-canvas hover:text-text1 border border-hairline'
                            }`}
                        >
                            {f.label}
                            <span className={`ml-1.5 font-mono text-[11px] ${filter === f.key ? 'text-canvas/70' : 'text-text2'}`}>
                                {f.key === 'all' ? projects.length : f.key === 'running' ? projects.filter((p) => isRunningStatus(p.status)).length : projects.filter((p) => !isRunningStatus(p.status)).length}
                            </span>
                        </button>
                    ))}
                    <span className="ml-auto hidden font-mono text-[11px] uppercase tracking-[0.08em] text-text2 sm:inline">
                        {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                        {isRefreshing ? ' · updating…' : ''}
                    </span>
                </div>

                {/* 상태 */}
                {isLoading && (
                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse rounded-[1.5rem] border border-hairline bg-surface">
                                <div className="aspect-[4/3] bg-canvas" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 w-3/5 rounded bg-canvas" />
                                    <div className="h-3 w-2/5 rounded bg-canvas" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && error && (
                    <div className="mt-8 rounded-[1.5rem] border border-hairline bg-surface px-6 py-10 text-center">
                        <p className="text-[13px] text-[#F87171]">{error}</p>
                        <button
                            type="button"
                            onClick={onClickRefresh}
                            className="mt-4 rounded-full border border-hairline px-5 py-2 text-[13px] font-medium text-text1 hover:bg-canvas"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {!isLoading && !error && filtered.length === 0 && (
                    <div className="mt-8 flex flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-hairline bg-surface px-8 py-16 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-canvas text-text2">
                            <FolderOpen className="h-5 w-5" strokeWidth={1.8} />
                        </span>
                        <div>
                            <h3 className="text-[15px] font-semibold text-text1">
                                {filter === 'all' ? 'No projects yet' : filter === 'running' ? 'No running projects' : 'No completed projects'}
                            </h3>
                            <p className="mt-1 text-[13px] leading-relaxed text-text2">
                                {filter === 'all'
                                    ? 'Create your first generation — it will appear here and stay available for re-download.'
                                    : 'Try another filter or create a new generation.'}
                            </p>
                        </div>
                        {filter === 'all' && (
                            <a
                                href="/ad/create"
                                className="mt-2 inline-flex items-center gap-2 rounded-full bg-text1 px-6 py-2.5 text-[13px] font-semibold text-canvas hover:scale-[1.02] active:scale-[0.98] transition-transform"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2} />
                                Create your first project
                            </a>
                        )}
                    </div>
                )}

                {!isLoading && !error && filtered.length > 0 && (
                    <>
                        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    thumbnailUrl={thumbnailSignedUrls[project.id] ?? null}
                                    thumbnailRatio={thumbnailRatioKeys[project.id] ?? null}
                                    onClick={() => onClickProject(project.id)}
                                />
                            ))}
                        </div>

                        {hasMore && filter === 'all' && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    type="button"
                                    onClick={onClickLoadMore}
                                    className="rounded-full border border-hairline bg-surface px-6 py-2.5 text-[13px] font-medium text-text1 hover:bg-canvas"
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
