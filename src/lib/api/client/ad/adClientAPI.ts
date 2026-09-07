import { getFetch, postFetch } from "@/lib/api/client/baseFetch";

/*
 * ShortReal Ad — 임시 타입 및 클라이언트 API.
 * UI/플로우가 완결된 뒤 lib/api/types/ad/ 로 스키마를 이관할 것 (타입은 여기서만 정의).
 */

// ---- 임시 타입 ----

export type AdAspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '2:3';

export interface AdUploadedComponent {
    id: string;
    fileName: string;
    previewUrl: string;
    /**
     * 업로드 파일의 원본 픽셀 크기 — 로드 시점에 측정해 저장.
     * 배경 업로드 모드에서는 이 비율이 생성 비율(원본 보존)이 된다.
     */
    width?: number;
    height?: number;
    /**
     * 사용자가 이미지에 덧붙인 선택적 설명.
     * 원칙: 프롬프트에 직접 주입 금지 — 설계 생성 단계(해석 레이어)에서
     * 이미지+첨언+템플릿을 결합해 구조적 지시문으로 변환한 뒤 사용할 것.
     */
    note?: string;
    /** 원본 File — 클라이언트 메모리 전용, 전송 시 FormData로 함께 업로드 */
    file?: File;
}

export type AdBrandLogoComponent = AdUploadedComponent;

export interface AdGenerateRequest {
    backgroundPrompt: string | null;
    backgroundImage: AdUploadedComponent | null;
    product: AdUploadedComponent | null;
    person: AdUploadedComponent | null;
    /**
     * 생성할 비율 목록 (멀티 선택). 총 생성 장수 = aspectRatios.length × conceptCount.
     * 비율별 개별 생성 — 크롭/리프레임 등 후처리 변환을 하지 않는 것이 원칙.
     */
    aspectRatios: AdAspectRatio[];
    /**
     * 생성할 개념(주제 변형) 수. 각 개념은 선택한 모든 비율로 파생 생성된다.
     * 개념별로 서로 다른 시드를 사용하고, 같은 개념의 비율 버전들은 같은 시드를 공유한다.
     */
    conceptCount: number;
    ctaEnabled: boolean;
    brandPalette?: string[] | null;
}

export type AdTaskStatus = 'queued' | 'generating' | 'designing' | 'rendering' | 'completed' | 'failed';

export interface AdHeadlineSpec {
    text: string;
    x: number;
    y: number;
    maxWidth: number;
    align: 'left' | 'center' | 'right';
    fontSizePct: number;
    /** 헤드라인 색 — white/black 2택, Vision이 비율별 최종 결정 (AdCopySpec.headlineColor 제안 기반) */
    color?: 'white' | 'black' | null;
}

export interface AdCtaSpec {
    text: string;
    x: number;
    y: number;
    widthPct: number;
    fontSizePct: number;
}

export interface AdLogoSpec {
    brand: string;
    x: number;
    y: number;
    widthPct: number;
    fontSizePct: number;
}

export interface AdDesignLayout {
    headline: AdHeadlineSpec | null;
    cta: AdCtaSpec | null;
    logo: AdLogoSpec | null;
    scrim: boolean;
}

export interface AdCandidate {
    id: string;
    url: string;
    /** 이 후보가 속한 개념 인덱스 (0-based) — 같은 개념의 비율 버전들이 같은 값을 공유 */
    conceptIndex: number;
    /** 이 후보가 생성된 비율 — 그룹핑/카드 비율 표시에 사용 */
    ratio: AdAspectRatio;
    score: number | null;
    design: AdDesignLayout;
}

export interface AdTask {
    id: string;
    status: AdTaskStatus;
    request: AdGenerateRequest;
    candidates: AdCandidate[];
    error: string | null;
    createdAt: string;
}

export const AD_ASPECT_RATIOS: AdAspectRatio[] = ['1:1', '4:5', '9:16', '16:9', '2:3'];

/**
 * 비율별 사용자 노출 정보 — 어디서 쓰이는지(플랫폼)를 UI에서 함께 보여주기 위한 단일 소스.
 */
export const AD_ASPECT_RATIO_INFO: Record<AdAspectRatio, { label: string; usage: string }> = {
    '1:1': { label: 'Square', usage: 'Feed · Display' },
    '4:5': { label: 'Portrait', usage: 'Instagram & Facebook' },
    '9:16': { label: 'Story', usage: 'Stories · Reels · TikTok' },
    '16:9': { label: 'Landscape', usage: 'YouTube · Display' },
    '2:3': { label: 'Pin', usage: 'Pinterest' },
};

export const AD_CONCEPT_OPTIONS = [1, 2, 4, 10] as const;

export const AD_CTA_PRESETS = ['Shop now', 'Buy now', 'Get yours', 'Learn more'] as const;

// ---- API ----

export const adClientAPI = {
    // POST - 생성 태스크 생성 (1회 생성 시도 = 후보 n장 일괄 차감)
    async postGenerateTask(request: AdGenerateRequest): Promise<AdTask> {
        try {
            const response = await postFetch('/api/ad/tasks', request);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error(result.error ?? 'Failed to create ad generation task');
            }

            return result.data.task;
        } catch (error) {
            console.error('Error creating ad generation task:', error);
            throw error;
        }
    },

    // GET - 태스크 상태/결과 조회 (폴링)
    async getTask(taskId: string): Promise<AdTask> {
        try {
            const response = await getFetch(`/api/ad/tasks/${taskId}`);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error(result.error ?? 'Failed to fetch ad generation task');
            }

            return result.data.task;
        } catch (error) {
            console.error('Error fetching ad generation task:', error);
            throw error;
        }
    },
};
