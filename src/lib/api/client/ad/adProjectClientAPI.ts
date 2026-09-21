import { getFetch, postFetch, postFormFetch } from "@/lib/api/client/baseFetch";
import { AdGenerationBatch, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

// ---- AdGenerationBatch 클라이언트 API (정석: DB명 유지) ----
// 서버 경로는 /api/ad-generation-batches 로 통일 (테이블 ad_generation_batches와 1:1).
// UI 노출은 Project, URL은 /ad/projects 로 별칭. 내부 데이터는 batch로 유지.

export interface AdGenerationBatchListResponse {
    batches: AdGenerationBatch[];
    pagination: {
        limit: number;
        offset: number;
        count: number;
    };
    thumbnailCreativeIndexes: Record<string, number>;
    thumbnailRatioKeys: Record<string, AdRatioKey>;
}

export interface AdGenerationBatchDetailResponse {
    batch: AdGenerationBatch;
    signedUrls: Record<string, string>; // key: `${creativeIndex}_${ratioKey}` — 원본
    brandLogoSignedUrl: string | null;
}

// 하위 호환 별칭 — UI 레이어는 Project로 쓰되 내부 타입은 batch 그대로
export type AdProjectListResponse = { projects: AdGenerationBatch[] } & Omit<AdGenerationBatchListResponse, 'batches'> & { batches?: AdGenerationBatch[] };
export type AdProjectDetailResponse = { project: AdGenerationBatch } & Omit<AdGenerationBatchDetailResponse, 'batch'> & { batch?: AdGenerationBatch };

export type AdPipelineStartClientRequest = {
    productImage?: { imageFileExtension: string; note?: string } | null;
    personImage?: { imageFileExtension: string; note?: string } | null;
    brandLogo?: { imageFileExtension: string } | null;
    aspectRatios: string[]; // '1:1' 형태, 서버가 AdRatioKey로 정규화
    conceptCount: number;
    ctaEnabled?: boolean;
    brandPalette?: string[] | null;
};

/** 잔액 소진 — /create 업셀 모달 판별용 (402 전용) */
export class BalanceExhaustedError extends Error {
    constructor() {
        super('Image balance exhausted.');
        this.name = 'BalanceExhaustedError';
    }
}

export const adGenerationBatchClientAPI = {
    async listBatches(options?: { limit?: number; offset?: number }): Promise<AdGenerationBatchListResponse> {
        const params = new URLSearchParams();
        if (options?.limit != null) params.set('limit', String(options.limit));
        if (options?.offset != null) params.set('offset', String(options.offset));
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await getFetch(`/api/ad-generation-batches${query}`);
        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.error ?? 'Failed to list batches');
        }
        const data = result.data as Record<string, unknown>;
        // 정석 응답 batches / 레거시 projects alias 모두 지원
        const batches = (data.batches ?? data.projects) as AdGenerationBatch[];
        return {
            batches,
            pagination: data.pagination as AdGenerationBatchListResponse['pagination'],
            thumbnailCreativeIndexes: (data.thumbnailCreativeIndexes as Record<string, number>) ?? {},
            thumbnailRatioKeys: (data.thumbnailRatioKeys as Record<string, AdRatioKey>) ?? {},
        };
    },

    async getBatch(batchId: string): Promise<AdGenerationBatchDetailResponse> {
        const response = await getFetch(`/api/ad-generation-batches/${batchId}`);
        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.error ?? 'Failed to get batch');
        }
        const data = result.data as Record<string, unknown>;
        const batch = (data.batch ?? data.project) as AdGenerationBatch;
        return {
            batch,
            signedUrls: data.signedUrls as Record<string, string>,
            brandLogoSignedUrl: (data.brandLogoSignedUrl as string | null) ?? null,
        };
    },

    /**
     * 배치 생성 + 원본 업로드를 multipart 1요청으로.
     * 서버가 생성→업로드→specs 순으로 처리해 파이프라인 시작 시 파일 존재가 보장된다.
     */
    async createBatch(
        request: AdPipelineStartClientRequest,
        files?: { product?: File | null; person?: File | null; brandLogo?: File | null },
    ): Promise<{ batchId: string }> {
        try {
            const formData = new FormData();
            formData.append("payload", JSON.stringify(request));
            if (files?.product) formData.append("product", files.product);
            if (files?.person) formData.append("person", files.person);
            if (files?.brandLogo) formData.append("brand_logo", files.brandLogo);
            const response = await postFormFetch('/api/image', formData);
            const result = await response.json();
            if (!result.success || !result.data) {
                // gateway가 HTTP 상태로 바꿔 내려 body를 못 읽는 경우 — 402 잔액 소진 판별
                if (result.status === 402 || /balance exhausted/i.test(result.error ?? '')) {
                    throw new BalanceExhaustedError();
                }
                throw new Error(result.error ?? 'Failed to create batch');
            }
            return result.data as { batchId: string };
        } catch (error) {
            if (error instanceof Error && /\[402\]/.test(error.message)) {
                throw new BalanceExhaustedError();
            }
            throw error;
        }
    },
};

// UI 별칭 — 화면/URL은 Project, 내부 데이터는 batch 그대로
export const adProjectClientAPI = {
    async listProjects(options?: { limit?: number; offset?: number }): Promise<AdProjectListResponse> {
        const data = await adGenerationBatchClientAPI.listBatches(options);
        return {
            projects: data.batches,
            batches: data.batches,
            pagination: data.pagination,
            thumbnailCreativeIndexes: data.thumbnailCreativeIndexes,
            thumbnailRatioKeys: data.thumbnailRatioKeys,
        } as unknown as AdProjectListResponse;
    },
    async getProject(projectId: string): Promise<AdProjectDetailResponse> {
        const data = await adGenerationBatchClientAPI.getBatch(projectId);
        return {
            project: data.batch,
            batch: data.batch,
            signedUrls: data.signedUrls,
            brandLogoSignedUrl: data.brandLogoSignedUrl,
        } as AdProjectDetailResponse;
    },
    async createProject(
        request: AdPipelineStartClientRequest,
        files?: { product?: File | null; person?: File | null; brandLogo?: File | null },
    ): Promise<{ batchId: string }> {
        return adGenerationBatchClientAPI.createBatch(request, files);
    },
};

// ---- 유틸 — 내부 데이터는 batch, UI 텍스트만 Project ----

export function getBatchProgress(batch: AdGenerationBatch): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    isCompleted: boolean;
} {
    const total = batch.concept_count * batch.aspect_ratios.length;
    let completed = 0;
    let failed = 0;

    for (const cr of batch.ad_creative_results ?? []) {
        for (const ratioKey of batch.aspect_ratios) {
            const ir = (cr.imageResults as Partial<Record<AdRatioKey, { error?: unknown; score?: unknown; imageFileExtension?: unknown }>>)[ratioKey];
            if (!ir) continue;
            if ((ir as { error?: unknown }).error) {
                failed += 1;
            } else if ((ir as { score?: unknown }).score != null) {
                completed += 1;
            } else if ((ir as { imageFileExtension?: unknown }).imageFileExtension != null) {
                // 이미지 생성 완료됐지만 analysis(design/score) 대기 — pending으로 카운트
                continue;
            }
        }
    }

    const accounted = completed + failed;
    const pending = Math.max(0, total - accounted);

    return {
        total,
        completed,
        failed,
        pending,
        isCompleted: batch.status === 'completed' || batch.status === 'failed',
    };
}

// 별칭 — UI 코드는 Project로 쓰되 내부는 batch 그대로
export const getProjectProgress = getBatchProgress;

export function getBatchDisplayName(batch: AdGenerationBatch): string {
    const shortId = batch.id.slice(0, 6);
    return `Project ${shortId}`;
}
export const getProjectDisplayName = getBatchDisplayName;
