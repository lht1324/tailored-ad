-- 03_verify.sql — 01, 02 실행 후 development 브랜치에서 실행. 결과 복사해서 전달.
-- 테이블 존재 + 함수 존재 확인용. 건수는 데이터 이전 후 대조.

SELECT 'users' AS tbl, count(*) AS cnt FROM public.users
UNION ALL
SELECT 'ad_generation_batches', count(*) FROM public.ad_generation_batches
UNION ALL
SELECT 'subscription_grants', count(*) FROM public.subscription_grants
UNION ALL
SELECT 'usage_ledger', count(*) FROM public.usage_ledger;

SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN (
    'update_creative_prompt_outputs',
    'update_creative_image_analysis',
    'update_creative_image_by_ratio_generation_completed'
)
ORDER BY proname;
