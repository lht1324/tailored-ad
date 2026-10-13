import { r2ServerAPI } from "@/lib/r2";
import {
    AdGenerationBatch,
    AdRatioKey,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * ad 이미지 Storage 헬퍼 — 원본(product/person/brand_logo) 및 결과 이미지의
 * 규칙 경로 조립과 서명 URL 발급을 담당한다.
 *
 * 저장소는 R2 (S3 규격, private 버킷). 서명 URL 만료 24시간 — Supabase 시절과 동일.
 *
 * 경로 규칙 (DB 저장 없이 규칙으로 재조립):
 *  - 입력:  {user_id}/{batch_id}/{product|person|brand_logo}_image.{imageFileExtension}
 *  - 프로필 기본 로고: {user_id}/profile/brand_logo.{imageFileExtension}
 *  - 출력:  {user_id}/{batch_id}/ad_generation_result_{creativeIndex}_{ratioKey}.{imageFileExtension}
 */

export const AD_IMAGE_STORAGE_BUCKET = "ad_image_storage";

function getAdInputImagePath(
    userId: string,
    batchId: string,
    componentName: "product" | "person" | "brand_logo",
    imageFileExtension: string,
): string {
    return `${userId}/${batchId}/${componentName}_image.${imageFileExtension}`;
}

function getAdResultImagePath(
    userId: string,
    batchId: string,
    creativeIndex: number,
    ratioKey: AdRatioKey,
    imageFileExtension: string,
): string {
    return `${userId}/${batchId}/ad_generation_result_${creativeIndex}_${ratioKey}.${imageFileExtension}`;
}

function getProfileBrandLogoPath(
    userId: string,
    imageFileExtension: string,
): string {
    return `${userId}/profile/brand_logo.${imageFileExtension}`;
}

function getBatchBrandLogoPath(
    userId: string,
    batchId: string,
    imageFileExtension: string,
): string {
    return getAdInputImagePath(userId, batchId, "brand_logo", imageFileExtension);
}

export const adImageServerAPI = {
    /**
     * 원본(product/person) 참조 이미지 서명 URL 목록.
     * 존재하는 컴포넌트만 포함 — 둘 다 없으면 빈 배열.
     */
    async getAdOriginalImageSignedUrls(batch: AdGenerationBatch): Promise<string[]> {
        const signedUrls: string[] = [];

        const components: Array<{ name: "product" | "person"; record: AdGenerationBatch["product_image"] }> = [
            { name: "product", record: batch.product_image },
            { name: "person", record: batch.person_image },
        ];

        for (const component of components) {
            if (!component.record) {
                continue;
            }

            const filePath = getAdInputImagePath(
                batch.user_id,
                batch.id,
                component.name,
                component.record.imageFileExtension,
            );

            try {
                signedUrls.push(await r2ServerAPI.presignGet(filePath));
            } catch (error) {
                throw new Error(
                    `Failed to create signed URL for ${component.name} image (${filePath}): ${error instanceof Error ? error.message : "presign failed"}`,
                );
            }
        }

        return signedUrls;
    },

    /**
     * 결과 이미지 1장의 서명 URL — 확장자는 RPC 마커(imageFileExtension)에서 얻는다.
     * transform은 Supabase 시절 잔재 (쿼터 고갈로 미사용 중). R2+Transformations 붙일 때 부활.
     * 미지정 시 원본 (다운로드·에디터·파이프라인용).
     */
    async getAdResultImageSignedUrl(
        userId: string,
        batchId: string,
        creativeIndex: number,
        ratioKey: AdRatioKey,
        imageFileExtension: string,
        transform?: { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' | 'fill' },
    ): Promise<string> {
        void transform;
        const filePath = getAdResultImagePath(userId, batchId, creativeIndex, ratioKey, imageFileExtension);

        try {
            return await r2ServerAPI.presignGet(filePath);
        } catch (error) {
            throw new Error(
                `Failed to create signed URL for result image (${filePath}): ${error instanceof Error ? error.message : "presign failed"}`,
            );
        }
    },

    /** 규칙 경로 노출 (테스트·디버깅용) */
    getAdInputImagePath,
    getAdResultImagePath,
    getProfileBrandLogoPath,
    getBatchBrandLogoPath,

    /** 업로드 — upsert 고정 */
    async uploadObject(key: string, data: ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
        await r2ServerAPI.putObject(key, data, contentType);
    },

    /** prefix 아래 키 목록 */
    async listKeys(prefix: string): Promise<string[]> {
        return r2ServerAPI.listKeys(prefix);
    },

    /** 삭제 — 빈 배열이면 no-op */
    async deleteKeys(keys: string[]): Promise<void> {
        await r2ServerAPI.deleteKeys(keys);
    },

    /**
     * 프로필 기본 로고 서명 URL — {user_id}/profile/brand_logo.{ext}
     */
    async getProfileBrandLogoSignedUrl(
        userId: string,
        imageFileExtension: string,
    ): Promise<string> {
        const filePath = getProfileBrandLogoPath(userId, imageFileExtension);
        try {
            return await r2ServerAPI.presignGet(filePath);
        } catch (error) {
            throw new Error(`Failed to create signed URL for profile brand logo (${filePath}): ${error instanceof Error ? error.message : "presign failed"}`);
        }
    },

    /**
     * 배치 로고 서명 URL — {user_id}/{batch_id}/brand_logo_image.{ext}
     */
    async getBatchBrandLogoSignedUrl(
        userId: string,
        batchId: string,
        imageFileExtension: string,
    ): Promise<string> {
        const filePath = getBatchBrandLogoPath(userId, batchId, imageFileExtension);
        try {
            return await r2ServerAPI.presignGet(filePath);
        } catch (error) {
            throw new Error(`Failed to create signed URL for batch brand logo (${filePath}): ${error instanceof Error ? error.message : "presign failed"}`);
        }
    },

    /**
     * Replicate prediction output에서 첫 번째 이미지 URL 추출.
     * output은 string | string[] | FileOutput | FileOutput[] 형태가 올 수 있다.
     */
    extractFirstOutputUrl(output: unknown): string | null {
        if (!output) {
            return null;
        }

        if (typeof output === 'string') {
            return output;
        }

        if (Array.isArray(output)) {
            for (const item of output) {
                if (typeof item === 'string') {
                    return item;
                }
                if (typeof item === 'object' && item !== null && 'url' in item && typeof (item as { url: unknown }).url === 'string') {
                    return (item as { url: string }).url;
                }
            }
            return null;
        }

        if (typeof output === 'object' && 'url' in output && typeof (output as { url: unknown }).url === 'string') {
            return (output as { url: string }).url;
        }

        return null;
    },

    /**
     * Content-Type 또는 URL 확장자에서 파일 확장자를 추론.
     * 반환은 항상 확장자 본문만 (예: "png", "jpeg", "webp").
     */
    inferFileExtension(contentType: string | null, imageUrl: string): string {
        if (contentType) {
            const normalized = contentType.toLowerCase();
            if (normalized.includes('jpeg') || normalized.includes('jpg')) {
                return 'jpeg';
            }
            if (normalized.includes('png')) {
                return 'png';
            }
            if (normalized.includes('webp')) {
                return 'webp';
            }
        }

        const urlWithoutQuery = imageUrl.split('?')[0] ?? imageUrl;
        const lastSegment = urlWithoutQuery.split('/').pop() ?? '';
        const extFromUrl = lastSegment.split('.').pop()?.toLowerCase() ?? '';

        if (extFromUrl === 'jpg') {
            return 'jpeg';
        }
        if (extFromUrl === 'jpeg' || extFromUrl === 'png' || extFromUrl === 'webp') {
            return extFromUrl;
        }

        return 'png';
    },
};
