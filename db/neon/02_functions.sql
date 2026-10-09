-- 02_functions.sql — 01_schema.sql 실행 후 development 브랜치에서 전체 실행.
-- 호출자 있는 함수 3개만. 원본 그대로.
-- 제외: increment_user_credit (DB에 없음 + 호출자 없음), update_creative_reframe_outputs (호출자 없음).

CREATE OR REPLACE FUNCTION public.update_creative_prompt_outputs(p_batch_id uuid, p_creative_index integer, p_creative_prompt text, p_base_ratio text, p_copy jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
    update public.ad_generation_batches
    set ad_creative_specs = jsonb_set(
            jsonb_set(
                coalesce(ad_creative_specs, '[]'::jsonb),
                array[p_creative_index::text, 'creativePrompt'],
                to_jsonb(p_creative_prompt),
                true
            ),
            array[p_creative_index::text, 'baseRatio'],
            to_jsonb(p_base_ratio),
            true
        ),
        ad_creative_results = jsonb_set(
            coalesce(ad_creative_results, '[]'::jsonb),
            array[p_creative_index::text, 'copy'],
            p_copy,
            true
        ),
        updated_at = now()
    where id = p_batch_id
      and jsonb_array_length(coalesce(ad_creative_specs, '[]'::jsonb)) > p_creative_index;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_creative_image_analysis(p_batch_id uuid, p_creative_index integer, p_image_results jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_row ad_generation_batches; v_results jsonb; v_expected_total int; v_scored_total int;
begin
    select * into v_row from public.ad_generation_batches where id = p_batch_id for update;
    if not found then return; end if;
    v_expected_total := v_row.concept_count * jsonb_array_length(coalesce(v_row.aspect_ratios, '[]'::jsonb));
    v_results := jsonb_set(coalesce(v_row.ad_creative_results, '[]'::jsonb), array[p_creative_index::text, 'imageResults'], p_image_results, true);
    v_scored_total := (
        select coalesce(count(*),0)
        from jsonb_array_elements(v_results) elem, jsonb_each(coalesce(elem -> 'imageResults', '{}'::jsonb)) piece
        where jsonb_typeof(piece.value -> 'score') = 'number'
           or (piece.value ? 'error' and piece.value -> 'error' is not null and jsonb_typeof(piece.value -> 'error') = 'object')
    );
    update public.ad_generation_batches set ad_creative_results = v_results, status = case when v_scored_total >= v_expected_total then 'completed' else status end, updated_at = now() where id = p_batch_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_creative_image_by_ratio_generation_completed(p_batch_id uuid, p_creative_index integer, p_ratio_key text, p_file_extension text DEFAULT NULL::text, p_error jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    v_row ad_generation_batches; v_results jsonb; v_ratio_count int;
    v_expected_total int; v_done_in_creative int; v_done_total int;
    v_existing jsonb; v_marker jsonb;
begin
    select * into v_row from public.ad_generation_batches where id = p_batch_id for update;
    if not found then return jsonb_build_object('isLastCreative', false, 'batchCompleted', false); end if;
    v_ratio_count := jsonb_array_length(coalesce(v_row.aspect_ratios, '[]'::jsonb));
    v_expected_total := v_row.concept_count * v_ratio_count;
    v_existing := v_row.ad_creative_results -> p_creative_index -> 'imageResults' -> p_ratio_key;
    if v_existing is not null and jsonb_typeof(v_existing) = 'object' then
        v_marker := v_existing;
        if p_file_extension is not null and (v_existing ->> 'imageFileExtension') is null then
            v_marker := jsonb_set(v_marker, '{imageFileExtension}', to_jsonb(p_file_extension), true);
        end if;
        if p_error is not null then
            v_marker := jsonb_set(v_marker, '{error}', p_error, true);
        -- base 실패 후 ratios 부활 성공 시에만 기존 error 제거 (정상 저장은 무관)
        elsif p_file_extension is not null and (v_existing ? 'error') and (v_existing -> 'error') is not null then
            v_marker := v_marker - 'error';
        end if;
    else
        if p_error is not null then
            v_marker := jsonb_build_object('design', null, 'score', null, 'imageFileExtension', null, 'error', p_error);
        else
            v_marker := jsonb_build_object('design', null, 'score', null, 'imageFileExtension', coalesce(p_file_extension, null), 'error', null);
        end if;
    end if;
    v_results := jsonb_set(coalesce(v_row.ad_creative_results, '[]'::jsonb), array[p_creative_index::text, 'imageResults', p_ratio_key], v_marker, true);
    v_done_in_creative := (select count(*) from jsonb_object_keys(coalesce(v_results -> p_creative_index -> 'imageResults', '{}'::jsonb)));
    v_done_total := (select coalesce(count(*),0) from jsonb_array_elements(v_results) elem, jsonb_object_keys(coalesce(elem -> 'imageResults', '{}'::jsonb)));
    update public.ad_generation_batches set ad_creative_results = v_results, status = case when v_done_total >= v_expected_total then 'designing' else status end, updated_at = now() where id = p_batch_id;
    return jsonb_build_object('isLastCreative', v_done_in_creative >= v_ratio_count, 'batchCompleted', v_done_total >= v_expected_total);
end;
$function$
;
