# TailorAd — 작업 기록 (Last Updated: 2026-09-11 19:30)

> short_real의 `/ad`(AI 스틸 광고)를 독립 앱·독립 브랜드로 분리한 프로젝트.
> 포트폴리오(jaeholee.xyz) 관련 내용은 제외.

## 1. 개요

- **브랜드**: TailorAd — "Tailored ads, not templates" (Harnessed AI ad studio)
- **도메인**: `tailoredad.com` 구매됨. DNS 연결은 실생성 이미지 준비될 때까지 홀딩.
- **짝꿍 도메인**: `tailorad.com` 미구매. 살 때 같이 사서 리다이렉트 예정.
- **스택**: Next.js 16 + Tailwind v4 + Supabase + Replicate/OpenRouter + Upstash Redis + Remotion Player, Cloudflare Workers 배포(OpenNext)
- **Git**: Git Flow (`master` 프로덕션 / `develop` 작업). develop 적재, master 미반영, 푸시 안 함.
  - `e864f34` [Feature] [로그인 플로우 복구 및 진입점]
  - `580673c` [Refactor] [프로젝트 상세 화면 안정화]
  - `d7e2449` [Feature] [Replicate 제출 스로틀 추가]
  - `701bf17` [Refactor] [광고 오버레이 렌더 통일]
  - `bb2c823` [Update] [context.md 작업 기록 갱신]
  - `df7af93` [Feature] [Download all ZIP]
  - `[Feature] [Remotion 에디터 추가]` (이번 묶음)
  - `[Refactor] [에디터 드래그·색상·scrim 확장]` (이번 묶음)
  - `[Fix] [웹폰트 link 로딩으로 변경]` (이번 묶음)
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
- `context/AuthContext.tsx`, 전역 레이아웃/globals
- **세션 중 추가**: `proxy.ts` (로그인 가드), `app/api/client-gateway/` (C2S→S2S),
  `app/api/user/[userId]/` (GET+PATCH, S2S+IDOR 가드), `public/logo/logo-64.png`,
  `lib/replicateRateLimit.ts`, `lib/colorUtils.ts`, `lib/textMeasure.ts`,
  `components/.../[projectId]/components/compositeDownload.tsx`,
  `app/api/creative/[creative-index]/design/` (에디터 저장 PATCH),
  `app/projects/[projectId]/edit/` + `components/.../edit/` (Remotion 에디터 일체)
- **신규 의존성**: `@upstash/redis ^1.38.0`, `@upstash/ratelimit ^2.0.8`,
  `html-to-image ^1.11.13`, `jszip ^3.10.1`, `@types/jszip ^3.4.1`,
  `remotion 4.0.458` + `@remotion/player 4.0.458` (exact 고정, 공식 지침)

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
   이후 재측정 반복, 현재 0 errors (warnings 10 기존 잔재 — 다음 lint에서 재확인).
7. **약관**: ShortReal 문서를 복사 후 브랜드명·URL·지원메일만 교체. **실체 조항 미검토**
   (특히 한국 금지 조항 — 유지 여부 결정 필요, 아래 체크리스트).
8. **웹폰트 link 로딩**: globals.css `@import`가 브라우저에 안 먹힘 (CSS 요청 0건 실측) →
   `layout.tsx` `<head>` link + preconnect로 이동. Next 16은 stylesheet link에
   `precedence="default"` 필수 (없으면 콘솔 에러 + 미적용).

## 4. 결정 사항

- **Supabase**: 신규가 아니라 ShortReal 프로젝트 공유 (비용). 테이블은 `ad_generation_batches` 전용,
  버킷은 `ad_image_storage` 전용으로 이미 분리됨. `users` 공유 = 로그인 통합 (크로스셀 보너스).
- **결제(Polar)**: ad 코드에 과금 wiring 없음. 런칭 전 붙여야 함 (블로커).
- **데모 이미지**: short_real preview 9종 복사했다가 전량 삭제. 도그푸딩(실생성물)으로 채울 예정.
- **shortreal.ai/ad**: 런칭 당일 301 → tailoredad.com 후 은퇴.
- **랜딩 로그인 진입**: 서버 리다이렉트(/→/projects) 대신 헤더 조건부 UI (비로그인: Sign in + Start creating / 로그인: Open studio). 마케팅+제품 단일도메인 표준.
- **DetailPage 갱신**: 4초 폴링 삭제. Realtime 구독 + 수동 Refresh만. (끊김 체감 시 탭 복귀 재조회로 대응 예정)
- **Detail 선택 개념 삭제**: 하단 선택바 제거 (10개 줄에서 도달 불가). 타일 클릭→확대경, 진입은 헤더 Editor + 모달 Edit + 카드 연필.
- **Replicate 429**: 공식 한도 600/분. Upstash slidingWindow 500/60s + 최대 10초 홀딩 + 429 백오프(Retry-After 존중, 상한 10초, 2회). Redis 장애·키 없음은 fail-open. Upstash Free 시작 → 월 40만 명령 전후로 PAYG (전환 시 budget cap $5).
- **재시도 상한 버그 수정**: 웹훅이 `attempt`를 process에 안 넘겨 무한 재시도 가능했음 → 전달 추가.
- **다운로드**: DOM 스냅샷(html-to-image)으로 통일 — 타일·모달·다운로드 3곳 픽셀 동일 보장. 파일명 `tailorad-c01-4_5.png` 1종. ZIP(전체/줄단위)은 jszip 클라 처리. 서버 ZIP 안 함 (Workers CPU 한도).
- **에디터**: `/projects/[id]/edit?creative=&ratio=` deep-link 계약. 좌측 트리(creative→비율, 완성만) + 중앙 Remotion Player(1프레임 스틸, AdOverlay 공유로 parity) + 우측 조절판. 진입 1회 후 내부 이동 (Detail 왕복 없음). Remotion 라이선스: 1인 무료 해당, Player 미리보기는 renders 과금 아님. 팀 3인 초과 시 Company 라이선스 논의.
- **에디터 편집 범위 v1**: 헤드라인(문구·XY·너비·크기·정렬·폰트·웨이트·색) + CTA(문구·위치·크기·on/off, copy 동기화) + scrim 토글/농도 + 드래그 이동(헤드라인·CTA, 클램프). 로고 읽기전용. copy.headline은 creative 공용이라 전 비율 함께 바뀜 (仕様).
- **에디터 저장**: `PATCH /api/creative/[i]/design` — S2S + 본인소유 + 완성 후만(409 가드). running 배치 경합 방지.
- **headlineColor 자유 hex**: LLM은 white/black 그대로 출력, 저장 시 hex 통일, 렌더 시 정규화. scrim 방향은 휘도로 판정.
- **scrim**: 글자 뒤 밴드 (하단 고정 폐기). 농도 Bright 40 / Dark 65 (에디터 슬라이더로 변경 가능). 에디터 진입 시 off에서 시작 (유저 결정).
- **Cloudflare Free로 시작, Paid($5/월)는 트래픽 보고 전환**: Free 제한 실측 정리 — CPU 10ms(홀딩은 CPU 안 먹어서 무관), 서브리퀘스트 50/요청(가장 먼저 걸릴 후보), waitUntil 응답 후 30초, 요청 10만/일.
- **Replicate 계정**: auto-reload 설정됨. 잔액·결제수단은 사장님 관리.
- **폰트 셀프호스팅 보류**: public 레포 + GitKraken 무료 제약. Google 34종은 OFL로 가능하나 Satoshi(ITF)가 public 재배포 금지. B안(Google만)도 대기 중 — 폰트 이슈 재발 시 재개.

## 5. 렌더 계약 (에디터 작업 전 필독)

- `fontSizePct` = **canvas HEIGHT의 %**, `x/maxWidth/widthPct` = WIDTH의 % (analysis 프롬프트 3곳 명시).
- `AdOverlay`가 참조 구현: 높이 기준 글자 크기, 웹폰트 로드 게이트(FOUT 시 개행 엇갈림 방지).
- 타일·모달·다운로드 PNG·에디터 캔버스 4곳 일치 검증됨 ("…dress / it" 케이스).
- 기존 배치는 마이그레이션 불필요 (% 값이라 재해석만 됨. 다만 크기가 의도대로 바뀌어 보임).
- logo `cqh` 버그 수정됨 (뷰포트 폴백 → 이미지 높이 px 계산).
- scrimStrength(0-100, 에디터 전용 확장, 미지정 시 65/40 기본값).

## 6. 런칭 체크리스트

- [ ] 실생성 이미지 6~8장 → 랜딩 PortfolioSection에 박기 (스테이징에서 생성 → 버킷에서 회수)
- [ ] `support@tailoredad.com` (+`contact@`) Email Routing (tailoredad.com 도메인에서 별도 설정)
- [ ] Polar 과금 연결 (블로커)
- [ ] 약관 실체 검토 (한국 조항 유지 여부 포함)
- [ ] `tailorad.com` 구매 + 리다이렉트
- [ ] `shortreal.ai/ad` → 301 (런칭 당일)
- [ ] `tailoredad.com` DNS 연결 (이미지 준비되면)
- [ ] Search Console 등록 (런칭 후)
- [ ] Supabase 대시보드 확인 (사장님): realtime publication에 `ad_generation_batches` 포함 여부 + RLS SELECT 자가행 허용 여부 (REST는 service_role이라 되고 live만 안 올 수 있음)
- [ ] Cloudflare Secrets에 `UPSTASH_REDIS_REST_URL`/`TOKEN` 등록 (프로덕션)
- [ ] 카피 품질: LLM 헤드라인 문법 어색 건 ("dress for it") — 프롬프트에 원어민 검수 지시 추가 예정

## 7. 다음 작업: 에디터에서 다운로드

- 기본 에디터 완성됨 (트리·캔버스·조절판·저장·드래그·색상·scrim).
- 에디터에서 현재 보고 있는 합성본을 다운로드하는 기능 추가 (Detail 다운로드와 동일 엔진 재사용).
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

(End of file)
