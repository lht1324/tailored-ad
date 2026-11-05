# TailoredAd — 작업 기록 (Last Updated: 2026-11-05 02:34)

> short_real의 `/ad`(AI 스틸 광고)를 독립 앱·독립 브랜드로 분리한 프로젝트.
> 포트폴리오(jaeholee.xyz) 관련 내용은 제외.

## 0. 최근 세션 기록 (10-31 ~ 11-05) — **Next → Vite + Hono 이관**

### 결론: 코드 이관 완료, **배포만 남음**

- 새 스택: **React 19 + Vite 8 + Hono 4 + `@cloudflare/vite-plugin`**, 포트 **3002 단일 서버**
- 브랜치 **`vite-hono`** (worktree `~/Projects/tailored-ad-vite`) · 복귀 지점 태그 **`pre-vite`**
- 실측: `typecheck`·`build` 초록, **실제 배치 1건 완주**(4장, 점수 8.8~9.1) → 파이프라인 end-to-end 검증됨
- **prod는 여전히 구 Next 버전이 서빙 중** (변경 없음)

### 옮긴 것
| | |
|---|---|
| 라우트 | 34개 전부 (API 25 + 웹훅 3계열 + 페이지 2) |
| 화면 | 랜딩 · legal 3 · 블로그(목록+6편) · sign-in · projects · 상세 · create · profile · checkout · **에디터** |
| 인증 | Neon Auth → Hono 미들웨어 + `/api/auth/*` 프록시 + OAuth 콜백(verifier 교환) |
| 페이지 가드 | `proxy.ts` → 워커 (`run_worker_first` + `ASSETS`) |
| 파이프라인 | Workflows W1·W2·W3 — base · ratios · analysis · **persona** · 크레딧 |
| SEO | 정적 프리렌더 **11경로** + `llms.txt`(정적 생성) |
| R2 | AWS SDK → **`aws4fetch`** (Cloudflare 권장, @smithy 패키징 문제 회피) |
| 구조 | `lib/{client,server,shared}` 3분할 + `src`=화면, `worker`=서버 진입 |

### 폐기·대체
- `client-gateway` → **Hono 미들웨어**(세션 검증 단일화)
- `dodo/process` → `processDodoEvent()` 함수 + `waitUntil`
- `webhook/fungies` → 삭제(죽은 라우트)
- 내부 파이프라인 라우트 6개(`image/generation·process/*`, `creative/:i/analysis`) → **워크플로 step**
- `INTERNAL_FIRE_AND_FORGET_API_SECRET` → self-fetch 폐기로 용도 소멸 → **웹훅 URL 서명 키로 재사용**

### 이번에 잡은 치명 버그 (전부 실측으로 확인)
1. **완료 마커 RPC**: `JSON.stringify(null)`이 **jsonb의 JSON null**이라 PL/pgSQL의 `p_error is not null`이 참 → 오류가 없는데 실패 분기를 타서 `imageFileExtension`을 버림 → **base 저장 실패 → 파이프라인 전체 정지**. SQL NULL 전달로 수정.
2. **R2**: `@smithy/core`의 `browser` 필드가 **배포본에 없는 `*.browser.js`**를 가리켜 `S3Client` 생성 즉사 → `aws4fetch`로 교체.
3. **웹훅 경로**: `/webhook/*`이 `run_worker_first`에 없어 워커에 도달 못 함 → `/api/webhook/*`로 이동.
4. **OAuth verifier 교환**: 페이지 요청은 워커에 안 오므로 `/api/auth/callback`으로 옮겨 교환.
5. **이미지 프록시**: 페이지 가드가 `/projects/*`를 먼저 잡아 index.html 반환 → **이미지 라우트를 가드보다 앞에** 마운트.
6. **base 실패 폴백**: 실패한 비율을 DB 기록에 의존해 제외 → 기록 실패 시 **같은 비율 무한 재시도(과금)**. 코드로 확정 제외.
7. **env**: `DODO_ENV` 폐기 → `ENVIRONMENT`(런타임 값). R2 버킷 선택도 `NODE_ENV`(빌드 상수) → `ENVIRONMENT`.
8. **Replicate 웹훅 위조**: 서명이 없는 제공자라 **웹훅 URL에 HMAC 서명**을 붙이고 수신 시 검증.

### 이관 중 발견한 규칙 (재발 방지)
- **`secrets.required`를 선언하면 `.dev.vars`에서 그 목록만 로드된다.** 웹훅 키를 빠뜨려 400이 났음.
- **Cloudflare `assets`는 `foo.html`을 `/foo`로, `foo/index.html`을 `/foo/`로 서빙**한다(`html_handling: auto-trailing-slash`). 프리렌더 파일명 규칙이 여기 맞춰져야 한다.
- **작업자(Workers)에서 `process.env.NODE_ENV`는 빌드 타임 상수**다. dev 빌드를 배포하면 prod가 dev 분기를 탄다 → 런타임 `ENVIRONMENT`를 쓴다.

### 아직 안 한 것
- **배포**: `vite-hono` → `develop` → `master`(`--no-ff`) → `npm run deploy` → prod 스모크
- **생성 품질 3건** → §12
- 잔여 정리 → §12

## 1. 개요

- **브랜드**: TailoredAd — "Tailored ads, not templates" (Harnessed AI ad studio)
- **도메인**: `tailoredad.com` 서빙 중 (prod 런칭 완료). HTTPS 301 강제 ON
- **스택**: React 19 + Vite 8 + Hono 4 + Tailwind v4 + Neon(DB+Auth) + R2 + Upstash SSE + Replicate/OpenRouter + Dodo, Cloudflare Workers(`@cloudflare/vite-plugin`)
  - 구 Next 16 + OpenNext 버전은 **태그 `pre-vite`**로 보존
- **Git**: Git Flow (`master` 프로덕션 / `develop` 작업). develop 푸시됨
- **포트**: **3002 단일** (`npm run dev` = 클라 + 워커 동일 오리진. 3003/홀수 반납)
- **dev 접근**: `https://dev.tailoredad.com` (Cloudflare Tunnel 경유). ngrok 사용 안 함
- **테마**: 라이트가 기본 (`theme-light`), 다크는 토글
- **배포**: `npm run build`(= typecheck → vite build → 프리렌더) → `wrangler deploy`. 워커 이름 `tailored-ad` 유지 필수

## 2. 현재 정책·결정 (유지 중인 것)

- **과금**: 잔액제(이월) — 결제한 만큼 부여, 미사용분 소멸 없음. `subscription_grants` append-only,
  `remaining = 누적부여 − 누적사용`. 환불은 음수 grant 행 회수. 월 리셋 폐지.
- **무료**: trial 10장 평생 1회 (lazy 부여, partial unique로 동시호출 흡수). 잔액 0이면 402 + 업셀 모달 + Upgrade pill.
- **가격**: Starter $19/100장($0.190), Growth $49/500장($0.098), Pro $99/1,000장($0.099).
  첫주문 50% (Dodo 코드 `FIRSTORDER50`, Starter 한정·신규·1주기).
- **결제**: Dodo 확정. USD 고정, MoR. 상품 매핑은 `dodoProducts.ts`
  **metadata 기반**(`planId` = `plan-1`/`plan-2`/`plan-3`, 없으면 `plan` 키 예비) — 가격·순서 변경에 무적.
  metadata 없는 상품은 무시, 3플랜이 정확히 1개씩 아니면 loudly 실패. 목록·매핑 캐시 1시간.
  **prod 실측(10-28)**: Starter `pdt_0NpF9VQjYvFLc5jA9DFin`/1900/plan-1 · Growth `pdt_0NpF9VKMSYntkd0OciAJb`/4900/plan-2 · Pro `pdt_0NpF9VDKXhtpkIC6RHyfU`/9900/plan-3 정상 해석.
  체크아웃 이메일 고정 — 웹훅 userId 폴백이 이메일 매칭에 의존.
- **얼굴 정책**: 실사 얼굴 OUT (Enterprise + Stripe 체급만 예외). AI 페르소나(합성) 노선 → Amazon 2026-07 synthetic performer 태그와 정합 (product-only는 태그 불필요).
- **Hero CTA 4분기**: 비로그인→`/create`, trial+0→`/#pricing`, 로그인 그 외→`/projects`.
- **결제 확인 원칙**: `return_url` 읽기전용 + 웹훅 쓰기 (콜백 부여 금지).
- **돈문**: 구독 게이트 없음 (`proxy`는 로그인만). 402+업셀이 유일한 돈문.
- **이미지 모델**: base = FLUX 3 Image 단일화 (`selectImageModel` 항상 FLUX 3). ratios = BRIA outpainting 확정.
- **랜딩 카피 톤**: "AI stock"(slop) 대비 포지셔닝. "AI stock" 정의가 명시 안 됐다는 피드백 있음 (개선 후보).
- **모바일**: 공유 파일에 반응형 추가 금지 (split 때 삭제 대상). 현상 동결, 백로그만.
- **카피**: 제1원칙(§0) 위반 시 출고 금지.

## 3. 프롬프트·생성 잔량 (미완)

- [ ] LLM 프롬프트 base-only 2순위: softbox 기구명사 금지 + levitating→grounded + Full-color 강제 (Note 강제는 완료)
- [ ] 상대 크기 앵커 규칙 (인물 있으면 신체 대비 · 없으면 fill — 미적용)
- [ ] C 단위 LLM 2회 분리 검토 (base·ratio mutual blind — 재구성 품질 보고 결정)
- [ ] 프롬프트 eyeball (FLUX 3 기준)
- [ ] B9 c01-1:1 실패분 재생성 + 19칸 선정 매핑 보완
- [ ] 낱장 Regenerate (뒷단 재제출 경로 존재, UI 배선만 — 제안됨, 미확정)
- [ ] 브랜드 킷 (로고·팔레트·폰트·CTA 유저 저장 + 생성 프리필 — 제안됨, 미확정)
- [ ] CTA 색 enum 추출 (제안됨, 미확정)
- [ ] 타일 CTA 재측정 판정 (모달은 공식 일치 실측. 타일 측정값이 CSS 산수와 모순 → 노드 혼동 유력)
- [ ] LLM 헤드라인 문법 어색 건 ("dress for it") — 프롬프트에 원어민 검수 지시 추가 예정

## 4. 렌더 계약 (에디터 작업 전 필독)

- `fontSizePct` = **canvas HEIGHT의 %**, `x/maxWidth/widthPct` = WIDTH의 % (analysis 프롬프트 3곳 명시).
- `AdOverlay`가 참조 구현: 높이 기준 글자 크기, 웹폰트 로드 게이트(FOUT 시 개행 엇갈림 방지), 드래그 지원 prop (프리뷰 미전달).
- 타일·모달·다운로드 PNG·에디터 캔버스 4곳 일치 검증됨 ("…dress / it" 케이스).
- 기존 배치는 마이그레이션 불필요 (% 값이라 재해석만 됨).
- logo `cqh` 버그 수정됨 (뷰포트 폴백 → 이미지 높이 px 계산).
- scrimStrength(0-100, 에디터 전용 확장, 미지정 시 65/40 기본값).

## 5. 런칭 체크리스트 (잔량)

- [ ] 약관 실체 검토 (한국 조항 유지 여부 포함 — 10-14 실체 4건 수정됨)
- [ ] `tailorad.com` 구매 + 리다이렉트
- [ ] `shortreal.ai/ad` → 301
- [ ] Cloudflare 4xx 원인 확인 (1.38k 대비 4xx 31%. 후보: 旧 `demo_*` 외부 참조·`/api/*` 401·봇. 5xx는 0.00%)
- [ ] `npm run lint` 전체 재확인 (최근엔 신규 파일만 측정 — blog·content 0건)
- [ ] **쓰레기 DNS 삭제** — `jaeholee.xyz` 영역의 `dev.jaehoolee.xyz.jaeholee.xyz` (터널 세팅 중 생성된 오타 레코드)
- [ ] **dev 로그인 테스트** — `dev.tailoredad.com`에서 Google 로그인 → prod 세션 오염 여부 확인 (Neon Auth 신뢰 도메인에 dev.* 미등록이면 복귀 단계에서 막힐 수 있음)
- [x] Search Console 등록 + https 색인 요청 + sitemap 제출
- [x] 도메인 이메일 `support@tailoredad.com` (수신 전용 — 발송 수단은 별도 필요)

## 6. 다음 작업

### 마케팅 트랙 (상세 `MARKETING_PLAN.md`·`MAILING_LIST.md`)
- [x] **prod SQL (UTM 컬럼 4개)** — 10-28 실행·검증 (`utm_source`·`utm_medium`·`utm_campaign`·`utm_content` 존재 확인, prod 브랜치)
- [x] **GSC 블로그 글 6개 색인 요청** (사장님 10-28)
- [ ] **사장님: 발송 수단 확보** — `support@tailoredad.com`은 수신 전용(Cloudflare Email Routing). Google Workspace 등 발송 경로 필요. **3단계 전체의 선행 조건**
- [ ] **사장님: 1차 발송 3곳 확인** — Material Kitchen·Chamberlain Coffee·L:A BRUKET (`MAILING_LIST.md` §6.4)
- [ ] **저: 3곳 제품 선정 → 제품 사진 확보 → 크리에이티브 3장 생성** (상세 절차·이유·사용처 = **§10**. 25장 선생성 금지)
- [ ] **저: 메일 카피 초안 (1:1)** → 사장님 검수 → 발송(하루 5~8통 분산)
- [ ] **저: AI 인용 재측정** — 2~4주 후 동일 질의 (기준선 10-22 0건)
- [ ] **목표: 증언 1개** → 4단계 진입 조건
- [ ] 4단계 유료 (2개월 차, 조건: 트라이얼 5+·증언 3+·LTV 추정 가능)

### 제품 트랙
- [x] **P0: prod 생성 경로 죽음 → Vite+Hono 이관에서 구조적으로 해소 (11-05)**
  self-fetch 제거(함수 직접 호출 + Workflows) · 결제 적립도 함수 호출로 전환 · 실제 배치 1건 완주 확인.
  상세는 `PIPELINE_ARCHITECTURE.md`, 이관 경위는 §0.
- [ ] **Dodo live 체크아웃 401** (지원 문의 대기): live `/checkouts` 직접 호출도 401.
  **10-28 정정**: live **Products API는 정상 동작**(prod 게이트웨이 `/api/client-gateway?path=/api/dodo/products`가 live 키로 3플랜 반환) → 키·계정 자체는 유효. 401은 **checkouts 라우트 국소 문제**로 범위 축소됨.
  잔량: live E2E (로그인→잔액→실결제→적립→환불) + R2 쓰기 첫 생성 확인.
  **prod DB 실측(10-28)**: `subscription_grants` 2건 모두 `reason='trial'`(10장)·`polar_subscription_id` NULL, `usage_ledger` 0건 → **유료 결제로 적립된 기록 0건.** 체크아웃 화면이 열린다는 것과 결제→웹훅→적립 통과는 별개.
- [ ] **Portfolio Creative 중복**: 11칸 중 4쌍이 같은 creative의 비율違い. 56장 풀에서 분산 재배정
- [ ] **prod gateway 500 잔여 확인** (사장님): 프로젝트 새로고침으로 확인
- [ ] **OPTIMIZATION_PLAN.md** 트랙 착수 (죽은 import → 동적 로드 → memo → 목록 프로젝션 → presign lazy → 게이트웨이 스트림 → 이미지 프록시 캐시 → 썸네일 파이프라인)
- [ ] 랜딩 모바일 햄버거 메뉴
- [ ] **short_real: client-gateway CF 대응** (다른 세션 인계 — tailored-ad 패턴 이식이 이관 선행 조건)

## 7. 명령어

```bash
npm run dev                 # 3002 (클라)
docker compose up           # 3003 (서버, --build는 패키지 변경 시)
npm run build
npm run lint
npm run deploy              # opennext build + deploy (master에서)

cloudflared tunnel run dev   # dev.* 4개 도메인 터널 (사장님 Warp 탭)
```

## 8. 대시보드 작업 메모

- Cloudflare Variables/Secrets: `VITE_*` 3개는 Variable, 나머지 전부 Secret.
- `VITE_*`은 빌드타임에 박히므로 변수 변경 후 리빌드 필수.
- Neon Auth trusted domains: localhost 기본. **dev.tailoredad.com·prod 도메인 등록 필요할 수 있음 (미확인)**
- Google OAuth: prod·GitHub는 자체 앱 (GitHub 앱 재사용可 — 콜백 URL 추가). localhost 포트가 3000→3002로 바뀌었으니 **OAuth 콜백 등록도 확인 필요**
- Upstash: `tailored-ad-ratelimit` (AWS 도쿄, Free). 월 명령어 40만 전후로 PAYG + budget cap
- Workers Paid($5/월) — Free 10ms CPU 초과 이후. 게이트웨이 lazy 로드(`ROUTE_ENTRIES`)도 적용됨
- `lib/serverEnv.ts`: Workers 런타임 env 우선 + `process.env` 폴백 — **Workers에서 `process.env`는 빌드타임 값**
- Replicate: auto-reload 설정됨. 429 = Upstash slidingWindow 500/60s + 백오프 (fail-open)
- Web Analytics: 계정 레벨 메뉴. dev 서버에서 브라우저로 열면 prod 토큰으로 보고됨 → dev 세션이 prod 분석에 섞임
- **Cloudflare Tunnel**: `~/.cloudflared/config.yml` ingress 4개 · 증서 백업 `cert.pem.<영역>` 4개. 새 서브도메인 추가 = 백업을 cert.pem으로 복사 → `cloudflared tunnel route dns dev <호스트>` → 원복

## 9. 운영 gotcha 요약 (과거 사고의 교훈 — 재발 방지용)

- **OpenNext 증분 캐시** (10-25): 기본 더미 캐시로는 ●(SSG) 라우트 서빙 불가 → 목록 200·본문 404 증상. `open-next.config.ts`에 `static-assets` 오버라이드 필수. 트레이드오프: 읽기 전용이라 revalidate 쓰는 앱엔 부적합(우리 0건)
- **메타 타이틀 더블브랜딩** (10-19 1차, 10-25 재발): layout template이 `TailoredAd | %s`이므로 **페이지 title에 "— TailoredAd"를 넣으면 중복**. 새 페이지 접미사 금지
- **cloudflared 인증서**: cert.pem은 1영역 스코프 — 로그인 화면 다중 선택 무효. 기존 cert가 있으면 login이 거부(덮어쓰기 안 함) → 백업 후 재로그인. **인증서 영역 밖 호스트를 `route dns`하면 영역명이 뒤에 붙어 엉터리 레코드 생성** (실제 발생)
- **.env 파일 문법**: `BASE_URL=value` (등호 주변 공백 없음). sed 패턴에 공백을 넣으면 조용히 실패
- **merge 커밋 없이 master가 직진한 사고** (10-14): 릴리즈 머지는 반드시 `--no-ff`, 머지 출력 확인
- **html-to-image OG 캡처**: `backgroundColor` 옵션이 카드 bg를 덮어씀 (넣지 말 것). `toJpeg`는 data URL 반환 → `fetch(dataUrl).blob()`
- **웹폰트**: `layout.tsx` `<head>` link + preconnect. Next 16 stylesheet link에 `precedence="default"` 필수. 폰트 CSS 3종 `crossOrigin="anonymous"` (html-to-image SecurityError 해소)
- **ThemeToggle hydration**: `useState` initializer에서 localStorage 읽기 금지 — 마운트 후 effect 반영
- **Auth 이메일 find-or-create**: 로그인 콜백은 기존 행 재사용 — 테스트 계정 정리는 users 행 + trial grant 함께 삭제
- **Upstash Streams**: XRANGE 시작 커서는 inclusive (아니면 매 틱 중복). REST는 `data`를 객체로 파싱
- **Neon 스키마 이전 시**: 체크제약 동반 확인 (`subscription_grants.reason` 사고)
- **Dodo 테스트**: TimeInterval 대문자 (`Month`). 웹훅 payload에 metadata.userId 부재 → 폴백 체인 (구독 조회 → 이메일)
- **client-gateway 라우트 추가**: `ROUTE_ENTRIES`에 1줄 필수 (누락 시 404). `http://internal` origin을 절대 URL로 쓰지 말 것
- **Shopify 리드 수집** (10-28): `/products.json`은 **IP당 429가 쉽게 걸린다**(수십 건이면 차단). `cdn.shopify.com`/`myshopify.com` 문자열로 Shopify 판별. **Meta 픽셀은 Web Pixels API(서버측)로 심겨 HTML에 `fbq`가 없다 → 픽셀 부재를 "광고 안 함"으로 해석하면 오판.** Ad Library는 비로그인 403.
- **macOS 프레임워크 파이썬 SSL**: `CERTIFICATE_VERIFY_FAILED`로 urllib 전면 실패. `ssl.create_default_context(cafile="/etc/ssl/cert.pem")`로 해결 (certifi 미설치 환경).
- **Cloudflare Email Routing은 수신 전용**: MX가 `route*.mx.cloudflare.net`인 도메인은 그 주소로 **발송 불가**. 콜드 아웃리치 전 발송 수단(Gmail Workspace 등) + DMARC 확인 필수.
- **durable 실행의 replay 규칙** (10-30, Phase 2 필독): 워크플로/큐의 "잠들었다 깨기"는 **처음부터 재실행 + 완료 단계 결과 재사용**이다. 그래서 **step 밖의 부수효과(API 호출·DB 쓰기·결제)는 재실행 때 중복 실행**되고, step 밖의 `Math.random()`·`Date.now()`는 값이 달라져 분기가 어긋난다. 부수효과는 전부 step 안에 넣는다.
- **`BASE_URL`은 내부 통신 주소가 아니다**: 자기 zone fetch는 CF 이전에도 나쁜 패턴(컴퓨트 2배·타입 소실·인증 단절). Next.js 공식 문서도 서버 컴포넌트에서 자기 Route Handler fetch 금지. **내부는 함수 호출, `BASE_URL`은 외부(웹훅·OAuth·이메일 링크)용.**

## 10. 다음 작업 상세 — 크리에이티브 3장 (3단계 첫 발송)

> 상태: **사장님이 직접 실행** (10-30 지시 "내가 이따 직접 할게"). 이 절만 읽으면 그대로 재개 가능.
> ⚠️ **선행 조건: prod 생성이 현재 막혀 있다** — §10.0 참조. 고치기 전에는 prod에서 아무것도 안 나온다.

### 10.0 ⚠️ prod 생성 경로 버그 (10-30 발견 — 미수정)

prod에서 실제로 1장을 시도했고 **"Preparing concept"에서 영구 정지**했다. 원인을 코드·DB·Replicate 3면에서 확정:

| 확인 | 결과 |
|---|---|
| `ad_generation_batches` | `status=queued`, `ad_creative_specs=[]`, `updated_at=null` → **조합 배정 단계가 실행조차 안 됨** |
| Replicate 예측 목록 | **2026-10-09 이후 0건** → 이미지 생성 요청이 제출되지 않음 |
| 10-20에 만든 배치 | 10일째 `queued` 방치 → **출시 이후 생성이 한 번도 성공한 적 없음** |

**원인**: `src/app/api/image/route.ts`가 원본 업로드 후
`internalFireAndForgetFetch(`${BASE_URL}/api/creative/specs?batchId=…`)`로 다음 단계를 부른다.
prod의 `BASE_URL=https://tailoredad.com` = **워커가 자기 zone을 fetch** — Workers에서 죽는 패턴(client-gateway를 고칠 때 실측한 그 문제). `.catch()`가 에러를 삼켜 흔적도 남지 않는다.
**dev가 되는 이유**: `BASE_URL=dev.tailoredad.com`(터널)이라 진짜 외부 요청이 되어 사장님 PC까지 도달한다.

**수정 방향** (미착수): `lib/utils/internalFetch.ts` 기반 호출 3곳(`/api/creative/specs`, `/api/creative/{i}/prompt`, `/api/image/generation/persona`)을 **게이트웨이와 같은 in-process 직접 호출**로 교체. `ctx.waitUntil`로 응답 후 실행 유지.
**대안(임시)**: dev 서버+터널에서 생성 → 결과 파일만 사용. 단 prod는 여전히 고장.

**부작용 없음**: 실패 배치는 완성 이미지가 없어 **크레딧 차감 0** (10장 유지 확인).

### 10.1 입력 파일 (루트 `seed-outreach/` — git 미추적)

`seed-outreach/`는 `.gitignore`에 등록돼 있다(타사 브랜드 자산 · `public/` 금지).

| 브랜드 | 파일 | 치수 | 출처/전처리 |
|---|---|---|---|
| Material Kitchen | `seed-outreach/material-kitchen/product_the-8-knife_1400x1400.png` | 1400×1400 | 상품 페이지. **원본이 투명 PNG**라 제품만 trim → 흰 배경 평탄화 → 여백 70px |
| Chamberlain Coffee | `seed-outreach/chamberlain-coffee/product_social-dog-medium-roast_2048x2048.png` | 2048×2048 | `og:image:url`(2048px PDP컷). **투명 PNG → 흰 배경 평탄화** |
| L:A BRUKET | `seed-outreach/labruket/product_092-hand-cream_1438x1798.jpg` | 1438×1798 | 상품 페이지 원본 JPG. 흰 배경 그대로 (전처리 없음) |

**파일명 규칙**: `product_{제품슬러그}_{WxH}.{ext}` · 결과물은 `out_{제품슬러그}_{ratio}.{ext}`

### 10.2 생성 설정 명세 (사장님이 화면에 그대로 입력)

**공통**: `/create` → 제품 이미지 업로드 → **How many options = 1 creative** (기본 4 주의) → 비율 선택 → Generate

| 항목 | Material Kitchen | Chamberlain Coffee | L:A BRUKET |
|---|---|---|---|
| 파일 | `product_the-8-knife_1400x1400.png` | `product_social-dog-medium-roast_2048x2048.png` | `product_092-hand-cream_1438x1798.jpg` |
| **인물(가상 모델)** | **없음** (product-only) | **없음** | **없음** |
| **인물 프롬프트** | — (사용 안 함) | — (사용 안 함) | — (사용 안 함) |
| **비율** | 1:1 + 4:5 | 1:1 + 4:5 | 1:1 + 4:5 |
| creative 수 | 1 | 1 | 1 |
| CTA 버튼 | **OFF** (1차) | **OFF** | **OFF** |
| **제품 노트 (프롬프트)** | `warm oak kitchen counter, soft morning window light, minimal, steel and cream` | `sunlit kitchen shelf, cozy morning, coral and navy accents` | `quiet stone bathroom shelf, soft daylight, linen towel, minimal Nordic` |
| **브랜드 팔레트** (이미지에서 추출) | `#4B4743`, `#A1A0A0`, `#E7E6E6` | `#EF8976`, `#714E53`, `#F7EDE6` | `#10130D`, `#A7A9A0`, `#DBDEDF` |
| 예상 크레딧 | 2 | 2 | 2 |

**왜 인물 없음인가**: ⓐ product-only는 우리 최대 주장(제품 정체성·정확한 타이포)을 가장 직접 시험한다 ⓑ Amazon AI-person 태그 대상이 아니다 ⓒ 페르소나 생성은 LLM 1콜 + 비용이 추가된다.
**L:A BRUKET 인물 옵션(미사용)**: 손 클로즈업이 필요하면 persona 프롬프트 `Nordic woman, 30s, natural bare hands, minimal makeup, soft daylight`. 쓰면 Amazon 태그 대상이 되므로 1차에서는 뺀다.

**헤드라인은 자동 생성된다** (직접 입력 필드 없음). 발송 전 에디터에서 아래 후보로 다듬는다:
- Material Kitchen: `The knife you leave out.`
- Chamberlain: `Mornings, sorted.`
- L:A BRUKET: `Hands, handled.`

**비용**: 3브랜드 × 2포맷 = **6장 = 6크레딧** (trial 10장 중). 여유 4장.

### 10.3 왜 만드는가 (우선순위 순)
1. **회신율 실험** — 우리 계획의 유일한 무기다. "팔겠습니다"가 아니라 "귀사 제품으로 만들어봤습니다"가 열리게 하는 열쇠. 3통이면 반응 자체를 볼 수 있다.
2. **우리 제품의 첫 외부 입력 테스트** — 지금까지 모든 생성은 **우리 데모 사진**(통제된 조명·단순 배경)이었다. 타사 제품 사진은 배경·조명·해상도가 제각각이다. 특히 **L:A BRUKET 튜브는 라벨에 작은 글자가 많아** "제품 정체성 보존"을 가장 혹독하게 시험한다.
3. **증언 확보의 씨앗** — "이미지가 좋네요"라는 한 마디가 4단계 유료의 진입 조건이다.
4. **도그푸딩** — 무료 10장 경로를 우리 손으로 통과한다.

### 10.4 어디에 쓰는가 (권한 구분 — 중요)
| 용도 | 가능 여부 |
|---|---|
| **메일 1:1 첨부** | ✅ 즉시. 본인 회사 제품을 본인에게 보여주는 것 |
| 회신 후 대화 소재 | ✅ |
| **랜딩·SNS·블로그에 공개 게시** | ⚠️ **그 브랜드의 허락 후에만.** 우리가 만든 이미지라도 제품·로고·브랜드가 들어 있다 |
| 증언·케이스 스터디 | ✅ 회신·동의 시 |
| 포트폴리오(향후) | 허락 후 |

→ **결론: 메일 밖으로 나가는 순간 허락이 필요하다.** 허락 없이 `public/`에 넣지 않는다.

### 10.5 실행 순서
1. §10.0 버그 수정(또는 dev 우회 결정)
2. `tailoredad.com` 로그인 → `/create`
3. 브랜드 순서대로: 파일 업로드 → 1 creative → 1:1·4:5 → 노트·팔레트 입력 → Generate
4. 결과 확인 → 헤드라인 다듬기(에디터) → 다운로드 → `seed-outreach/{브랜드}/out_*.png`
5. 판정(아래) → 통과 시 메일 카피 초안(#저) → 발송

### 10.6 판정 기준 (사장님)
- 제품이 **원본과 똑같이** 보이는가 (색·형태·라벨 글자)
- 글자가 **깨지지 않았는가**
- **"AI 티"가 나는가** — 이게 나면 발송 중단하고 프롬프트·모델을 먼저 고친다

### 10.7 실패 시 대응
| 증상 | 조치 |
|---|---|
| 제품 색·형태 변형 | 참조 이미지 품질 문제 → 순백 컷으로 교체 후 재생성 |
| 글자 깨짐 | 있으면 안 되는 현상(코드 조판) → **버그로 취급**하고 원인 추적 |
| AI 티 남 | 프롬프트(§3 잔량)부터 정리. 발송 보류 |
| 3곳 다 실패 | 시딩 중단. 제품 품질이 먼저다 (보내봐야 브랜드만 상한다) |

### 10.8 하지 말 것
- **25장 선생성** — 3통 반응 보고 확장
- 실사 얼굴 합성 — 안 함 (정책)
- 아마존 **대표이미지 용도**로 만들기 — 규정 위반 (입력으로 쓰는 건 무관)
- 우리 브랜드 로고를 타사 이미지에 넣기 — 그건 그들 광고가 아니다
- `public/`에 넣기 · git에 커밋하기

---

## 11. 다음 세션 착수 목록 (10-28 이월분 — 우선순위 순)

> 사장님 지시(10-28): 이번에 하지 않고 전부 다음으로 묶음. 아래만 보면 이어서 재개 가능.
> 사장님 지시(10-30): 파이프라인 수정은 "한 번 싹 훑는 작업"이라 지금 착수하지 않음 → 아래 A0로 이월.

### A0. 파이프라인 수정 — **완료 (10-31 ~ 11-05)**

- [x] W0 워커 엔트리·워크플로 바인딩
- [x] W1 assignSpecs · prepareCreativePrompt · submitBaseImage · handleBaseResult
- [x] W2 submitRatios · handleRatioResult · analyzeCreative
- [x] W3 submitPersona · handlePersonaResult · processDodoEvent(크레딧)
- [x] 내부 파이프라인 라우트 11개 삭제 (전부 step 함수로)
- [x] Replicate 웹훅 3종을 `/api/webhook/replicate/*`로 이전 + **URL HMAC 서명**
- [ ] **W4 배포·prod 스모크** ← 남은 것 (§12)
- [ ] W5 정체 감시·lint

### A. 결제 검증 (제품 트랙 최우선)
- [ ] prod Pricing에서 Starter 실결제 1건 ($9.50, `FIRSTORDER50`) → `subscription_grants` 유료 1건 + 100장 확인 → 웹훅 적립 → 환불
- [ ] 위 통과 전에는 **PH 런치 보류** (유입 전소 방지)
- [ ] Dodo live `/checkouts` 401 원인 확정 (Products API는 정상 → 라우트 국소 문제)

### B. 3단계 시딩
- [ ] **사장님**: 발송 수단 확보 (Google Workspace 권장) + DMARC `p=none` 추가
- [x] **저**: 타깃 52곳 스캔 + 필터표(`MAILING_LIST.csv`) — 10-29 완료
- [x] **저**: 수동 확인 반영(폼만 5곳 제외·파트너십 주소 발굴) — 10-29 완료
- [ ] **사장님**: 3곳 선정안 확인 (Material Kitchen · Chamberlain Coffee · L:A BRUKET)
- [ ] **저**: 3곳 제품 사진 확보 → 크리에이티브 3장 생성 → 메일 카피 1:1 초안 (**§10 상세**)
- [ ] 발송 3통 테스트 → 반응 확인 후 확장 여부 판단 (25장 선생성 금지)
- [ ] (확장 시) Meta Ad Library API로 34곳 일괄 조회 — 토큰에 앱+신원 확인 필요

### C. 정리·검증 잔무
- [ ] `npm run lint` 전체 재확인
- [ ] Cloudflare 4xx 31% 원인 확인
- [ ] dev 로그인 테스트 (`dev.tailoredad.com` Google 로그인 → prod 세션 오염 여부)
- [ ] 쓰레기 DNS 삭제 (`dev.jaehoolee.xyz.jaeholee.xyz`)
- [ ] prod gateway 500 잔여 확인 (프로젝트 새로고침)
- [ ] 약관 실체 검토 · `tailorad.com` 구매+리다이렉트 · `shortreal.ai/ad` → 301
- [ ] Portfolio Creative 중복 4쌍 재배정
- [ ] OPTIMIZATION_PLAN.md 트랙 착수
- [ ] short_real client-gateway CF 대응 (다른 세션 인계)

---

## 12. 다음 세션 착수 목록 (11-05 기준)

### A. 생성 품질 (이관 결함 아님 — 프롬프트 설계 문제)
실측 근거: 배치 `719651d2` · `3163adbc` — 파이프라인은 완주하지만 결과물이 **"사람 옆에 놓인 거대한 신발"**.

| | 원인 | 수정 |
|---|---|---|
| **A** | 페르소나가 **흉상**(`head and shoulders`) → 발이 없어 "신고 있는" 그림 불가 | `POST_AD_PERSONA_PROMPT.ts`를 **전신 스탠딩**으로 |
| **B1** | `combined` 모드가 `hero_shot`(단독 거상)·`environment_shot`(세계 속 배치)를 허용 → **축이 "옆에 두라"고 지시** | `creativeCombinationSampler.ts`에서 두 축 제외 → `lifestyle_shot`·`product_in_hand`만 |
| **B2** | 프롬프트에 착용·스케일 규칙 없음 → LLM이 `"beside"`, `"resting on the floor"`를 씀 | `POST_AD_CREATIVE_PROMPT.ts`에 **강제 규칙**(footwear=worn, 실물 크기, 금지 표현 목록) |
| **B3** | 지시만으로는 LLM이 어김 | `prepareCreativePrompt.ts`에 **금지어 린트 → 1회 재생성 → 잔존 시 제거** |
| **C** | 모델이 `":headline"`처럼 **콜론 붙인 키**를 반환 → `copy.headline` 유실 | 키 정규화(선행 `:` 제거) |

**판정 실험**: A·B·C 적용 후 새 배치 1회 → 신발을 **신고 있으면** 프롬프트 문제였고, 여전히 옆에 놓이면 **모델 한계**(모델 교체 또는 합성 방식 변경).

### B. 배포 (이관의 마지막 단계)
- [ ] `vite-hono` → `develop` 머지
- [ ] `develop` → `master` **`--no-ff`**
- [ ] `npm run deploy` (사장님 승인 후)
- [ ] prod 스모크: 로그인 → 생성 1회 → 이미지·썸네일·에디터 저장 확인
- [ ] (선택) Replicate 웹훅 재조회 검증은 **불필요** — URL HMAC으로 대체됨

### C. 잔여 정리 (배포 후 가능)
- [ ] `/dev/status` 확인용 화면 제거 또는 게이트
- [ ] `ThemeToggle`(원본 주석 "임시 데모용") 처리 결정
- [ ] `INTERNAL_FIRE_AND_FORGET_API_SECRET` 이름 정리(이제 웹훅 서명 키)
- [ ] `AppImage` 이미지 최적화 부재 → 원본 크기 그대로 (LCP)
- [ ] 프리렌더를 `createRoot` → `hydrateRoot`로 (이중 렌더 제거)
- [ ] `usageServerAPI`에 "테이블 2개" 예외 주석
- [ ] 마케팅 트랙(§6·§11 B)은 **생성 품질 통과 후** 재개 — 시딩 이미지가 그 품질에 의존
