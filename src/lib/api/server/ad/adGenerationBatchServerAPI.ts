import { desc, eq, sql } from "drizzle-orm";
import { getNeonDb, neonErrorMessage } from "@/lib/db/neon";
import { adGenerationBatches } from "@/lib/db/schema";
import {
    AdBatchStatus,
    AdGenerationBatch,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * ad_generation_batches 전용 서버 API — Neon(drizzle)으로 동작 (내부 파이프라인 전용).
 * 호출 시그니처·에러 메시지 유지. RPC 3종은 drizzle sql로 함수 직접 호출.
 */
export const adGenerationBatchServerAPI = {
    // POST - 새 배치 생성
    async postAdGenerationBatch(batchData: Partial<AdGenerationBatch>): Promise<AdGenerationBatch> {
        const db = await getNeonDb();

        try {
            const rows = await db
                .insert(adGenerationBatches)
                .values(batchData as typeof adGenerationBatches.$inferInsert)
                .returning();

            const row = rows[0];
            if (!row) {
                throw new Error('No row returned.');
            }

            return row as unknown as AdGenerationBatch;
        } catch (error) {
            throw new Error(`Failed to create ad generation batch: ${neonErrorMessage(error)}`);
        }
    },

    // GET - 배치 ID로 단일 조회
    async getAdGenerationBatchById(batchId: string): Promise<AdGenerationBatch | null> {
        const db = await getNeonDb();

        const rows = await db
            .select()
            .from(adGenerationBatches)
            .where(eq(adGenerationBatches.id, batchId))
            .limit(1);

        return (rows[0] as unknown as AdGenerationBatch | undefined) ?? null;
    },

    // PATCH - 배치 데이터 업데이트 (updated_at 자동 기록)
    async patchAdGenerationBatch(
        batchId: string,
        patch: Partial<AdGenerationBatch>,
    ): Promise<AdGenerationBatch> {
        const db = await getNeonDb();
        const currentDateString = new Date().toISOString();

        try {
            const rows = await db
                .update(adGenerationBatches)
                .set({
                    ...patch,
                    updated_at: currentDateString,
                } as Partial<typeof adGenerationBatches.$inferInsert>)
                .where(eq(adGenerationBatches.id, batchId))
                .returning();

            const row = rows[0];
            if (!row) {
                throw new Error('No matching row.');
            }

            return row as unknown as AdGenerationBatch;
        } catch (error) {
            throw new Error(`Failed to update ad generation batch: ${neonErrorMessage(error)}`);
        }
    },

    // GET - 유저별 배치 리스트 (최신순, 페이지네이션)
    async listAdGenerationBatchesByUserId(
        userId: string,
        options?: { limit?: number; offset?: number },
    ): Promise<AdGenerationBatch[]> {
        const db = await getNeonDb();
        const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
        const offset = Math.max(options?.offset ?? 0, 0);

        const rows = await db
            .select()
            .from(adGenerationBatches)
            .where(eq(adGenerationBatches.user_id, userId))
            .orderBy(desc(adGenerationBatches.created_at))
            .limit(limit)
            .offset(offset);

        return rows as unknown as AdGenerationBatch[];
    },

    // GET - 유저 소유 검증 포함 단일 조회
    async getAdGenerationBatchByIdForUser(batchId: string, userId: string): Promise<AdGenerationBatch | null> {
        const db = await getNeonDb();

        const rows = await db
            .select()
            .from(adGenerationBatches)
            .where(eq(adGenerationBatches.id, batchId))
            .limit(1);

        const row = (rows[0] as unknown as AdGenerationBatch | undefined) ?? null;
        if (row && row.user_id !== userId) {
            return null;
        }
        return row;
    },

    // PATCH - 상태만 업데이트
    async patchAdGenerationBatchStatus(batchId: string, status: AdBatchStatus): Promise<AdGenerationBatch> {
        return adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, { status });
    },

    // RPC - 프롬프트 산출물 저장 (creativePrompt + copy) — creative당 1회
    async updateCreativePromptOutputs(
        batchId: string,
        creativeIndex: number,
        creativePrompt: string,
        baseRatio: string,
        copy: { headline: string | null; cta: string | null },
    ): Promise<void> {
        const db = await getNeonDb();

        try {
            await db.execute(
                sql`SELECT public.update_creative_prompt_outputs(${batchId}::uuid, ${creativeIndex}, ${creativePrompt}, ${baseRatio}, ${JSON.stringify(copy)}::jsonb)`,
            );
        } catch (error) {
            throw new Error(`Failed to update creative prompt outputs: ${neonErrorMessage(error)}`);
        }
    },

    // RPC - 분석 결과 저장 (design/score 슬라이스 교체, completed 전이)
    async updateCreativeImageAnalysis(
        batchId: string,
        creativeIndex: number,
        imageResults: Record<string, unknown>,
    ): Promise<void> {
        const db = await getNeonDb();

        try {
            await db.execute(
                sql`SELECT public.update_creative_image_analysis(${batchId}::uuid, ${creativeIndex}, ${JSON.stringify(imageResults)}::jsonb)`,
            );
        } catch (error) {
            throw new Error(`Failed to update creative image analysis: ${neonErrorMessage(error)}`);
        }
    },

    // RPC - 이미지 생성 완료 마커 기록 (멱등, 행 잠금) — fail-soft: error 시에도 마커로 카운트
    async updateCreativeImageByRatioGenerationCompleted(
        batchId: string,
        creativeIndex: number,
        ratioKey: string,
        fileExtension: string | null,
        imageError?: { code: string; message: string } | null,
    ): Promise<{ isLastCreative: boolean; batchCompleted: boolean }> {
        const db = await getNeonDb();

        try {
            const res = await db.execute(
                sql`SELECT public.update_creative_image_by_ratio_generation_completed(${batchId}::uuid, ${creativeIndex}, ${ratioKey}, ${fileExtension}, ${JSON.stringify(imageError ?? null)}::jsonb) AS result`,
            );
            const result = (res.rows[0] as unknown as {
                result?: { isLastCreative?: boolean; batchCompleted?: boolean } | null;
            } | undefined)?.result;

            return {
                isLastCreative: result?.isLastCreative ?? false,
                batchCompleted: result?.batchCompleted ?? false,
            };
        } catch (error) {
            throw new Error(`Failed to update creative image completion: ${neonErrorMessage(error)}`);
        }
    },
};
