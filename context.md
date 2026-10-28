# TailoredAd — 작업 기록 (Last Updated: 2026-10-29 01:05)

> short_real의 `/ad`(AI 스틸 광고)를 독립 앱·독립 브랜드로 분리한 프로젝트.
> 포트폴리오(jaeholee.xyz) 관련 내용은 제외.

## 0. 최근 세션 기록 (10-25 ~ 10-29)

### 카피 제1원칙 채택 (10-25, 사장님 지시)
- **"AI 냄새 없이 쓴다"를 제1원칙으로 확정.** 체크리스트 10개를 `MARKETING_PLAN.md` §5.4에 등재.
- 핵심 5개: **엠대시 0개**(metaTitle 브랜드 구분자만 예외) · 자기평가 부사 금지(honest/genuinely/actually) ·
  "X, not Y" 페이지당 1개 이하 · 3항 나열(triad) 연타 금지 · 격언식 표어 금지.
- **퇴고 절차**: 초안 → 체크리스트 → grep 잔여 검사(0건 확인) → 사장님 eyeball. 이 순서 없이는 출고 금지.
- 블로그 글 1 적용 실적: 엠대시 12→0 · 자기평가 부사 5→0 · "X, not Y" 6→1 · 표어 3→0 · 중복 정보 제거.
- 원어민 관용구 자체 교정 4건 (litigate→scrutinize, rides on→baked into, treat as a stop→pull the render, carry→do).

### 블로그 2단계 완성 + prod 배포 (10-25)
- **글 5장 추가** (`fab6f41`): creatify·predis 대안 + best-ai-ad-tools 리스트클 + ecommerce·skincare 업종. 규격은 `src/lib/content/blog/` 재사용.
- **가격 실측 검증 2건** (중요): Creatify는 2026-10에 요금 개편 — 공식 페이지 **Free 10크레딧 · Standard $15/55 · Pro $55/280** (구 리뷰의 $39/$99는 구가격). Predis는 **Core $32/월(연낙 $19) · Rise $79 · Enterprise+ $249**, 체험 3일·카드 요구·**체험 후 환불 불가**(공식 FAQ).
- **`/llms.txt`** (`c2e8a4f`): `src/app/llms.txt/route.ts`가 콘텐츠 레지스트리에서 **자동 생성**(`force-static`). 정적 파일로 두면 글 추가 시 수동 갱신이 필요해 라우트로 만듦. gotcha: 가격이 PricingSection·landingJsonLd·llms.txt **삼중 관리**.
- **푸터 Blog 링크** (`8476002`): orphan 해소. `Portfolio·Workflow·Pricing·FAQ·Blog·TailoredAd Studio`.
- **Bro Find AI 배지 제거** (`abb9cdc`): 실측 결과 리스팅에 "Verified" 3곳 + 링크 `rel="noopener noreferrer"`(dofollow 성립) → **목적 달성 확인 후 판정 실>득**. 이유 = "0 UPVOTES"가 전 페이지에 노출(역사회증거) + 라이트 푸터에서 다크 카드가 시각적 지배. 재부착 가능한 결정.
- **prod 배포 3회** (원인 추적 포함):
  1. `5508c71` — 머지·배포 성공했으나 **글 6개 전부 404**
  2. `de39591` — **원인: OpenNext 증분 캐시**. 기본 더미 캐시는 ●(SSG) 라우트를 못 꺼냄(`/blog` 같은 ○ 정적은 에셋이라 정상 → 목록만 열리고 본문 404). `static-assets` 오버라이드 적용으로 해결 (`.open-next/cache` → `assets/cdn-cgi/_next_cache` 복사, R2·KV 불필요, revalidate 안 쓰는 앱 전제 — 우리 revalidate 0건 확인)
  3. `0a24517` — **더블브랜딩 재발** 발견·수정: `<title>TailoredAd | … — TailoredAd</title>`. layout template(`TailoredAd | %s`)과 페이지 title 접미사 중복 — 10-19 사고의 재발
- **최종 prod 실측**: `/blog` + 글 6개 + `/llms.txt` 전부 200, 타이틀 정상, 기존 페이지 회귀 없음.

### 개발 포트 변경 + docker compose 부활 (10-25, `ec9e5ef`·`cdf0bdb`)
- **TailoredAd = 클라 3002 / 서버 3003.** 전체 배치(사장님 확정): ShortReal 3000/3001 · TailoredAd 3002/3003 · LocalAgentsLink 3004/3005 · jaeholee.xyz 3006/3007
- 변경 6곳: `package.json` scripts(`-p 3002`/`-p 3003`) · `docker-compose.yml`(3003:3003) · `.env.local`(`NEXT_PUBLIC_BASE_URL=localhost:3003`) · `next.config.ts` dev CORS · `callback/auth/route.ts` 리다이렉트 2곳 · baseFetch 주석
- **docker compose 정상 동작 확인** — 과거 "브릿지 veth 고장"은 해소됨. `docker compose up`으로 서버 기동(컨테이너 내부도 3003). 기록상의 네이티브 폴백(`DOCKER=true npm run dev:worker`)은 예비 경로로만 유지

### Cloudflare Tunnel 전환 — ngrok 은퇴 (10-25/26)
- **터널 1개가 4개 서브도메인 동시 서빙** (ngrok 무료 1도메인 제약 해소). 이름 `dev`, ID `097484fe-3d99-4d45-8936-aeee558895ce`.
- ingress (`~/.cloudflared/config.yml`): dev.tailoredad.com→3003 · dev.shortreal.ai→3001 · dev.localagents.link→3005 · **dev.jaeholee.xyz**→3007
- **철자 주의**: 4번째 도메인은 `jaeholee.xyz`(홑 o). `jaehoolee.xyz`(겹 o)는 NS 없는 미위임 이름
- **cert.pem은 1영역 스코프** — 로그인 화면의 다중 선택은 인증서에 반영 안 됨. 영역별 `cert.pem.<영역>` 백업 4개 확보 → 새 서브도메인은 **재로그인 없이** 백업 교체 + `route dns` 한 줄로 가능
- **`BASE_URL` 4개 프로젝트 전부 dev.* 도메인으로 교체** (서버 self-fetch·웹훅 수신용). `NEXT_PUBLIC_BASE_URL`은 localhost 유지(브라우저 직행)
- **prod Worker 라우트가 서브도메인을 침범하지 않음** 실측 (dev.*에 Web Analytics beacon 0건 = 워커 아닌 터널이 서빙)
- 검증: dev.tailoredad.com 200 · 나머지 3개 502(터널 도달, 서버 미기동 상태)

### short_real의 client-gateway가 CF 이관 시 깨질 위험 (10-26 발견)
- short_real은 게이트웨이가 **fetch 프록시** 방식(`BASE_URL`로 실제 HTTP 재요청). Vercel에서는 옳지만 **CF Workers는 자기 zone fetch가 금지** (tailored-ad에서 non-JSON 즉사 실측).
- tailored-ad는 이미 **in-process 직접 호출**로 개조돼 운영 중: `ROUTE_ENTRIES` 표 → `matchRoute` → 매칭 1개만 lazy import → `new NextRequest("http://internal…")` 가짜 객체(네트워크 호출 아님) → 핸들러 함수 직접 호출 → Response 그대로 반환.
- **gotcha**: 새 API 라우트 추가 시 `ROUTE_ENTRIES`에 1줄 필수(누락 시 게이트웨이 경유 404) · `x-internal-secret`으로 내부 인증 · `http://internal`의 origin을 절대 URL로 쓰지 말 것
- short_real 쪽 잔재: `PUBLIC_ROUTES`의 `/api/polar/products`(폐기된 결제사), 죽은 조건 `route.path === targetPath || route.path === \`${targetPath}\``
- → **short_real CF 이관 전 게이트웨이 개조가 선행 조건.** 인수인계 브리핑 전달 완료(10-26)

### 3단계 시딩 — 타깃 리스트 확보 (10-28)
- **explee 조사 후 미사용 결정**: explee는 "AI가 리드 찾아 콜드메일 자동 발송 + 미팅 예약"하는 에이전트(105M CEO급 컨택트·97% 인박스·메일당 $0.04). ⓐ 브랜드별 맞춤 이미지 첨부 불가 ⓑ 자동발송이 우리 계획과 상충 ⓒ 유료. 09-20 기록의 "DB로만 쓰자"는 판단은 제품 구조상 반쪽짜리였음 — 철회.
- **타깃 25곳 확보** (`MAILING_LIST.md` 신설): 웹 검색으로 후보 수집 → 각 사이트 contact 페이지 직접 크롤링으로 이메일 추출(2026-10-28). ★ 적합 19곳 + ⚠️ 규모 클 수 있음 6곳
- **드랍쉬퍼 5곳 제외** (사장님 10-28): 브랜드명 없고 수명 2~6주라 증언 가치 낮음

### 3단계 시딩 — 2차 실측 검증 (10-28, `MAILING_LIST.md` §3)
- **1차 25곳의 구조적 결함 발견**: 주소가 `orders@`·`support@`·`help@` 등 **CS/주문 큐**인 곳이 다수. CS 담당자는 영업 메일을 넘길 의무가 없어 회신율이 최하위. 규모도 중견 이상 편중.
- **후보 131개 도메인 실측 스캔** → **1군 34곳 · 2군 15곳 · 제외 82곳** 확정. 1차 리스트는 "발송 대상 아님"으로 문서에 명시하고 보존.
- **스캔 방법**: 홈 요청으로 생존·Shopify 판별(`cdn.shopify.com`/`myshopify.com`) → `/products.json?limit=250`으로 상품 수 → 홈 인라인 픽셀 + **GTM 컨테이너 원문 파싱**으로 광고 신호 → contact/about/policies 크롤링으로 주소 추출 → `%20`·`u003e`·`your@email.com`류 오탐 수동 제거.
- **확정 불가 항목 3개 (문서에 한계로 명시)**:
  - **광고 집행 여부 — 자동 판별 불가**. Shopify는 Meta 픽셀을 **Web Pixels API(서버측)**로 심어 HTML에 `fbq`가 없다. `미확인 ≠ 광고 안 함`. Ad Library는 로그인 장벽(403 실측)으로 자동 조회 실패 → 육안 확인 필요.
  - **Instagram 팔로워 — 전면 차단**(비로그인 조회 빈 응답). 규모는 상품 수·인지도로만 추정.
  - **상품 수 — 절반 이상 429**(Shopify 봇 차단). 숫자는 실측값, `?`는 미확보.
- **실명 주소 2곳 확보**: ~~`reilly@methodicalcoffee.com`~~ · `brandon@3sixteen.com`. 광고 픽셀 감지 7곳.
  **10-29 정정**: `reilly@`는 **실제로 없었다** (폼만). 자동 추출 오탐.
- **커피를 11곳으로 두껍게**: 구독제라 매달 새 소재 수요가 구조적으로 발생 → 관계 성립 시 재구매 지속성 최고.

### 3단계 시딩 — 필터표 + 사장님 수동 검증 (10-29)
- **필터표 작성** (`MAILING_LIST.csv`, 52곳 × 15컬럼): Numbers/Sheets에서 조건 필터 가능. 컬럼 = 군·업종·브랜드·도메인·이메일·주소유형·상품수·카탈로그·Meta광고·GoogleAds·TikTok·광고신호·점수·우선순위·비고.
- **자동 수집 방법**: 홈 HTML + `/products.json` + **GTM 컨테이너 원문 파싱**(Shopify는 Meta 픽셀을 Web Pixels API로 심어 HTML에 `fbq`가 없음).
- **429 실측**: 52곳을 1분에 돌리면 IP가 차단된다(44건 429). **4초 간격 + 브라우저 헤더**로 재수집해 52/52 확보.
- **변별력 없는 신호는 점수에서 제외**: Klaviyo 47/52 · Shopify 50/52 → 상수라 제외. 남은 신호 = Meta 10 · GoogleAds 20 · TikTok 2.
- **★ 핵심 발견 — 파트너십·미디어 주소가 최고 등급**: 같은 회사·같은 제품이라도 `partners@`·`business@`·`collaborations@`는 **업무 자체가 외부 제안 검토**다. CS·주문 주소는 넘길 의무가 없다. 점수 가중치를 실명 중심에서 **파트너십 +6 · 미디어 +5 · 도매 +4 · 실명 +3 · 일반 +1 · CS 0**으로 재편.
- **사장님 수동 확인으로 오탐 5건 제거** (52곳 중 10%): `Methodical Coffee`·`Bocce's Bakery`·`Recess`·`Osea`·`Farmhouse Pottery`는 **폼만 있고 이메일 없음**. Farmhouse는 AI 챗봇이 연결을 제안했으나 부담스러워 중단 → **폼·챗봇만 있는 곳은 캠페인에서 제외** 결정.
- **확인된 파트너십·미디어 주소**: `partners@materialkitchen.com` · `business@chamberlaincoffee.com` · `collaborations@labruket.com`(Justine) · `allison@georgehowellcoffee.com`(Media) · `brandon@3sixteen.com`(Wholesale). L:A BRUKET은 상업담당 실명 2명도 있음(`carla.kromberg@` DACH · `laurine.combasson@` FR/UK/BNL).
- **1차 발송 대상 3곳 선정안**: Material Kitchen(`partners@`) · Chamberlain Coffee(`business@`) · L:A BRUKET(`collaborations@`). 대안 George Howell·3sixteen. **25장 선생성 금지** — 3통 반응 보고 확장.
- **Meta Ad Library API 이월**: 토큰에 Meta 앱 + 신원 확인 필요(문서 확인). 3곳 고르는 데 30분짜리 심사를 붙이는 건 낭비 → 확장 단계로 미룸. **API에 이미지/영상 구분 필드는 없음**(`ad_snapshot_url`의 `<video>` 유무로 추정 가능).

### 채널 전략 결정 (10-28, 사장님 논의)
- **PH(Product Hunt) 보류**: 실결제 E2E 미통과 상태에서 띄우면 유입이 결제 실패로 전소. 증언·결제 검증 후로 미룸.
- **유료 백링크 대행 불매**: 스팸 풋프린트·페널티 리스크. 도메인 초창기는 링크 수보다 활동신호가 중요.
- **검색광고(2단계)를 맨 뒤로**: 하루 $5~10은 소액이 아님(월 $150~300). 해당 키워드 CPC $2~6라 클릭 1~2개/일 → 통계적으로 못 읽는 표본. 검색광고의 실값은 "랜딩 전환률 측정"인데, **아웃리치 링크에 UTM만 붙이면 무료로 같은 데이터를 얻는다** → 증언 1건 + 랜딩→가입 5% 확인 후 **2~3주 $300~500 단발**로만 집행.
- **X(Twitter) = 발송 채널 아님, 발굴 채널**: DTC 대표는 X에 없고, 상호 팔로우 없으면 DM 자체가 막히며 제재가 빠름. 대신 `"ad creative" expensive`·`CAC rising`·`creative testing` 검색으로 **고통을 공개적으로 말한 리드**를 찾아 공개 답장하는 용도로만.
- **Instagram = 전시장**(발송 아님): 0 팔로워 문제는 팔로워가 아니라 **증거물 부족**이 원인. 시딩 결과물이 곧 포트폴리오이자 콘텐츠라 별도 SNS 제작 불필요.
- **타깃 재정의**: 중견 DTC가 아니라 **광고는 돌리는데 팀이 작은 곳**. 판별 기준 = Meta Ad Library 집행 + IG 5k~100k + 상품 10~80 + 스튜디오급 제품 사진 + 직통 주소 확보 가능.
- **발송 인프라 경고 (미해결)**: `support@tailoredad.com`은 **Cloudflare Email Routing = 수신 전용**이라 발송 불가. DMARC 레코드도 없음. 업계는 메인 도메인 대신 보조 도메인 + 워밍업 + 인박스 로테이션으로 회피하지만, 우리 규모(하루 5~8통 수동)는 **메인 도메인 + 물량 억제**로 흡수하는 게 정답.

## 1. 개요

- **브랜드**: TailoredAd — "Tailored ads, not templates" (Harnessed AI ad studio)
- **도메인**: `tailoredad.com` 서빙 중 (prod 런칭 완료). HTTPS 301 강제 ON
- **스택**: Next.js 16 + Tailwind v4 + Neon(DB+Auth) + R2 + Upstash SSE + Replicate/OpenRouter + Dodo, Cloudflare Workers(OpenNext)
- **Git**: Git Flow (`master` 프로덕션 / `develop` 작업). develop 푸시됨
- **포트**: 클라 **3002** (`npm run dev`) / 서버 **3003** (`docker compose up` — 정상 동작. 예비 폴백 `DOCKER=true npm run dev:worker`)
- **dev 접근**: `https://dev.tailoredad.com` (Cloudflare Tunnel 경유). ngrok 사용 안 함
- **테마**: 라이트가 기본 (`theme-light`), 다크는 토글
- **배포**: dev 켜둔 채 배포 가능 (distDir 분리 — dev `.next-dev` / docker `.next-docker` / prod `.next`)

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
- [ ] **저: 3곳 제품 선정 → 제품 사진 확보 → 크리에이티브 3장 생성** (먼저 3장만, 25장 선생성 금지)
- [ ] **저: 메일 카피 초안 (1:1)** → 사장님 검수 → 발송(하루 5~8통 분산)
- [ ] **저: AI 인용 재측정** — 2~4주 후 동일 질의 (기준선 10-22 0건)
- [ ] **목표: 증언 1개** → 4단계 진입 조건
- [ ] 4단계 유료 (2개월 차, 조건: 트라이얼 5+·증언 3+·LTV 추정 가능)

### 제품 트랙
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

- Cloudflare Variables/Secrets: `NEXT_PUBLIC_*` 3개는 Variable, 나머지 전부 Secret.
- `NEXT_PUBLIC_*`은 빌드타임에 박히므로 변수 변경 후 리빌드 필수.
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

## 10. 다음 세션 착수 목록 (10-28 이월분 — 우선순위 순)

> 사장님 지시(10-28): 이번에 하지 않고 전부 다음으로 묶음. 아래만 보면 이어서 재개 가능.

### A. 결제 검증 (제품 트랙 최우선)
- [ ] prod Pricing에서 Starter 실결제 1건 ($9.50, `FIRSTORDER50`) → `subscription_grants` 유료 1건 + 100장 확인 → 웹훅 적립 → 환불
- [ ] 위 통과 전에는 **PH 런치 보류** (유입 전소 방지)
- [ ] Dodo live `/checkouts` 401 원인 확정 (Products API는 정상 → 라우트 국소 문제)

### B. 3단계 시딩
- [ ] **사장님**: 발송 수단 확보 (Google Workspace 권장) + DMARC `p=none` 추가
- [x] **저**: 타깃 52곳 스캔 + 필터표(`MAILING_LIST.csv`) — 10-29 완료
- [x] **저**: 수동 확인 반영(폼만 5곳 제외·파트너십 주소 발굴) — 10-29 완료
- [ ] **사장님**: 3곳 선정안 확인 (Material Kitchen · Chamberlain Coffee · L:A BRUKET)
- [ ] **저**: 3곳 제품 사진 확보 → 크리에이티브 3장 생성 → 메일 카피 1:1 초안
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

