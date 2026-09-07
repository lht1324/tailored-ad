import {
    AdTask,
    AdCandidate,
    AdAspectRatio,
    AdDesignLayout,
    AdGenerateRequest,
    AdTaskStatus,
} from "@/lib/api/client/ad/adClientAPI";

/*
 * ShortReal Ad — 서버 API (현재 mock).
 * 태스크 진행 상태는 경과 시간 기반으로 계산해 무상태에 가깝게 동작한다.
 * 실 구현 시 Supabase 태스크 테이블 + fal.ai 파이프라인으로 교체할 것.
 */

// 가라 데이터 풀 (mock 전용, 실 구현 시 제거)
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

const STAGE_TIMINGS: { status: AdTaskStatus; afterMs: number }[] = [
    { status: 'queued', afterMs: 1200 },
    { status: 'generating', afterMs: 3200 },
    { status: 'designing', afterMs: 4600 },
    { status: 'rendering', afterMs: 5800 },
    { status: 'completed', afterMs: Number.MAX_SAFE_INTEGER },
];

// 시드 기반 의사난수 (mock용)
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

function pickByRatio(pool: string[], rand: () => number): string {
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

function getStatusByElapsed(elapsedMs: number): AdTaskStatus {
    for (const stage of STAGE_TIMINGS) {
        if (elapsedMs < stage.afterMs) {
            return stage.status;
        }
    }
    return 'completed';
}

// 모듈 레벨 메모리 저장소 (mock 전용. 실 구현 시 DB로 대체)
const taskStore = new Map<string, AdTask>();

export const adServerAPI = {
    // POST - 생성 태스크 생성
    async postAdTask(request: AdGenerateRequest): Promise<AdTask> {
        const id = `mock-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const task: AdTask = {
            id,
            status: 'queued',
            request,
            candidates: [],
            error: null,
            createdAt: new Date().toISOString(),
        };
        taskStore.set(id, task);
        return task;
    },

    // GET - 태스크 상태/결과 조회 (경과 시간 기반 진행 + 완료 시 후보 생성)
    async getAdTaskById(taskId: string): Promise<AdTask | null> {
        const task = taskStore.get(taskId);
        if (!task) {
            return null;
        }

        const elapsedMs = Date.now() - new Date(task.createdAt).getTime();
        const status = getStatusByElapsed(elapsedMs);

        if (status === 'completed' && task.candidates.length === 0) {
            const rand = mulberry32(hashString(taskId));
            const conceptCount = task.request.conceptCount;
            const ratios = task.request.aspectRatios;

            // 개념 우선 생성 — 개념별로 같은 이미지 + 같은 디자인(시드 고정 흉내), 비율만 파생. 점수는 비율별 개별 평가.
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

            task.status = 'completed';
            task.candidates = candidates;
        }

        if (status !== 'completed') {
            task.status = status;
        }

        return task;
    },
};
