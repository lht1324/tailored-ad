-- 2026-10-20 — 성장 측정 기반 (UTM 귀속 + 이메일 수집)
-- 실행: Neon 콘솔에서 대상 브랜치(데모/prod 각각) → SQL Editor 에 붙여넣고 실행.
-- 이 파일을 실행한 뒤 src/lib/db/schema.ts(거울)를 같이 맞춘다.

-- 1) users: UTM 귀속 컬럼 (어느 채널에서 온 유저인지 DB가 진실)
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_content text;

-- 2) subscribers: 이메일 수집 (아직 로그인 안 한 트래픽 확보)
CREATE TABLE IF NOT EXISTS subscribers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    source text,
    utm_source text,
    utm_campaign text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON subscribers (created_at DESC);
