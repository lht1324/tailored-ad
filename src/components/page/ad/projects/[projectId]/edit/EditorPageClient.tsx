'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Download, Loader2 } from 'lucide-react';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import AssetTree, { type AssetTreeCreative } from "@/components/page/ad/projects/[projectId]/edit/AssetTree";
import Inspector, { type EditorCopy } from "@/components/page/ad/projects/[projectId]/edit/Inspector";
import type { AdStillInput } from "@/components/page/ad/projects/[projectId]/edit/AdStillComposition";
import { COMPOSITE_SIZES } from "@/components/page/ad/projects/[projectId]/components/compositeDownload";
import { downloadCompositedImage } from "@/components/page/ad/projects/[projectId]/components/compositeDownload";
import { fontMap } from "@/lib/fonts";
import { adProjectClientAPI } from "@/lib/api/client/ad/adProjectClientAPI";
import { patchFetch } from "@/lib/api/client/baseFetch";
import { AdCreativeResult, AdGenerationBatch, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import type { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";
import { supabase } from "@/lib/supabase/supabaseClient";

const EditorCanvas = dynamic(
    () => import("@/components/page/ad/projects/[projectId]/edit/EditorCanvas"),
    {
        ssr: false,
        loading: () => (
            <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] border border-hairline bg-surface text-[13px] text-text2">
                Loading canvas…
            </div>
        ),
    },
);

type EditorStatus = 'loading' | 'ready' | 'error';

interface ResolvedSelection {
    creativeIndex: number;
    ratioKey: string;
    imageUrl: string;
    design: AdDesignLayout;
    copy: EditorCopy;
}

function isTileCompleted(result: AdCreativeResult | null, ratioKey: string, signedUrls: Record<string, string>, creativeIndex: number): boolean {
    const url = signedUrls[`${creativeIndex}_${ratioKey}`];
    if (!url) return false;
    const ir = result?.imageResults?.[ratioKey as AdRatioKey] as unknown as { design?: unknown; error?: unknown } | undefined;
    return Boolean(url && ir && !ir.error && ir.design);
}

function toEditorCopy(copy: AdCreativeResult['copy']): EditorCopy {
    const raw = copy as unknown as { headline?: string | null; cta?: string | null; fontFamily?: string | null; fontWeight?: number | null; headlineColor?: string | null };
    return {
        headline: raw.headline ?? null,
        cta: raw.cta ?? null,
        fontFamily: raw.fontFamily ?? null,
        fontWeight: typeof raw.fontWeight === 'number' ? raw.fontWeight : null,
        headlineColor: typeof raw.headlineColor === 'string' ? raw.headlineColor : 'white',
    };
}

export default function EditorPageClient() {
    const router = useRouter();
    const params = useParams<{ projectId: string }>();
    const projectId = params.projectId;
    const searchParams = useSearchParams();
    const paramCreative = searchParams.get('creative');
    const paramRatio = searchParams.get('ratio');

    const [project, setProject] = useState<AdGenerationBatch | null>(null);
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
    const [brandLogoSignedUrl, setBrandLogoSignedUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<EditorStatus>('loading');
    const [error, setError] = useState<string | null>(null);

    const [design, setDesign] = useState<AdDesignLayout | null>(null);
    const [copy, setCopy] = useState<EditorCopy | null>(null);
    const [baseline, setBaseline] = useState<string | null>(null);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloadingCanvas, setIsDownloadingCanvas] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    const fetchProject = useCallback(async () => {
        try {
            const data = await adProjectClientAPI.getProject(projectId);
            setProject(data.project);
            setSignedUrls(data.signedUrls);
            setBrandLogoSignedUrl(data.brandLogoSignedUrl ?? null);
            setStatus('ready');
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load project');
            setStatus('error');
        }
    }, [projectId]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            if (cancelled) return;
            await fetchProject();
        })();
        return () => {
            cancelled = true;
        };
    }, [fetchProject]);

    // Realtime — 파이프라인 잔여 업데이트 반영 (편집 중 덮어쓰기 주의: running 배치는 저장 잠금)
    useEffect(() => {
        if (status !== 'ready') return;
        let cancelled = false;
        let channel: ReturnType<typeof supabase.channel> | null = null;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (cancelled || !user) return;
            channel = supabase
                .channel(`ad-edit-${projectId}-${Math.random().toString(36).slice(2, 6)}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'ad_generation_batches', filter: `id=eq.${projectId}` },
                    () => {
                        fetchProject();
                    },
                )
                .subscribe();
        })();
        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [projectId, status, fetchProject]);

    const treeItems = useMemo<AssetTreeCreative[]>(() => {
        if (!project) return [];
        const results = project.ad_creative_results ?? [];
        const mapResult = new Map(results.map((r) => [r.creativeIndex, r]));
        return Array.from({ length: project.concept_count }, (_, idx) => {
            const result = mapResult.get(idx) ?? null;
            let best: number | null = null;
            const ratios = project.aspect_ratios.map((rk) => {
                const ir = result?.imageResults?.[rk] as unknown as { score?: number | null; error?: unknown; design?: unknown } | undefined;
                if (ir?.score != null && (best == null || ir.score > best)) best = ir.score;
                return {
                    ratioKey: rk as string,
                    label: (rk as string).replace('_', ':'),
                    thumbUrl: signedUrls[`${idx}_${rk}`] ?? null,
                    completed: isTileCompleted(result, rk as string, signedUrls, idx),
                    score: ir?.score ?? null,
                };
            });
            return {
                creativeIndex: idx,
                headline: result?.copy?.headline ?? null,
                best,
                ratios,
            };
        });
    }, [project, signedUrls]);

    // 선택 해석 — URL 파라미터 우선, 무효면 첫 완성 타일
    const resolved = useMemo<ResolvedSelection | null>(() => {
        if (!project) return null;
        const findResult = (ci: number) => (project.ad_creative_results ?? []).find((r) => r.creativeIndex === ci) ?? null;
        const pick = (ci: number, rk: string): ResolvedSelection | null => {
            const result = findResult(ci);
            const url = signedUrls[`${ci}_${rk}`];
            if (!result || !url || !isTileCompleted(result, rk, signedUrls, ci)) return null;
            const ir = result.imageResults?.[rk as AdRatioKey] as unknown as { design?: AdDesignLayout | null } | undefined;
            const designValue = (ir?.design as AdDesignLayout) ?? null;
            if (!designValue) return null;
            return { creativeIndex: ci, ratioKey: rk, imageUrl: url, design: designValue, copy: toEditorCopy(result.copy) };
        };
        const ci = paramCreative != null ? Number.parseInt(paramCreative, 10) : Number.NaN;
        if (!Number.isNaN(ci) && paramRatio && (project.aspect_ratios as string[]).includes(paramRatio)) {
            const direct = pick(ci, paramRatio);
            if (direct) return direct;
        }
        for (let idx = 0; idx < project.concept_count; idx++) {
            for (const rk of project.aspect_ratios) {
                const fallback = pick(idx, rk as string);
                if (fallback) return fallback;
            }
        }
        return null;
    }, [project, signedUrls, paramCreative, paramRatio]);

    // 선택이 바뀌면 편집 버퍼 리셋 (render 중 조정 — effect 아님, lint 안전)
    const resolvedKey = resolved ? `${resolved.creativeIndex}_${resolved.ratioKey}` : null;
    if (resolvedKey !== activeKey) {
        setActiveKey(resolvedKey);
        setDesign(resolved?.design ?? null);
        setCopy(resolved?.copy ?? null);
        setBaseline(resolved ? JSON.stringify({ design: resolved.design, copy: resolved.copy }) : null);
        setSaveError(null);
        setSavedAt(null);
    }

    const isDirty = baseline != null && design != null && copy != null
        && JSON.stringify({ design, copy }) !== baseline;
    const isEditable = project != null && (project.status === 'completed' || project.status === 'failed');

    const onSelectAsset = useCallback((ci: number, rk: string) => {
        if (resolved && ci === resolved.creativeIndex && rk === resolved.ratioKey) return;
        if (isDirty && !window.confirm('Unsaved changes will be lost. Switch asset?')) return;
        router.replace(`/projects/${projectId}/edit?creative=${ci}&ratio=${encodeURIComponent(rk)}`, { scroll: false });
    }, [resolved, isDirty, router, projectId]);

    const onClickBack = useCallback(() => {
        if (isDirty && !window.confirm('Unsaved changes will be lost. Leave editor?')) return;
        router.push(`/projects/${projectId}`);
    }, [isDirty, router, projectId]);

    const onClickSave = useCallback(async () => {
        if (!resolved || !design || !copy || !isDirty || isSaving || !isEditable) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            const response = await patchFetch(
                `/api/creative/${resolved.creativeIndex}/design?batchId=${encodeURIComponent(projectId)}`,
                { ratioKey: resolved.ratioKey, design, copy },
            );
            const json = (await response.json()) as { success: boolean; error?: string; data?: { design?: AdDesignLayout; copy?: EditorCopy } };
            if (!json.success) throw new Error(json.error ?? 'Save failed');
            const savedDesign = (json.data?.design as AdDesignLayout) ?? design;
            const savedCopy = (json.data?.copy as EditorCopy) ?? copy;
            setDesign(savedDesign);
            setCopy(savedCopy);
            setBaseline(JSON.stringify({ design: savedDesign, copy: savedCopy }));
            setSavedAt(new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            // 로컬 project에도 반영 (트리 헤드라인·점수 표시용)
            setProject((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    ad_creative_results: (prev.ad_creative_results ?? []).map((r) => {
                        if (r.creativeIndex !== resolved.creativeIndex) return r;
                        const next = { ...(r.imageResults ?? {}) } as Record<string, AdCreativeResult['imageResults'][AdRatioKey]>;
                        const prevIr = next[resolved.ratioKey as AdRatioKey];
                        if (prevIr) next[resolved.ratioKey as AdRatioKey] = { ...prevIr, design: savedDesign };
                        return { ...r, imageResults: next, copy: { ...r.copy, headline: savedCopy.headline, cta: savedCopy.cta, fontFamily: savedCopy.fontFamily ?? r.copy.fontFamily, fontWeight: savedCopy.fontWeight ?? r.copy.fontWeight, headlineColor: savedCopy.headlineColor ?? r.copy.headlineColor } };
                    }),
                };
            });
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setIsSaving(false);
        }
    }, [resolved, design, copy, isDirty, isSaving, isEditable, projectId]);

    // 캔버스 드래그 → % 좌표로 저장 (슬라이더와 같은 값)
    const onDragHeadline = useCallback((x: number, y: number) => {
        setDesign((prev) => {
            if (!prev?.headline) return prev;
            return { ...prev, headline: { ...prev.headline, x, y } };
        });
    }, []);

    const onDragCta = useCallback((x: number, y: number) => {
        setDesign((prev) => {
            if (!prev?.cta) return prev;
            return { ...prev, cta: { ...prev.cta, x, y } };
        });
    }, []);

    const canvasAspect = useMemo(() => {
        const s = COMPOSITE_SIZES[resolved?.ratioKey ?? ''] ?? { w: 1080, h: 1350 };
        return s.w / s.h;
    }, [resolved]);

    const canvasInput = useMemo<AdStillInput | null>(() => {
        if (!resolved || !design || !copy) return null;
        const rawName = copy.fontFamily as string | undefined;
        const hit = rawName ? (fontMap as Record<string, { style: { fontFamily: string } }>)[rawName] : undefined;
        const designColor = (design.headline as unknown as { color?: string } | null)?.color;
        return {
            imageUrl: resolved.imageUrl,
            design,
            headlineFontFamily: hit ? hit.style.fontFamily : null,
            headlineFontWeight: typeof copy.fontWeight === 'number' ? copy.fontWeight : null,
            headlineColor: designColor ?? copy.headlineColor ?? null,
            brandLogoUrl: brandLogoSignedUrl,
        };
    }, [resolved, design, copy, brandLogoSignedUrl]);

    // 캔버스 다운로드 — Player에 들어가는 inputs와 동일한 객체로 스냅샷 (미저장 포함 현재 화면)
    const onClickDownloadCanvas = useCallback(async () => {
        if (!resolved || !design || !canvasInput || isDownloadingCanvas) return;
        setIsDownloadingCanvas(true);
        try {
            await downloadCompositedImage({
                ...canvasInput,
                ratioKey: resolved.ratioKey,
                creativeIndex: resolved.creativeIndex,
            });
        } catch (err) {
            console.error('canvas download failed', err);
        } finally {
            setIsDownloadingCanvas(false);
        }
    }, [resolved, design, canvasInput, isDownloadingCanvas]);

    if (status === 'loading') {
        return (
            <>
                <AppHeader />
                <main className="mx-auto max-w-[90rem] px-8 pb-24 pt-32">
                    <div className="animate-pulse space-y-6">
                        <div className="h-6 w-32 rounded bg-canvas" />
                        <div className="h-10 w-64 rounded bg-canvas" />
                        <div className="h-96 rounded-[1.5rem] border border-hairline bg-surface" />
                    </div>
                </main>
            </>
        );
    }

    if (status === 'error' || !project) {
        return (
            <>
                <AppHeader />
                <main className="mx-auto max-w-[90rem] px-8 pb-24 pt-32">
                    <button type="button" onClick={onClickBack} className="inline-flex items-center gap-2 text-[13px] text-text2 hover:text-text1">
                        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                        Back to Project
                    </button>
                    <div className="mt-8 rounded-[1.5rem] border border-hairline bg-surface px-8 py-16 text-center">
                        <p className="text-[13px] text-[#F87171]">{error ?? 'Project not found.'}</p>
                        <Link href="/projects" className="mt-4 inline-flex rounded-full bg-text1 px-6 py-2.5 text-[13px] font-semibold text-canvas">
                            Go to Projects
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <AppHeader />
            <main className="mx-auto max-w-[112rem] px-4 pb-24 pt-28 sm:px-8 lg:flex lg:h-[100dvh] lg:flex-col lg:overflow-hidden lg:pb-6 lg:pt-24">
                {/* Top bar */}
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <button type="button" onClick={onClickBack} className="inline-flex items-center gap-2 text-[13px] text-text2 hover:text-text1">
                        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                        Back to Project
                    </button>
                    <h1 className="text-xl font-bold tracking-tight text-text1">
                        Edit · Project {project.id.slice(0, 6)}
                    </h1>
                    <div className="ml-auto flex items-center gap-3">
                        {saveError && <span className="text-[12px] text-[#F87171]">{saveError}</span>}
                        {savedAt && !saveError && (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                                Saved {savedAt}
                            </span>
                        )}
                        {isDirty && !saveError && (
                            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-amber-600 dark:text-amber-300">
                                Unsaved changes
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onClickSave}
                            disabled={!isDirty || isSaving || !isEditable}
                            title={!isEditable ? 'Available after batch completion' : 'Save design'}
                            className="inline-flex items-center gap-2 rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Check className="h-4 w-4" strokeWidth={2.2} />}
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                            type="button"
                            onClick={onClickDownloadCanvas}
                            disabled={isDownloadingCanvas || !resolved || !design}
                            title="Download current canvas"
                            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-5 py-2.5 text-[13px] font-semibold text-text1 hover:bg-surface disabled:opacity-50"
                        >
                            {isDownloadingCanvas ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
                            Download
                        </button>
                    </div>
                </div>

                {resolved && design && copy ? (
                    <div className="mt-6 grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)_18rem] lg:overflow-hidden">
                        {/* Tree */}
                        <div className="order-2 min-w-0 lg:order-1 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                            <AssetTree
                                items={treeItems}
                                activeCreative={resolved.creativeIndex}
                                activeRatio={resolved.ratioKey}
                                onSelect={onSelectAsset}
                            />
                        </div>
                        {/* Canvas */}
                        <div className="order-1 min-w-0 lg:order-2 lg:h-full lg:min-h-0 lg:overflow-y-auto">
                            <div className="flex w-full justify-center">
                                <EditorCanvas ratioKey={resolved.ratioKey} input={canvasInput ?? {
                                    imageUrl: resolved.imageUrl,
                                    design,
                                    headlineFontFamily: null,
                                    headlineFontWeight: null,
                                    headlineColor: 'white',
                                    brandLogoUrl: null,
                                }}
                                onDragHeadline={isEditable ? onDragHeadline : undefined}
                                onDragCta={isEditable ? onDragCta : undefined}
                                />
                            </div>
                            <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text2">
                                Creative {String(resolved.creativeIndex + 1).padStart(2, '0')} · {resolved.ratioKey.replace('_', ':')}
                            </p>
                        </div>
                        {/* Inspector */}
                        <div className="order-3 min-w-0 overflow-x-clip rounded-[1.5rem] border border-hairline bg-surface p-5 lg:h-full lg:min-h-0 lg:overflow-y-auto">
                            <Inspector
                                design={design}
                                copy={copy}
                                score={(resolved ? (project.ad_creative_results?.find((r) => r.creativeIndex === resolved.creativeIndex)?.imageResults?.[resolved.ratioKey as AdRatioKey] as unknown as { score?: number | null } | undefined)?.score : null) ?? null}
                                disabled={!isEditable}
                                aspectRatio={canvasAspect}
                                brandPalette={project.brand_palette ?? null}
                                onChangeDesign={setDesign}
                                onChangeCopy={setCopy}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-8 rounded-[1.5rem] border border-dashed border-hairline bg-surface px-8 py-16 text-center">
                        <p className="text-[13px] text-text2">No completed images to edit yet.</p>
                        <button
                            type="button"
                            onClick={() => router.push(`/projects/${projectId}`)}
                            className="mt-4 inline-flex rounded-full bg-text1 px-6 py-2.5 text-[13px] font-semibold text-canvas"
                        >
                            Back to Project
                        </button>
                    </div>
                )}
            </main>
        </>
    );
}
