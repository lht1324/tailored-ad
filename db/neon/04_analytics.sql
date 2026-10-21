-- 2026-10-20 — UTM 귀속 (어느 채널에서 온 유저인지 DB가 진실)
-- 실행: Neon 콘솔에서 대상 브랜치(데모/prod 각각) → SQL Editor 에 붙여넣고 실행.
-- 이 파일을 실행한 뒤 src/lib/db/schema.ts(거울)를 같이 맞춘다.
--
-- 참고: 이메일 수집(subscribers) 스키마는 사장님 지시에 따라 철회함 — 필요하면 별도 파일로.

ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_content text;
