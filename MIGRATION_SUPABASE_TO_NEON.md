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

  ## 비용 요약

  | 항목 | 초기 | 트래픽 후 |
  |---|---|---|
  | R2 + Transformations | $0 (Free) | transform $0.50/1,000건 |
  | Upstash pub/sub | $0 (Free) | 월 수 달러 |
  | Workers $5 | 불필요 | 일 10만 요청 초과 시 |
  | Neon | 별도 확인 | 별도 확인 |
