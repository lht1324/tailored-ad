import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import {
    AdBatchStatus,
    AdGenerationBatch,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * ad_generation_batches 전용 서버 API — 서비스 롤 클라이언트로 동작 (내부 파이프라인 전용).
 * videoGenerationTasksServerAPI 관례를 따른다.
 */
export const adGenerationBatchServerAPI = {
    // POST - 새 배치 생성
    async postAdGenerationBatch(batchData: Partial<AdGenerationBatch>): Promise<AdGenerationBatch> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .insert(batchData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create ad generation batch: ${error.message}`);
        }

        return data;
    },

    // GET - 배치 ID로 단일 조회
    async getAdGenerationBatchById(batchId: string): Promise<AdGenerationBatch | null> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .select('*')
            .eq('id', batchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw new Error(`Failed to get ad generation batch: ${error.message}`);
        }

        return data;
    },

    // PATCH - 배치 데이터 업데이트 (updated_at 자동 기록)
    async patchAdGenerationBatch(
        batchId: string,
        patch: Partial<AdGenerationBatch>,
    ): Promise<AdGenerationBatch> {
        const supabase = createSupabaseServiceRoleClient();
        const currentDateString = new Date().toISOString();

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .update({
                ...patch,
                updated_at: currentDateString,
            })
            .eq('id', batchId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update ad generation batch: ${error.message}`);
        }

        return data;
    },

    // GET - 유저별 배치 리스트 (최신순, 페이지네이션)
    async listAdGenerationBatchesByUserId(
        userId: string,
        options?: { limit?: number; offset?: number },
    ): Promise<AdGenerationBatch[]> {
        const supabase = createSupabaseServiceRoleClient();
        const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
        const offset = Math.max(options?.offset ?? 0, 0);

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw new Error(`Failed to list ad generation batches: ${error.message}`);
        }

        return (data ?? []) as AdGenerationBatch[];
    },

    // GET - 유저 소유 검증 포함 단일 조회
    async getAdGenerationBatchByIdForUser(batchId: string, userId: string): Promise<AdGenerationBatch | null> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .select('*')
            .eq('id', batchId)
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get ad generation batch: ${error.message}`);
        }

        return data;
    },

    // PATCH - 상태만 업데이트
    async patchAdGenerationBatchStatus(batchId: string, status: AdBatchStatus): Promise<AdGenerationBatch> {
        return adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, { status });
    },

    // RPC - 프롬프트 산출물 저장 (imagePromptRecord + copy) — creative당 1회, 행 잠금
    async updateCreativePromptOutputs(
        batchId: string,
        creativeIndex: number,
        imagePromptRecord: Record<string, string>,
        copy: { headline: string | null; cta: string | null },
    ): Promise<void> {
        const supabase = createSupabaseServiceRoleClient();

        const { error } = await supabase.rpc('update_creative_prompt_outputs', {
            p_batch_id: batchId,
            p_creative_index: creativeIndex,
            p_image_prompt_record: imagePromptRecord,
            p_copy: copy,
        });

        if (error) {
            throw new Error(`Failed to update creative prompt outputs: ${error.message}`);
        }
    },

    // RPC - 분석 결과 저장 (design/score 슬라이스 교체, completed 전이)
    async updateCreativeImageAnalysis(
        batchId: string,
        creativeIndex: number,
        imageResults: Record<string, unknown>,
    ): Promise<void> {
        const supabase = createSupabaseServiceRoleClient();

        const { error } = await supabase.rpc('update_creative_image_analysis', {
            p_batch_id: batchId,
            p_creative_index: creativeIndex,
            p_image_results: imageResults,
        });

        if (error) {
            throw new Error(`Failed to update creative image analysis: ${error.message}`);
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
        const supabase = createSupabaseServiceRoleClient();

        const { data, error: rpcError } = await supabase.rpc(
            'update_creative_image_by_ratio_generation_completed',
            {
                p_batch_id: batchId,
                p_creative_index: creativeIndex,
                p_ratio_key: ratioKey,
                p_file_extension: fileExtension,
                p_error: imageError ?? null,
            },
        );

        if (rpcError) {
            throw new Error(`Failed to update creative image completion: ${rpcError.message}`);
        }

        const result = data as { isLastCreative?: boolean; batchCompleted?: boolean } | null;

        return {
            isLastCreative: result?.isLastCreative ?? false,
            batchCompleted: result?.batchCompleted ?? false,
        };
    },
};
