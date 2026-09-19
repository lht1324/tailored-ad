# TailoredAd — 작업 기록 (Last Updated: 2026-09-19 11:07)

> short_real의 `/ad`(AI 스틸 광고)를 독립 앱·독립 브랜드로 분리한 프로젝트.
> 포트폴리오(jaeholee.xyz) 관련 내용은 제외.

## 1. 개요

- **브랜드**: TailoredAd — "Tailored ads, not templates" (Harnessed AI ad studio)
- **도메인**: `tailoredad.com` 구매됨. DNS 연결은 실생성 이미지 준비될 때까지 홀딩.
- **짝꿍 도메인**: `tailorad.com` 미구매. 살 때 같이 사서 리다이렉트 예정.
- **스택**: Next.js 16 + Tailwind v4 + Supabase + Replicate/OpenRouter + Upstash Redis + Remotion Player, Cloudflare Workers 배포(OpenNext)
- **Git**: Git Flow (`master` 프로덕션 / `develop` 작업). develop 푸시됨 (origin/develop).
- **포트**: 클라 `3000` (`npm run dev`) / 서버 `3001` (`docker compose up`, 컨테이너 `3000` 매핑). short_real과 동일.
- **테마**: 라이트가 기본 (`theme-light`), 다크는 토글.

## 2. 분리 인벤토리 (short_real → 이 레포) + 이후 추가분

- `app/ad/*` 5개 → 루트로 이동 (`/`, `/create`, `/projects`, `/sign-in`, `/legal/*`, `/callback/auth`)
- `app/api/ad/*` → `app/api/*` (`/ad` prefix 제거: tasks, image, creative, ad-generation-batches)
- `app/webhook/ad/*` → `app/webhook/*` (Replicate 콜백 리시버. 빼먹었다가 후추가 — 생성 플로우 필수)
- `components/page/ad/**` 29개 + `components/page/sign-in`, `components/page/legal`
- `components/public` 중 GoogleIcon, GoogleSignInButton, DefaultSignInButton만
- `lib`: `api/client/ad`, `api/client/baseFetch*`, `api/client/usersClientAPI`,
  `api/types/supabase/ad`, `api/types/supabase/Users.ts`(포크),
  `api/types/api/BaseResponse.ts`, `api/server/ad`, `usersServerAPI.ts`,
  `supabase/*`, `utils/{getIsValidRequest,getNextBaseResponse,internalFetch,jsonUtils}`,
   `llm-prompts/ad`, `OpenRouterClient.ts`, `FontFamilyList.ts`, `ReplicateClient.ts`, `fonts.ts`
   + `replicateInputMapper.ts` (모델별 input 조립 — `ReplicateModelId` enum + 1:1 switch)
- `context/AuthContext.tsx`, 전역 레이아웃/globals
- **세션 중 추가**: `proxy.ts` (로그인 가드), `app/api/client-gateway/` (C2S→S2S),
  `app/api/user/[userId]/` (GET+PATCH, S2S+IDOR 가드), `public/logo/logo-64.png`,
   `lib/replicateRateLimit.ts`, `lib/colorUtils.ts`, `lib/textMeasure.ts`,
   `lib/imageResize.ts` (참조 다운스케일 — Generate 시점 긴 변 1024px),
   `lib/billing.ts` (기본 quota 50 + KST 월경계 — 무료/무이력 폴백용으로 유지),
   `lib/api/server/usageServerAPI.ts` (원장+부여+잔액),
   `lib/polar.ts` (상품 ID 매핑 — 진실원천, 코드 상수),
   `lib/polarClient.ts` (서버 전용 Polar 싱글톤 — 클라 import 금지),
   `lib/api/client/polarClientAPI.ts` (체크아웃 생성),
  `components/.../[projectId]/components/compositeDownload.tsx`,
  `components/.../[projectId]/components/DownloadMenuButton.tsx`,
   `app/api/creative/[creative-index]/design/` (에디터 저장 PATCH),
   `app/api/webhook/polar/` (Polar 구독 웹훅 리시버 — 서명 검증+grant 적립),
   `app/api/polar/checkouts/` (체크아웃 세션 생성 — body `{plan}`만),
   `app/checkout/success/` + `components/page/checkout/` (결제 성공 읽기전용 화면),
  `app/projects/[projectId]/edit/` + `components/.../edit/` (Remotion 에디터 일체:
  EditorPageClient, AssetTree, Inspector, FontPicker, EditorCanvas, AdStillComposition)
- **신규 의존성**: `@upstash/redis ^1.38.0`, `@upstash/ratelimit ^2.0.8`,
  `html-to-image ^1.11.13`, `jszip ^3.10.1`, `@types/jszip ^3.4.1`,
  `remotion 4.0.458` + `@remotion/player 4.0.458` (exact 고정, 공식 지침),
  `@polar-sh/sdk 0.49.0` (exact 고정, SDK beta라 pin 권고. 설치 확인.
  `npm install`이 caret로 바꾼 흔적 있어 exact로 복원함 — 재발 시 확인),
  `standardwebhooks ^1.1.1` (웹훅 서명 직접 검증용 — 아래 403 건)

## 3. 분리 시 적용한 변경

1. **Cloudflare 어댑터**: `internalFetch.ts`의 `@vercel/functions` waitUntil →
   `getCloudflareContext().ctx.waitUntil` + 로컬 폴백. `wrangler.jsonc` + `open-next.config.ts` 추가.
2. **next/font 전면 제거** (Cloudflare 빌드 불가: esbuild woff2 로더 없음, upstream 미해결):
   `lib/fonts.ts` 300줄 → 이름→CSS스택 매핑 60줄. 폰트 34종+Rajdhani+Geist Mono는
   CSS import 한 줄로.
3. **Users 타입 포크**: `VideoGenerationTasks`가 워크스페이스 에디터를 물고 들어와서 절단.
   `preferred_ai_model_config`는 로컬 `AdModelConfig`로 대체 (ad 트리에서 미사용 확인).
4. **URL 정리**: 페이지·API·웹훅의 `/ad` prefix 전부 제거. 구경로는 404.
5. **리브랜드**: 메타·헤더·푸터·지원메일(`support@tailoredad.com`)·다운로드명·LLM 프롬프트까지
   ShortReal 잔재 제거. OG 이미지는 shortreal.ai URL 그대로 (own 버킷으로 이전 예정).
6. **린트 전멸**: 복사해온 코드의 에러 18개 수정 (진짜 버그 1개 포함: PortfolioSection hooks).
   이후 재측정 반복. 최신 묶음은 푸시 후 `npm run lint` 재확인 필요.
7. **약관**: ShortReal 문서를 복사 후 브랜드명·URL·지원메일만 교체. **실체 조항 미검토**
   (특히 한국 금지 조항 — 유지 여부 결정 필요, 아래 체크리스트).
8. **웹폰트 link 로딩**: globals.css `@import`가 브라우저에 안 먹힘 (CSS 요청 0건 실측) →
   `layout.tsx` `<head>` link + preconnect로 이동. Next 16은 stylesheet link에
   `precedence="default"` 필수 (없으면 콘솔 에러 + 미적용).
   font CSS 3종(Fontshare 1 + Google 2)은 `crossOrigin="anonymous"` 추가 —
   html-to-image가 `cssRules` 직접 읽기 가능해져 SecurityError 오버레이 해소
   (양쪽 폰트 서버 CORS `*` 실측 확인. 폰트 임베딩·개행 parity 영향 없음).

## 4. 결정 사항

- **Supabase**: 새 프로젝트로 이전 완료 (short_real 공유 해제 — 사장님 직접.
  `users`·`ad_generation_batches`·RPC 3종·버킷(새 user_id 경로로 파일까지)·Auth 이전,
  `next.config.ts` 호스트 교체). realtime·RLS는 신프로젝트 기준 §6 확인 항목 유지.
- **이전 gotcha**: 옮긴 `subscription_grants`에 `reason` 체크제약이 따라와서 `trial` insert 거부됨.
  해소: 제약 삭제 후 `('trial','subscription','refund')`로 재생성. 향후 스키마 이전 시 체크제약 확인 필수.
- **사용량 과금 원장** (코드 완료·SQL/검증 대기): 단위=저장 확정 완성 이미지 1장 (실패·재시도 무료).
  `usage_ledger` append-only 1행=1장, 유니크 `(batch, creative, ratio)`로 중복 흡수.
  후킹점 `process/base`·`process/ratios` 업로드 성공 직후 (실패해도 유저 플로우 계속).
  balance 컬럼 안 씀 (레이스·중복 불가).
- **잔액제(이월) 확정** (코드 완료·SQL 실행됨·E2E 대기): 결제한 만큼 권리 부여, 미사용분 소멸 없음.
  `subscription_grants` append-only 1행=1사이클 부여, 유니크 `(구독, 사이클시작, 사유)`로 중복 흡수.
  환불은 음수 grant 행으로 회수 (부분환불도 해당 사이클 전액 회수 — 감사 로그로 추적).
  `remaining = 누적부여 − 누적사용`. 월 리셋 폐지 — KST 달력월 코드 삭제됨.
  주기는 구독 결제일 기준 (`users.subscription_current_period_start/end`, Polar 웹훅 동기화).
  진입 가드 `POST /api/image` 402 (잔액 소진 시) + 헤더 `N images left` 표시.
- **무료 정책 확정** (월 50 폐지): trial 10장 평생 1회, lazy 부여 (`getUsageStatus` 내,
  partial unique `(user_id) WHERE reason='trial'`로 동시호출 흡수). trial SQL 실행됨
  (`polar_subscription_id` nullable 포함). 잔액 0이면 하드게이트:
  402 + `/create` 업셀 모달 (`BalanceExhaustedError` 판별) + 헤더 Upgrade pill.
  trial 적립 실패는 fail-soft (잔액 0 + 로그, 조회 500 방지).
- **첫 유료 자동 할인** (Starter-only로 확정): 체크아웃 생성 시 **PLAN_1 + 유료 이력 없음**일 때만
  `discount_id` 자동 첨부 (`POLAR_FIRST_ORDER_DISCOUNT_ID` env, 없으면 정가 진행).
  코드 입력칸은 안 켬 (유출 원천 차단). API 실측 검증됨 (plan-1 첨부 50%/once/무코드,
  plan-2 제외, `external_id` 매핑 정상). Growth/Pro 첫결제에 붙이면 500 에러 나므로
  대시보드 Products 제한도 Starter만 유지할 것.
- **Pricing 정직 개편**: 존재하지 않는 플랜 차등(후보 개수·멀티레퍼런스) 삭제 —
  코드에 게이팅이 없어 티어 차이는 월 장수뿐. 취소선($49/$99, 실판매가 없음) 삭제,
  Most popular 배지 삭제 (데이터 생기면 복귀), "re-renders" 삭제 (미구현),
  사이즈 5종 명시, CTA `Choose {plan}`, trial 10장 안내 추가.
- **결제(Polar 확정, Dodo 탈락)**: Dodo는 한국 신분증이 Persona 인증에서 거부됨
  (허용 목록엔 KR 있으나 템플릿 미포함 — Dodo 설정 문제, 지원팀 메일 양식 전달됨).
  글로벌 타겟이라 카카오·네이버페이 강점도 무의미 + 수수료 동점(국제구독 실효 ~6%)이라 Polar로 런칭 확정.
  Dodo는 보류 (한국 고객 생기면 두 번째 결제사로 추가 가능).
- **Polar 현황**: 조직 Starter 요율 (5% + 50¢, 구독 추가요금 없음, 국제카드 +1.5% 별도).
  상품 3종 생성됨 — 전부 **샌드박스** (Starter $9/100장 `66953e34-…`,
  Growth $39/500장 `6d55ba76-…`, Pro $69/1000장 `b8d38860-…`, API 실측 확인).
  프로덕션 상품 미생성 — 생성 후 `POLAR_PRODUCT_BY_PLAN`에 기입 (현재 빈값). metadata `planId/imageLimit/isPopular`,
  Checkout Description 3종(이월 반영) 입력됨. OAT 최소 스코프
  (`checkouts:write`, `products:read`, `subscriptions:read`,
  `customers:read`, 만료 1년). 웹훅 수신 `POST /api/webhook/polar` 구현됨
  (서명 검증, active/cycled/updated→부여+동기화, canceled/revoked→잔액유지·플랜표시만 해제,
  order.refunded→회수). 구독 이벤트 6종 등록 필요
  (active/cycled/updated/canceled/revoked + order.refunded).
- **가정 → 확정** (번들 승인으로): 해지·만료 후 잔액 계속 사용 가능,
  다운그레이드 시 잔액 유지+다음 사이클부터 적은数 부여, 환불 시 해당 사이클 전액 회수.
  FAQ 2개(이월·해지)도 정책 문구로 정합화됨.
- **Hero CTA 4분기**: 비로그인→`/create`, trial+0→`/#pricing`, 로그인 그 외→`/projects`
  (plan 값으로 구독 판별). 헤더 표기는 `N images left` 확정 (이월제라 M/N 불가).
- **결제 확인 원칙**: `return_url` 읽기전용 + 웹훅 쓰기 (콜백 부여 금지).
  성공 페이지는 Realtime primary + 30초 타임아웃 폴백 (폴링 기각).
- **돈문 위치**: 구독 게이트 없음 (`proxy`·gateway는 로그인만). 402+업셀이 유일한 돈문.
- **Polar 환경 분리**: `NODE_ENV` 기준 자동 (`dev`=sandbox, `build/start`=production).
  상품 ID도 환경별 매핑 (`POLAR_PRODUCT_BY_PLAN`/`POLAR_SANDBOX_PRODUCT_BY_PLAN`,
  샌드박스 ID는 대시보드 생성 후 기입 대기). dev env는 샌드박스 OAT+시크릿,
  prod는 프로덕션 OAT+시크릿 (키·조직 불일치 시 401 `invalid_token`).
- **웹훅 403 해결** (09-16): 원인 = Polar SDK 0.49.0이 시크릿 전체를 base64 재인코딩.
  09-08 이후 `whsec_` 시크릿과 충돌 → 값 맞아도 확정 403. 문서는 `polar_whs_` 날것 전제라 서로 모순.
  수정: 수신부에서 `standardwebhooks` 직접 검증 (`whsec_` 통째로). 로컬 왕복 테스트 통과,
  실전 200 확인 (receiver→process 연쇄). 체크아웃 SDK 호출은 그대로.
- **웹훅 수신/처리 분리**: `/api/webhook/polar` (검증→전달→즉시 200) + `/api/polar/process`
  (S2S 전용 핸들러). Replicate 리시버와 동일 계약.
- **successUrl 환경 분기**: prod → `BASE_URL`, dev → `localhost:3000` (세션 오리진 일치용).
- **성공 페이지 Auth 초기화 게이트**: 세션 복원 전 Sign in 오판 수정.
- **next.config allowedDevOrigins**: ngrok 호스트 env 파생 허용 (dev HMR 경고 해소, 재시작 필요).
- **Pricing 추가 정리**: 에디터 줄 삭제→FAQ 이전 (`Does editing cost images?`),
  `roll over`→`never expire`, 강조 메커니즘 삭제 (3장 동일 카드),
  첫달가 표시 (~~$9~~ $4.50 + 플랜명 옆 뱃지 + `then $9/mo`), em dash 제거.
- **CTA 렌더 개선** (`AdOverlay`): 헤드라인 hug (`fit-content`+maxWidth 캡),
  알약 hug (em 패딩+nowrap, 바깥 틀 안 중앙 정렬), 행간 명시 (상속 variance 차단),
  에디터 토글 시 헤드라인 아래 자동 배치 (맹목 x8/y80 삭제).
- **CTA 색 enum 미착수**: 글자/배경 `white|black` 추출 제안됨, border·패딩값은 기각 (em 공식).
  프롬프트 Unit 2 + 스키마 + 타입 + 렌더 + Inspector 손봐야 함.
- **크리에이티브 프롬프트 3-way 분리** (단일 파일, 통짜 3벌):
  `PRODUCT_ONLY` / `PERSON_ONLY` / `POST_AD_CREATIVE_PROMPT`(combined) +
  호출부 인라인 선택 (헬퍼 삭제, 중복 소스 제거). 순수 규칙: 상대 input 언급 전면 제거
  (앵커·노트·예시 포함, 축 테이블은 공유 유지). 관계 어휘 4종
  (holding/wearing/using/beside) + 카메라 중재 규칙. Few-shot 13개
  (5/4/4, 단어 수·seed 일관성 검증済み). 출력 스키마 동일이라 파서·DB 무영향.
  별도 결함 수정 포함: logo 서수 하드코딩→order list 참조, Ex2 verbatim 교정.
- **모드 정합硬化** (의도: 모드별 입력 선확정):
  `MODE_EXCLUDED_VALUES` 테이블 (product-only: lifestyle_shot·product_in_hand·lifestyle_narrative 제외,
  person-only: packshot 제외, combined: hero·lifestyle·product_in_hand·environment만 허용) +
  `assignCreativeCombinations(..., mode?)` + `specs/route`에서 batch 이미지로 mode 전달.
  반대쪽 노트는 태그째 미전송. PERSON_ONLY Unit 1 person 주어 개역 (packshot은 "미배정" 명시).
  고정 풀 나열은 유지 (샘플러와 이중 관리 방지).
- **카피·인물 재생성 규칙** (09-17): CTA 수학 선택 폐기 → 헤드라인 프레임워크 페어링표
  (PAS→See Results/Try Today, BAB→See Results/Start Free, 4U→Shop/Get Yours,
  AIDA→Learn More, Social→See Results/Shop Now, Mechanism→Learn More/Try Today).
  인물은 얼굴 유지 + 포즈·표정·의상·장신구 새로 (원본 그대로 금지),
  구체 묘사 강제 ("같은 여자"식 참조형 금지). 포즈 동일 제약 4곳을 얼굴 동일로 교정.
  단, REDRAWN 규칙이 실측 미준수 (sage tee 베낌) — 강제 장치 없이 선언만 있음.
- **크리에이티브 프롬프트 컴포지션** (09-18, 1순위): 통짜 3벌 → BASE_TEMPLATE 1개 +
  모드 섹션 3종 + `buildPrompt` 조립. 차별점 25종 플레이스홀더
  (INPUT·카메라·조명·프레이밍·팔레트·문장구조·예시·REDRAWN·노트·게이트 등).
  3개 export 바이트 동일 검증済み (esbuild 번들 비교). `{{GRAMMAR}}`는 2순위 자리 (빈 문자열).
  호출부 무변경. 2순위: base/ratio 문법 섹션 + softbox 금지 + levitating 삭제 + 태그 정의·치환.
- **프롬프트 전수 감사 잔량**: Ex2 PRODUCT 캡션 35단어 (18~32 위반) — 예시가 규칙 깸, 수정 대기.
  seed 모듈러(`%6`·`%N`)는 실행 불가 판정 (결정적 선택인 척, 실제 랜덤).
  예시 모방 금지 가드 없음. `ad_variation_study.md` 파일 없음 (인용만).
  PRODUCT 16:9 예시 없음, 전 변형 2:3 예시 없음.
- **레거시 정리**: `adClientAPI.ts`·`adServerAPI.ts`(mock)·`/api/tasks` 2종·results 4파일 삭제.
  실사용 타입은 `AdGenerationBatch.ts`로, `AdOverlay`는 `components/public/`으로 이전 (import 20곳 교체).
  `AdTaskStatus`는 별칭으로 유지 (PreviewCanvas 사용).
- **타일 vs 라이트박스 CTA 분쟁 중**: 모달은 공식 일치 실측됨. 타일 측정값이 CSS 산수와
  모순 (em 기준·폰트 혼재) → 노드 혼동 유력. 안쪽 알약 단독 재측정 대기 중.
- **관측 메모**: `external_id` null로 옴 (metadata fallback으로 커버, 코드 수정 없음).
  테스트 잔액 부풀음 (subscription 100×3 + trial 10 — E2E 전 테스트 계정 정리 필요).
  endpoint 10연속 실패 시 자동 비활성화 — 대시보드 확인 필수.
  checkout 200 ≠ grant (성공 페이지는 읽기전용).
- **Supabase 신 API 키로 전환**: `*_ANON_KEY` → `*_PUBLISHABLE_KEY`,
  `SERVICE_ROLE` → `SECRET` (코드 5파일 7곳 교체 완료, 구이름 잔재 0).
  `.env.local`에 신구 공존 중, 동작 확인 후 구이름은 사장님이 직접 삭제.
  신형이 구형과 권한·RLS·Auth 동일 + 코드에 JWT 파싱 없음 확인済み.
  레거시는 2026년 말 삭제 예정이라 신형으로 직행 (SDK 2.115 호환).
- **Polar 체크아웃 구현 완료** (설계→구현): `POST /api/polar/checkouts`
  (S2S 가드, body는 `{plan}`만 → 서버가 `POLAR_PRODUCT_BY_PLAN` 매핑,
  userId는 gateway 주입값 사용) + `polarClientAPI.createCheckout` +
  PricingSection 버튼 배선 (mailto 제거, 비로그인 → `/sign-in?redirectTo=/#pricing`).
  `externalCustomerId` + `metadata.userId` 이중 기록 (웹훅 매칭용).
  성공 페이지 `/checkout/success` (Realtime+폴백). orders/구독변경/취소는 MVP 제외.
- **데모 이미지**: short_real preview 9종 복사했다가 전량 삭제. 도그푸딩(실생성물)으로 채울 예정.
- **shortreal.ai/ad**: 런칭 당일 301 → tailoredad.com 후 은퇴.
- **랜딩 로그인 진입**: 서버 리다이렉트(/→/projects) 대신 헤더 조건부 UI (비로그인: Sign in + Start creating / 로그인: Open studio). 마케팅+제품 단일도메인 표준.
- **DetailPage 갱신**: 4초 폴링 삭제. Realtime 구독 + 수동 Refresh만. (끊김 체감 시 탭 복귀 재조회로 대응 예정)
- **Detail 선택 개념 삭제**: 하단 선택바 제거 (10개 줄에서 도달 불가). 타일 클릭→확대경, 진입은 헤더 Editor + 모달 Edit + 카드 연필.
- **Replicate 429**: 공식 한도 600/분. Upstash slidingWindow 500/60s + 최대 10초 홀딩 + 429 백오프(Retry-After 존중, 상한 10초, 2회). Redis 장애·키 없음은 fail-open. Upstash Free 시작 → 월 40만 명령 전후로 PAYG (전환 시 budget cap $5).
- **FLUX.2 Dev 전환** (09-18): 이미지 생성 모델 Nano Banana → FLUX.2 Dev 단일화
  (base/ratios 호출부 교체). 고아 enum·`model` 파라미터·도달불가 분기 제거,
  상수 1곳(`FLUX_IMAGE_MODEL`)으로 고정. 프롬프트의 모델 언급·% 금지 문구도 정합화.
- **go_fast=false 고정** (09-18): FLUX_2_DEV 제출에 `go_fast: false` 명시 (regular $0.014/MP).
  true($0.012)는 별도 최적화 경로라 품질 불확실 → 최종 품질 우선. 장당 차이 $0.006 수준이라 비용 논외.
  `buildModelInput()` 1곳이라 base·ratios 일괄 적용.
- **생성·업로드 단일 요청 합치기** (09-18): `POST /api/image`가 multipart 1요청으로
  주문+원본을 함께 받음 (검증→batch 생성→Storage 업로드→specs 체이닝, 한 함수 내 순차).
  원인: batch 생성과 업로드가 별도 요청이라 prompt가 파일 도착 전에 조회해 "Object not found"
  (오늘 imageResize로 업로드가 느려지며 역전 실측). 구 images route 삭제.
  실제 저장 확장자(MIME 기준)로 DB 기록 정정해 경로 일치도 보장. 고아 batch도 해소
  (검증 실패 시 batch 자체 미생성).
- **원본 이미지 다운스케일** (09-18): Generate 클릭 시점에 긴 변 1024px로 축소 후 업로드
  (미리보기는 원본 유지, 실제 전송만 축소). 근거: Gemini 768 타일·Flux 입력 1MP 상한·
  Replicate 입력 $0.014/MP (3000×1200 1장이 입력비 $0.05→$0.006).
  신규 `lib/imageResize.ts` (canvas, 의존성 없음, 원 포맷 유지, 실패 시 원본).
  UploadZone은 미수정, 서버(Workers CPU 10ms) 처리는 불가라 클라 전용.
- **재시도 상한 버그 수정**: 웹훅이 `attempt`를 process에 안 넘겨 무한 재시도 가능했음 → 전달 추가.
- **다운로드 어휘 통일**: 합성본 `Final` / 원본 `Original` (광고업계 표준어 확인). 파일명 `tailored-ad-{id6}-c01-4_5.png` + 원본 `-raw` 접미 (배치 구별로 id6 포함. ZIP도 동일 체계 `-all`/`-originals`/`-c01`). 스플릿 버튼(`DownloadMenuButton`)으로 통합 — 헤더 벌크(ZIP) + 모달 낱장. 타일 호버·줄 pill은 합성 전용 유지. sparkles 아이콘 사용 안 함 (AI 클리셰).
- **Detail 정렬**: best(기본) / avg(완성분 평균, 분모 `n/m` 병기) / index 드롭다운. running 중·점수 없음은 비활성. 행에 `best X · avg Y (n/m)` 병기.
- **랜딩 카피 de-AI** (Pricing 제외 6파일): em dash 연결 12곳 → 마침표,
  Portfolio 헤드라인 의미 버그 수정, FAQ 답변 2단락 구조화, 뱃지·푸터 링크 수정.
- **에디터 커스텀 컬러 확정**: live-apply 유지 (패널 문법 일치). 커스텀 패널에 `Done` 버튼(닫기=확정) + 피펫 버튼에 선택색 도트. 스냅샷-취소 불필요 판정 (되돌리기는 스와치 1클릭 + Save 게이트로 충분).
- **브랜드 표기 통일**: `TailorAd` → `TailoredAd` (문자열 전수 치환, 사장님 직접. 코드 식별자·동작 영향 없음, lint 무결함 확인).
- **다운로드 엔진**: DOM 스냅샷(html-to-image) — 타일·모달·다운로드·에디터 4곳 픽셀 동일 보장. ZIP(전체/줄단위/원본)은 jszip 클라 처리. 서버 ZIP 안 함 (Workers CPU 한도).
- **에디터**: `/projects/[id]/edit?creative=&ratio=` deep-link 계약. 좌측 트리(creative→비율, 완성만) + 중앙 Remotion Player(1프레임 스틸, AdOverlay 공유로 parity) + 우측 조절판. 진입 1회 후 내부 이동 (Detail 왕복 없음). Remotion 라이선스: 1인 무료 해당, Player 미리보기는 renders 과금 아님. 팀 3인 초과 시 Company 라이선스 논의.
- **에디터 편집 범위 v1**: 헤드라인(문구·XY·너비·크기·정렬·폰트·웨이트·색) + CTA(문구·위치·크기·on/off, copy 동기화) + scrim 토글/농도 + 드래그 이동(헤드라인·CTA, 클램프). 로고 읽기전용. copy.headline은 creative 공용이라 전 비율 함께 바뀜 (仕様).
- **에디터 저장**: `PATCH /api/creative/[i]/design` — S2S + 본인소유 + 완성 후만(409 가드). running 배치 경합 방지.
- **headlineColor 자유 hex**: LLM은 white/black 그대로 출력, 저장 시 hex 통일, 렌더 시 정규화. scrim 방향은 휘도로 판정. popover 대신 인라인 펼침 + 브랜드 팔레트 스워치.
- **scrim**: 글자 뒤 밴드 (하단 고정 폐기, 박스폭 + 좌우 페이드). 농도 Bright 40 / Dark 65 (에디터 슬라이더로 변경 가능). 에디터 진입 시 LLM값 그대로 시작 (off 시작안 폐기).
- **Cloudflare Free로 시작, Paid($5/월)는 트래픽 보고 전환**: Free 제한 실측 정리 — CPU 10ms(홀딩은 CPU 안 먹어서 무관), 서브리퀘스트 50/요청(가장 먼저 걸릴 후보), waitUntil 응답 후 30초, 요청 10만/일.
- **Replicate 계정**: auto-reload 설정됨. 잔액·결제수단은 사장님 관리.
- **폰트 셀프호스팅 보류**: public 레포 + GitKraken 무료 제약. Google 34종은 OFL로 가능하나 Satoshi(ITF)가 public 재배포 금지. B안(Google만)도 대기 중 — 폰트 이슈 재발 시 재개. link 이전으로 우선 해결.
- **이미지 모델 Seedream 하이브리드** (09-18/19): FLUX.2 Dev 교체 — MP 과금 실측
  base $0.04/ratio $0.06이라 정액제로 전환. 5.0 Lite($0.035, Replicate `bytedance/seedream-5-lite`)
  기본 + 배치에 4_5 포함 시 통째로 4.5($0.04, `bytedance/seedream-4.5`)
  (`selectImageModel`, 비율 단위 분기 금지 — 같은 creative 내 모델 혼재 방지).
  5.0 지원 비율: 1:1·4:3·3:4·16:9·9:16·3:2·2:3·21:9 (4:5 없음 — 하이브리드 이유).
  공통 input {prompt, image_input, size 2K, aspect_ratio} + 5.0만 output_format png +
  4.5만 disable_safety_checker=false. seed는 양쪽 스키마 미지원이라 미전송, 배선만 유지.
  PoC 실측: 5.0 기가 막힘 / 4.5 인물 흑백 이슈 (원인 "charcoal" 단어 유력 — 아래 Full-color 규칙으로 대응).
- **base 집중 + ratios 간섭 최소화** (09-19, 1차 완료):
  base 1장에 올인 (플레이스홀더 완벽 적용 base 프롬프트로 생성)하고,
  ratios는 base 결과물 1장만 받아 고정 문구로 재구성. LLM 개입 없음, 원본 보조 없음.
  근거: (1) 비율은 `aspect_ratio` 파라미터가 강제하므로 LLM 구도 설계는 중복.
  (2) "전부 동일" 원칙 — base 멀쩡+ratio 개판보다 전부 동일하게 망하는 게 낫다.
  유저 UX: 일부만 망하면 개별 재생성 지옥(기능 없음), 전부 동일하면 다시 돌리기 1번.
  고정 문구 (`{ratio}`는 1:1식 실제 표기):
  `Reframe image_input[0] into a {ratio} still-advertisement composition. Preserve its identity, palette, and lighting exactly. Rearrange framing and negative space for the new canvas, keeping clean room for headline text.`
  ratios route 정리 — 직통 모드 삭제, 뒤따름·재시도 고정 문구,
  base 실패 시 파생 전원 error 스킵 (원본 폴백 삭제 — FLUX 시절 fail-soft 잔재),
  참조 base-only (재시도 중 base 자체 재시도만 원본 예외), 재시도 caption 검증 삭제.
  `replicateInputMapper.ts` 신규 (`ReplicateModelId` enum + 1:1 switch 통짜 반환, default throw) —
  ReplicateClient는 제출 전담으로 축소, seed 배선 제거 (스키마 미지원).
  잔량: 파이프라인 정합 3곳 (prompt 항상 base · process 1장 스킵 · 실패 폴백 ratioKey) —
  미완이면 1장 배치가 ratios 뒤따름에서 400 ("No remaining ratios").
  LLM 프롬프트 base-only 갈기 (image_prompt_record base 1장 · reframe 삭제 · Unit 2 대수술,
  ratio_reasonings 처리 · 구 배치 폴백 · llmServerAPI 정리 포함).
- **프롬프트 컴포지션 + 태그·스키마 분리** (09-18/19):
  통짜 3벌 → BASE_TEMPLATE + 모드 섹션 + `buildPrompt` 조립 (바이트 동일 검증済み).
  이미지 태그 3종 (PRODUCT_IMAGE / PERSON_IMAGE / BASE_IMAGE) — GLM은 순서 몰라도 됨,
  전송 직전 코드가 image_input[n]으로 치환 (`resolveImageInputTags`, 미지정·오타는 throw).
  스키마: `baseRatio` + `ratioReframeRecord`(base 제외) 추가, 신규 RPC `update_creative_reframe_outputs`
  (기존 형식 맞춤, 실행됨). 단, ratios 고정 문구로 가면서 LLM ratio 발주는 단계적 축소 예정.
  2순위 잔량: softbox 기구명사 금지, levitating→grounded, Full-color 강제
  (`Full-color photograph, natural skin tones — NEVER monochrome unless palette=mono`),
  Note 복장 강제, C 단위 LLM 2회 분리 (base·ratio mutual blind) 후보.
- **모바일 분리 전제**: 공유 파일에 반응형 추가 금지 (split 때 삭제 대상). 모바일은 현상 동결, 백로그만 기록. UA 감지 → `(mobile)` 라우트 그룹 후보.

## 5. 렌더 계약 (에디터 작업 전 필독)

- `fontSizePct` = **canvas HEIGHT의 %**, `x/maxWidth/widthPct` = WIDTH의 % (analysis 프롬프트 3곳 명시).
- `AdOverlay`가 참조 구현: 높이 기준 글자 크기, 웹폰트 로드 게이트(FOUT 시 개행 엇갈림 방지), 드래그 지원 prop (프리뷰 미전달).
- 타일·모달·다운로드 PNG·에디터 캔버스 4곳 일치 검증됨 ("…dress / it" 케이스).
- 기존 배치는 마이그레이션 불필요 (% 값이라 재해석만 됨. 다만 크기가 의도대로 바뀌어 보임).
- logo `cqh` 버그 수정됨 (뷰포트 폴백 → 이미지 높이 px 계산).
- scrimStrength(0-100, 에디터 전용 확장, 미지정 시 65/40 기본값).

## 6. 런칭 체크리스트

- [ ] 실생성 이미지 6~8장 → 랜딩 PortfolioSection에 박기 (스테이징에서 생성 → 버킷에서 회수)
- [ ] `support@tailoredad.com` (+`contact@`) Email Routing (tailoredad.com 도메인에서 별도 설정)
- [ ] Polar 과금 연결 (블로커 — 진행 중):
  - [x] 상품 3종 + metadata + Checkout Description
  - [x] `lib/polar.ts` 매핑표, 웹훅 리시버, 잔액제 코드
  - [x] Supabase SQL 2종 + users 주기 컬럼 + trial SQL (실행됨)
  - [x] `npm install` (`@polar-sh/sdk` 0.49.0 설치 확인)
  - [x] Polar 대시보드 웹훅 등록 (ngrok URL + `/api/webhook/polar`, raw, 이벤트 6종, API 버전 2026-04) +
    `POLAR_WEBHOOK_SECRET` 입력됨
  - [x] 체크아웃 생성 API + 요금제 버튼 배선 + 성공 페이지
  - [x] 코드 없는 discount 생성 + `POLAR_FIRST_ORDER_DISCOUNT_ID` 입력 + API 실측 검증
    (50%/once/무코드, Starter 첨부·Growth 제외, duration=Once 확인됨)
  - [ ] E2E 테스트 (결제 → grant → 잔액 표시 → 생성 → 차감 → 환불 회수)
  - [ ] Cloudflare Secrets에 `POLAR_API_KEY`·`POLAR_WEBHOOK_SECRET`·`POLAR_FIRST_ORDER_DISCOUNT_ID` 등록 (배포 때)
- [ ] 약관 실체 검토 (한국 조항 유지 여부 포함)
- [ ] `tailorad.com` 구매 + 리다이렉트
- [ ] `shortreal.ai/ad` → 301 (런칭 당일)
- [ ] `tailoredad.com` DNS 연결 (이미지 준비되면)
- [ ] Search Console 등록 (런칭 후)
- [ ] Supabase 대시보드 확인 (사장님): realtime publication에 `ad_generation_batches` 포함 여부 + RLS SELECT 자가행 허용 여부 (REST는 service_role이라 되고 live만 안 올 수 있음)
- [ ] Cloudflare Secrets에 `UPSTASH_REDIS_REST_URL`/`TOKEN` 등록 (프로덕션)
- [ ] 카피 품질: LLM 헤드라인 문법 어색 건 ("dress for it") — 프롬프트에 원어민 검수 지시 추가 예정
  - [ ] `npm run lint` 재확인 (최신 묶음 푸시 후).
    참고: AppHeader setState-in-effect error 1건 pre-existing
    (사용량 표시 커밋분. env rename과 무관 — stash 대조 확인, 미착수)

## 7. 다음 작업

- [x] 에디터에서 다운로드 (탑바 Download, 현재 캔버스 스냅샷 — 완료)
- [x] 실사용량 표시 (원장+헤더 실측 — 코드 완료, **대시보드 SQL 실행 + 생성 테스트 검증 대기**)
- [x] 잔액제·Polar 웹훅 코드 (완료, E2E 중 생성→차감→환불 남음)
- [x] 체크아웃 생성 API + 요금제 버튼 배선 + 성공 페이지
- [x] Trial 10장 + 하드게이트 + Hero CTA + 로딩 오버레이
- [x] 웹훅 403 해결 + 수신/처리 분리 (E2E grant 적립 확인)
- [x] 생성·업로드 단일 요청 합치기 (multipart 1요청 — 완료, 푸시됨)
- [x] Seedream 하이브리드 (5.0 Lite + 4.5 — 코드·SQL 완료, 푸시됨)
- [x] 프롬프트 컴포지션 1순위 (구조만 — 바이트 동일 검증, 푸시됨)
- [x] 태그 정의·치환 + 스키마 분리 + reframe RPC (코드·SQL 완료)
- [x] ratios route 재설계 1차 (고정 문구·폴백 삭제·base-only·매퍼 분리 — 완료)
- [ ] 파이프라인 정합 3곳 (1순위 — 1장 배치 400 버그: prompt 항상 base · process 1장 스킵 · 실패 폴백 ratioKey)
- [ ] LLM 프롬프트 base-only 갈기 (image_prompt_record base 1장 · reframe 삭제 · Unit 2 대수술)
- [ ] E2E 테스트 (생성→차감→환불 회수, 테스트 계정 정리 후)
- [ ] 2순위 내용 작업: softbox 기구명사 금지 + levitating→grounded + Full-color 강제 + Note 복장 강제
- [ ] C 단위 LLM 2회 분리 검토 (base·ratio mutual blind — 재구성 품질 보고 결정)
- [ ] 프롬프트 eyeball (Seedream 기준 — FLUX 시절 항목 대체)
- [ ] B9 c01-1:1 실패분 재생성 + 19칸 선정 매핑 + `public/preview` 배치
- [ ] 타일 CTA 재측정 판정 (위 분쟁 항목)
- [ ] CTA 색 enum 추출 (제안됨, 미확정)
- [ ] 낱장 Regenerate (실패 타일 살리기 + 재추첨. 뒷단 재제출 경로 존재, UI 배선만 — 제안됨, 미확정)
- [ ] 브랜드 킷 (로고·팔레트·폰트·CTA 유저 저장 + 생성 프리필 — 제안됨, 미확정)
- [ ] [imageResize] 실측 확인 (사장님): 큰 이미지로 Generate → 콘솔 `[imageResize]` 로그 + 전송본 치수
- [ ] 모바일 분리: 공유 파일에 반응형 추가 금지 (split 때 삭제 대상). 모바일은 현상 동결.
  분리 시 백로그 — Detail 본문 gutter, 타일 호버 아이콘, 에디터 슬라이더 터치 높이.
  방식 후보: UA 감지 → `(mobile)` 라우트 그룹 (URL 유지, JSX만 교체).
  이전 자산: lib/API/유틸(`compositeDownload`, `colorUtils`, 저장 API, `AdOverlay`)은 화면 무관이라 그대로 이전.
- 이후 후보: CTA 위치 프리셋, 로고 편집, 텍스트 효과(outline/glow — 논의됨, 보류).

## 8. 명령어

```bash
npm run dev      # 3000 (클라)
docker compose up --build  # 3001 (서버, 컨테이너 3000 매핑). 패키지 변경 시 --build 필수
npm run build
npm run lint
npm run deploy   # opennext build + deploy (master에서)
```

## 9. 대시보드 작업 메모

- Cloudflare Variables/Secrets: `NEXT_PUBLIC_*` 3개는 Variable, 나머지 전부 Secret
  (`SUPABASE_SERVICE_ROLE_KEY`, `REPLICATE_API_TOKEN`, `OPENROUTER_API_KEY`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 등).
- `NEXT_PUBLIC_*`은 빌드타임에 박히므로 변수 변경 후 리빌드 필수.
- Supabase Redirect URLs에 workers.dev + 실도메인 등록 (구글 로그인용).
- Upstash: `tailored-ad-ratelimit` (AWS 도쿄, Free, eviction ON). 월 명령어 40만 전후로 PAYG 전환 + budget cap.
- dev `BASE_URL`은 ngrok 주소 경유 (ngrok 꺼지면 self-fetch DOCTYPE 500 — ngrok 켜둘 것).
- Polar: OAT는 생성 시 1회만 표시 (분실 시 폐기 후 재생성). PC·환경별 토큰 분리 권장.
  웹훅 endpoint는 대시보드 등록 (dev는 ngrok URL + `/api/webhook/polar`, raw, 2026-04).
  `.env.local` 필요 키: `POLAR_API_KEY` + `POLAR_WEBHOOK_SECRET` +
  `POLAR_FIRST_ORDER_DISCOUNT_ID` (사장님이 직접 입력, 채팅 금지).

## 10. 랜딩 실생성 배치 기록 (09-18, 41장 수령)

- 소스: S1 텀블러(네이비 무지), S2 스니커즈(화이트), S3 향수(블랙 무각인),
  S4 머그(무광), M1 여성(린넨), M2 남성1(수염), M3 남성2(숏헤어 네온).
  탈락 소스: MIZU·나이키·랄리크(브랜드 마크), S1-1 목업(자이언트 타이포 전이 위험).

| 폴더 | 배치id | 모드 | 비율 | c수 | CTA | 결과 |
|---|---|---|---|---|---|---|
| batch-1 | 821c37 | product(병) | 1:1,4:5,16:9 | c2 | on | 6장 OK |
| batch-2 | 18a520 | product(스니커즈) | 1:1,4:5,9:16 | c2 | on | 6장 OK |
| batch-3 | 1b13d1 | product(향수) | 1:1 | c2 | off | 2장 OK |
| batch-4 | 803a2b | product(머그) | 1:1,4:5 | c2(계획 c1 초과) | off | 4장 OK |
| batch-5 | d76e60 | person(여성) | 9:16,4:5,1:1 | c2 | on | 6장 OK |
| batch-6 | 976fde | person(남성1) | 9:16,1:1,4:5 | c2(계획 c1 초과) | on | 6장 OK |
| batch-7 | 83c7fc | person(남성2) | 9:16,4:5 | c2(계획 c1 초과) | off | 4장 OK |
| batch-8 | 5434bd | combined(향수+남성1) | 1:1,9:16 | c2(계획 c1 초과) | off(계획 on과 다름) | 4장 OK |
| batch-9 | 8f0087 | combined(병+여성) | 1:1,9:16 | c2(계획 c1 초과) | off(계획 on과 다름) | c01-1:1 Replicate failed 1장 결손, 3장 OK |

- 품질 킬 5장 (랜딩 부적격): 목 없는 남자 머리 2장, 나이키 손 1장, ALL CAPS 2장.
- 원인 분석 (rows JSON): 인물 원본 유지 = 포즈동일 규칙 탓 (위 얼굴유지 리스타일로 수정됨).
  결합 인물 탈락 = flat_lay·overhead 배정 탓 (allowlist로 수정됨).
  CTA Get Yours 독식 = 선택기 부재 탓 (페어링표로 수정됨).
- 슬롯 계획: Portfolio 1:1×4·9:16×3·4:5×3·16:9×1 + Hero 8칸(4:5 크롭, 원본 무관).
  파일은 Final PNG → WebP 변환 후 기존 파일명 매핑 (코드 무수정).
- **다음**: B9 c01-1:1 실패분 재생성 → 19칸 선정 매핑 → 배치.

(End of file)
