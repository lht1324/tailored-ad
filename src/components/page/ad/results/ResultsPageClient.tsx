'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import CandidateCard from "@/components/page/ad/results/components/CandidateCard";
import DetailPanel from "@/components/page/ad/results/components/DetailPanel";
import PreviewModal from "@/components/page/ad/results/components/PreviewModal";
import {
    AdAspectRatio,
    AdCandidate,
    AdDesignLayout,
    AdTask,
    AdTaskStatus,
} from "@/lib/api/client/ad/adClientAPI";

/*
 * 로컬 mock — 실 서버 구현 전까지 UI 플로우 검증용.
 * CreatePageClient가 window 전역 객체에 만든 태스크를 읽어,
 * 경과 시간 기반으로 상태를 계산하고, 완료 시점에 시드 기반 가라 후보를 생성한다.
 * 실 구현 시 adClientAPI.getTask 호출로 교체할 것.
 */
declare global {
    interface Window {
        __adMockTasks?: Record<string, AdTask>;
    }
}

const MOCK_IMAGE_POOL = [
    '/preview/demo_main_center.webp',
    '/preview/demo_main_left.webp',
    '/preview/demo_main_right.webp',
    '/preview/demo_camera.webp',
    '/preview/demo_atmosphere.webp',
    '/preview/demo_physics.webp',
    '/preview/demo_framing.webp',
    '/preview/demo_good_example.webp',
    '/preview/demo_bad_example.webp',
];

// 캐노니컬 매체 순서 — 작은 화면 → 큰 화면 (부분집합 무관 동일 순서)
const CANONICAL_RATIO_ORDER: AdAspectRatio[] = ['9:16', '2:3', '4:5', '1:1', '16:9'];

const MOCK_HEADLINES = [
    'Meet your new favorite.',
    'The one you will actually use.',
    'Comfort, perfected.',
    'Upgrade your everyday.',
    'Made for real mornings.',
    'Small details. Big difference.',
    'The everyday essential.',
    'Worth waking up for.',
];

const MOCK_BRANDS = ['LUMEN', 'NORDIC CO.', 'DRIFT', 'HALO'];

const MOCK_STAGE_TIMINGS: { status: AdTaskStatus; afterMs: number }[] = [
    { status: 'queued', afterMs: 1200 },
    { status: 'generating', afterMs: 3200 },
    { status: 'designing', afterMs: 4600 },
    { status: 'rendering', afterMs: 5800 },
    { status: 'completed', afterMs: Number.MAX_SAFE_INTEGER },
];

function getMockStatusByElapsed(elapsedMs: number): AdTaskStatus {
    for (const stage of MOCK_STAGE_TIMINGS) {
        if (elapsedMs < stage.afterMs) {
            return stage.status;
        }
    }
    return 'completed';
}

function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickByRatio<T>(pool: T[], rand: () => number): T {
    return pool[Math.floor(rand() * pool.length)];
}

function buildConceptDesign(rand: () => number, ctaEnabled: boolean): AdDesignLayout {
    const headlineX = 7 + rand() * 3;
    const headlineY = 58 + rand() * 12;

    return {
        headline: {
            text: pickByRatio(MOCK_HEADLINES, rand),
            x: headlineX,
            y: headlineY,
            maxWidth: 78 + rand() * 8,
            align: 'left' as const,
            fontSizePct: 6.5 + rand() * 2,
        },
        cta: ctaEnabled
            ? {
                  text: pickByRatio(['Shop now', 'Buy now', 'Get yours'], rand),
                  x: headlineX,
                  y: headlineY + 9.5 + rand() * 2,
                  widthPct: 24 + rand() * 6,
                  fontSizePct: 2.3,
              }
            : null,
        logo: {
            brand: pickByRatio(MOCK_BRANDS, rand),
            x: 7,
            y: 5.5,
            widthPct: 18,
            fontSizePct: 3.2,
        },
        scrim: true,
    };
}

function mockGetTask(taskId: string): AdTask | null {
    const tasks = window.__adMockTasks ?? {};
    const task = tasks[taskId];
    if (!task) {
        return null;
    }

    const elapsedMs = Date.now() - new Date(task.createdAt).getTime();
    const status = getMockStatusByElapsed(elapsedMs);

    if (status === 'completed' && task.candidates.length === 0) {
        const rand = mulberry32(hashString(taskId));
        const conceptCount = task.request.conceptCount;
        const ratios = task.request.aspectRatios;

        // 개념 우선 생성 — 개념별로 같은 이미지 + 같은 디자인(시드 고정 흉내), 비율만 파생.
        const candidates: AdCandidate[] = [];
        for (let concept = 0; concept < conceptCount; concept++) {
            const url = pickByRatio(MOCK_IMAGE_POOL, rand);
            const design = buildConceptDesign(rand, task.request.ctaEnabled);

            ratios.forEach((ratio) => {
                const score = conceptCount > 1 ? Math.round((6.2 + rand() * 2.9) * 10) / 10 : null;
                candidates.push({
                    id: `${taskId}-c${concept + 1}-${ratio}-candidate`,
                    url,
                    conceptIndex: concept,
                    ratio,
                    score,
                    design,
                });
            });
        }

        window.__adMockTasks = { ...tasks, [taskId]: { ...task, status: 'completed', candidates } };
        return window.__adMockTasks[taskId];
    }

    if (status !== task.status) {
        window.__adMockTasks = { ...tasks, [taskId]: { ...task, status } };
    }

    return window.__adMockTasks?.[taskId] ?? null;
}

interface ResultsPageClientProps {
    taskId: string | null;
}

interface ConceptGroup {
    conceptIndex: number;
    candidates: AdCandidate[];
}

export default function ResultsPageClient({ taskId }: ResultsPageClientProps) {
    const [task, setTask] = useState<AdTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

    // 태스크 로드 (완료 전이면 폴링)
    useEffect(() => {
        if (!taskId) {
            setError('No generation task found. Start a new generation first.');
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | null = null;

        const loadTask = () => {
            const loaded = mockGetTask(taskId);
            if (cancelled) {
                return;
            }
            if (!loaded) {
                setError('No generation task found. Start a new generation first.');
                setIsLoading(false);
                if (interval) {
                    clearInterval(interval);
                }
                return;
            }
            setTask(loaded);

            if (loaded.status === 'completed') {
                setIsLoading(false);
                if (interval) {
                    clearInterval(interval);
                }
                setSelectedCandidateId((current) => current ?? loaded.candidates[0]?.id ?? null);
            } else if (loaded.status === 'failed') {
                setIsLoading(false);
                setError(loaded.error ?? 'Generation failed. Please try again.');
                if (interval) {
                    clearInterval(interval);
                }
            }
        };

        loadTask();
        if (!taskId.startsWith('mock-task-')) {
            return;
        }

        interval = setInterval(loadTask, 700);
        return () => {
            cancelled = true;
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [taskId]);

    // 개념별 그룹 (그룹 내 비율 순, 그룹은 최고 점수 내림차순)
    const conceptGroups = useMemo<ConceptGroup[]>(() => {
        if (!task) {
            return [];
        }
        const groups = new Map<number, AdCandidate[]>();
        task.candidates.forEach((candidate) => {
            const list = groups.get(candidate.conceptIndex) ?? [];
            list.push(candidate);
            groups.set(candidate.conceptIndex, list);
        });
        return [...groups.entries()]
            .map(([conceptIndex, candidates]) => ({
                conceptIndex,
                candidates: candidates.sort(
                    (a, b) =>
                        CANONICAL_RATIO_ORDER.indexOf(a.ratio) - CANONICAL_RATIO_ORDER.indexOf(b.ratio),
                ),
            }))
            .sort((a, b) => {
                const aBest = Math.max(...a.candidates.map((candidate) => candidate.score ?? -1));
                const bBest = Math.max(...b.candidates.map((candidate) => candidate.score ?? -1));
                return bBest - aBest || a.conceptIndex - b.conceptIndex;
            });
    }, [task]);

    const onClickCandidate = useCallback((candidateId: string) => {
        setSelectedCandidateId(candidateId);
    }, []);

    const [previewOpen, setPreviewOpen] = useState(false);

    const onClickOpenPreview = useCallback(() => {
        setPreviewOpen(true);
    }, []);

    const onClickClosePreview = useCallback(() => {
        setPreviewOpen(false);
    }, []);

    const selectedCandidate = task?.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;

    const totalCount = task?.candidates.length ?? 0;
    const headerMeta = useMemo(() => {
        if (!task) {
            return '';
        }
        const formatCount = task.request.aspectRatios.length;
        return `${totalCount} asset${totalCount > 1 ? 's' : ''} · ${formatCount} format${
            formatCount > 1 ? 's' : ''
        }${task.request.ctaEnabled ? ' · CTA on' : ''} · downloads unlimited`;
    }, [task, totalCount]);

    return (
        <>
            <AppHeader />

            <main className="mx-auto max-w-[100rem] px-8 pb-24 pt-32">

                {isLoading && (
                    <div className="grid gap-8 xl:grid-cols-[1fr_22.5rem] 2xl:grid-cols-[1fr_22.5rem]">
                        <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))]">
                            {[0, 1, 2, 3].map((index) => (
                                <div
                                    key={index}
                                    className="animate-pulse rounded-[1.5rem] border border-hairline bg-surface aspect-square"
                                />
                            ))}
                        </div>
                        <div className="animate-pulse rounded-[1.5rem] border border-hairline bg-surface" />
                    </div>
                )}

                {!isLoading && error && (
                    <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-hairline bg-surface px-8 py-16 text-center">
                        <p className="text-[13px] leading-relaxed text-[#F87171]">{error}</p>
                        <a
                            href="/ad/create"
                            className="rounded-full bg-text1 px-6 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Start a new generation
                        </a>
                    </div>
                )}

                {!isLoading && !error && task && (
                    <div className="grid gap-10 xl:grid-cols-[1fr_22.5rem] xl:items-start 2xl:grid-cols-[1fr_22.5rem]">
                        <div className="space-y-10">
                            <div>
                                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                                    Results
                                </span>
                                <h1 className="mt-2 max-w-[18ch] text-3xl font-bold tracking-tight text-text1 md:text-4xl">
                                    Your candidates are ready
                                </h1>
                                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                    {headerMeta}
                                </p>
                            </div>
                            {conceptGroups.map((group) => {
                                const bestScore = Math.max(...group.candidates.map((c) => c.score ?? -1));
                                return (
                                    <section key={group.conceptIndex}>
                                        <div className="mb-4 flex items-baseline justify-between gap-4">
                                            <h2 className="text-lg font-bold tracking-tight text-text1">
                                                Creative {String(group.conceptIndex + 1).padStart(2, '0')}
                                                {bestScore >= 0 && (
                                                    <span className="ml-2.5 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-text2">
                                                        best {bestScore.toFixed(1)}
                                                    </span>
                                                )}
                                            </h2>
                                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                                {group.candidates.length} format
                                                {group.candidates.length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-start gap-5">
                                            {group.candidates.map((candidate) => (
                                                <CandidateCard
                                                    key={candidate.id}
                                                    candidate={candidate}
                                                    selected={candidate.id === selectedCandidateId}
                                                    onSelect={() => onClickCandidate(candidate.id)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        <div className="xl:sticky xl:top-24">
                            <DetailPanel
                                task={task}
                                candidate={selectedCandidate}
                                onOpenPreview={onClickOpenPreview}
                            />
                        </div>
                    </div>
                )}

                {previewOpen && selectedCandidate && (
                    <PreviewModal candidate={selectedCandidate} onClose={onClickClosePreview} />
                )}
            </main>
        </>
    );
}