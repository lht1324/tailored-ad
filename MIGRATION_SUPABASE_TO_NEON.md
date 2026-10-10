# Supabase → Neon + Cloudflare 마이그레이션 계획

  작성일: 2026-10-09. 릴리즈 전이라 기존 사용자 고려 불필요.

  ## 목표

  TailoredAd의 Supabase 의존 4종(Auth·Postgres·Storage·Realtime)을
  Neon + Cloudflare 스택으로 이전한다.

  ## Workstream 1. DB → Neon

  - 테이블 4종(`users`, `ad_generation_batches`, `usage_ledger`, `subscription_grants`) 이식.
  - RPC 4개(`increment_user_credit` 등) SQL 그대로 이식.
  - 같은 Postgres라 쿼리 의미론 동일. RLS는 service role 위주라 사실상 이관 불필요.
  - 인가는 API 게이트로 이동한다.
  - 선행 조건: Supabase에서 RPC 4개 원본 정의 추출.

  ## Workstream 2. Storage → R2 + Transformations

  - `ad_image_storage` 버킷 → R2 버킷.
  - 서명 URL은 R2 presigned URL로 교체.
  - 표시용 경량본은 `/cdn-cgi/image/` URL 방식 (Images binding API 사용 금지 — 호출당 과금 함정).
  - 코드 교체점: `imageServerAPI` + 직접 호출 4곳.
  - 비용: Free(월 저장 10GB + transform 5,000건)로 시작. 초과 시 transform $0.50/1,000건. 초기 $0 예상.
  - 검증: 동일 이미지 신/구 육안 비교.

  ## Workstream 3. Realtime → Upstash pub/sub + SSE

  - stage 완료 지점에 `publish(batch:{id})` 1줄씩 추가. 쓰는 쪽이 알리므로 DB 감지 불필요.
  - `GET /api/events` SSE route가 Upstash subscribe 스트림을 중계한다.
  - 클라 `channel()` 5곳 → `useBatchEvents` 훅 1개로 교체. `EventSource` 자동 재연결 내장.
  - 휘발성은 현행(Supabase Realtime)과 동일. 늦게 들어온 유저는 진입 GET으로 현행화.
  - 비용: Free(월 50만 커맨드) 범위. 초과해도 월 수 달러.
  - 검증: 생성 중 진행률 실시간 표시 E2E.

  ## Workstream 4. Auth → Neon Auth (마지막, 확정)

  - Neon Auth(매니지드 Better Auth). 소셜 Google + GitHub 지원.
  - `AuthContext`·`proxy.ts`·`callback/auth`·게이트웨이 인증 교체.

  - `AuthContext`·`proxy.ts`·`callback/auth`·게이트웨이 인증 교체.
  - 전원 재로그인 (테스트 계정만). 소셜은 버튼 1회, 이메일은 비번 재설정.
  - 비밀번호 해시 이전 불가. 릴리즈 전이라 영향 없음.

  ## 확정 인프라 (2026-10-09)

  - Neon: Singapore 리전, main=production + development 브랜치, Neon Auth ON.
  - Cloudflare Worker: `tailored-ad`.
  - R2: 버킷 `tailored-ad-images`, 바인딩 변수 `AD_IMAGE_BUCKET`.
  - cli R2 전환은 별도 탭에서 (본 계획 범위 밖).

  ## 순서

  2 → 1 → 3 → 4. Storage부터인 이유: 의존성 0, 교체점 단일, 눈으로 바로 확인 가능.
  Auth는 사용자 영향 최대라 맨 나중.

  ## 컷오버 통과 조건

  - staging 풀사이클 E2E (가입→결제→생성→Profile).
  - 크레딧 증감 신/구 diff 0.
  - 이미지 동등성 육안 확인.
  - Realtime 진행 표시 확인.

  ## 진행 상태 (2026-10-10 05:27, develop `ad4e55d` 푸시됨)

  - [x] Neon 프로젝트 (Singapore) + production/development 브랜치 + Neon Auth ON.
  - [x] `neon` CLI 전역 설치 + login + skills/MCP + link (production) + `neon.ts` (auth:true) + deploy.
  - [x] DB 스키마·함수·데이터 → development 브랜치 완료 (테이블 4종, 함수 3종, 건수 2/65/14/278 대조됨).
    파일: `db/neon/01_schema.sql`, `02_functions.sql`, `03_verify.sql`.
  - [x] Storage 코드 → R2 (S3 규격, private + presigned URL). `src/lib/r2.ts` 신규.
    키 규칙 그대로라 호출부 변경 0. `@aws-sdk/client-s3 ^3.1128.0` +
    `@aws-sdk/s3-request-presigner ^3.1128.0` (package.json).
  - [x] 기존 파일 459건(754MB) R2 업로드 완료 (`{user_id}/…` 키 그대로, 실패 0).
  - [x] R2 읽기 검증: Projects 화면 썸네일 정상 (DB는 Supabase, 이미지는 R2 혼합 상태).
  - [ ] DB 코드 교체 (다음 작업, 아래 인수인계 참조).
  - [ ] R2 쓰기 검증: Create 1건 생성 → 표시 (미실시).
  - [ ] Realtime, Auth, Transformations (미착수).

  ## 인수인계 — DB 코드 교체 (supabase-js → drizzle/Neon)

  - 범위: 데이터 호출만. 서버 4곳 (`usersServerAPI`, `usageServerAPI`,
    `adGenerationBatchServerAPI`, `proxy.ts` 39행 plan 조회 1건).
    Auth·Realtime·클라 supabase 호출은 손대지 않는다.
    직접 `.from(` 쓰는 곳은 위 4곳뿐 (나머지는 이 모듈 경유).
  - RPC 3종은 Neon에 이식済み → drizzle `sql`로 함수 직접 호출, 로직 그대로.
    데드 2종 이식 불필요 (`increment_user_credit` — DB에 없음+호출자 없음,
    `update_creative_reframe_outputs` — 호출자 없음).
    `prompt_outputs`는 코드가 쓰는 오버로드 1개만 이식됨
    (`p_creative_prompt`+`p_base_ratio`).
  - 패키지: `drizzle-orm ^0.45.3` + `@neondatabase/serverless ^1.1.0`
    (최신 확인済み, package.json 미반영 — 추가 후 사장이 `npm install`).
  - 드라이버: `drizzle-orm/neon-http` + serverless `neon()` (fetch 기반,
    middleware/edge 포함 전역 동작. WS 드라이버 불필요).
  - 새 파일: `src/lib/db/neon.ts` (싱글톤) + `src/lib/db/schema.ts` (4 테이블,
    `db/neon/01_schema.sql`과 1:1).
  - env 확정 (10-10): `NEON_DATABASE_URL` (development pooled) +
    `NEON_DATABASE_URL_UNPOOLED` (development direct, drizzle-kit용).
    旧 `DATABASE_URL` 쌍은 production (`ep-falling-butterfly-b3x9wevp`)이라 교체됨.
    현 값은 development (`ep-lucky-fire-b3xre8la`, pooled/direct 쌍).
    Auth URL (`NEON_AUTH_*`)도 브랜치 종속이라 development 값으로 교체됨 (동일 호스트 `neonauth`).
    앱 코드는 pooled만 사용, Workers에는 `NEON_DATABASE_URL`만 등록 (UNPOOLED 불필요).
  - `proxy.ts` plan 조회는 Auth가 Supabase인 동안 user.id 그대로 사용 가능
    (UUID 동일). Auth 전환 전까지 유효.
  - 선행작업 아님: `usageServerAPI`·`usersServerAPI`·`adGenerationBatchServerAPI`
    전문은 이미 읽음 (호출 시그니처 유지, 내부만 교체).
  - 검증: staging 풀사이클 E2E (가입→결제→생성→Profile) + 크레딧 diff 0.

  ## 비용 요약

  | 항목 | 초기 | 트래픽 후 |
  |---|---|---|
  | R2 + Transformations | $0 (Free) | transform $0.50/1,000건 |
  | Upstash pub/sub | $0 (Free) | 월 수 달러 |
  | Workers $5 | 불필요 | 일 10만 요청 초과 시 |
  | Neon | 별도 확인 | 별도 확인 |
