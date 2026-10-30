# TailoredAd — 작업 기록 (Last Updated: 2026-10-30 05:55)

> short_real의 `/ad`(AI 스틸 광고)를 독립 앱·독립 브랜드로 분리한 프로젝트.
> 포트폴리오(jaeholee.xyz) 관련 내용은 제외.

## 0. 최근 세션 기록 (10-25 ~ 10-30)

### 생성 파이프라인 감사 보고서 작성 (10-30) — `PIPELINE_AUDIT.md`
- **범위 정정**: §10.0에 "수정 3곳"으로 적혀 있던 것은 틀렸다. 전수 조사 결과 **호출부 19곳 / 대상 라우트 11개**다.
- **결제도 같이 죽어 있다 (신규 발견)**: `api/webhook/dodo/route.ts:32`가 `/api/dodo/process`를 같은 self-fetch로 호출한다. 즉 **Dodo 401을 고쳐 결제가 성공해도 크레딧이 적립되지 않는다.** 웹훅은 200을 반환하므로 Dodo는 성공으로 기록한다 → **돈만 받고 아무것도 안 주는 상태**.
- **죽은 호출 1건 발견**: `api/webhook/fungies/route.ts:36`이 `/api/fungies/process`를 부르는데 **해당 라우트 파일이 없다**(`src/app/api/fungies/` 부재). 폐기된 결제사 잔재 → 삭제 대상.
- **gateway 표 누락 3개**: `image/generation/persona` · `image/process/persona` · `dodo/process`는 `ROUTE_ENTRIES`에 등록돼 있지 않다. 디스패치 전환 시 추가 필요.
- **11개 라우트 전부 `getIsValidRequestS2S`** 인증 → 세션·userId 없이 내부 호출 가능(전환에 장애 없음).
- **사고를 10일간 숨긴 3가지 구조적 결함**도 보고서에 명시: ⓐ `.catch()`가 에러를 삼킴 ⓑ 실패를 상태로 남기지 않음(`queued` 방치) ⓒ 장기 정체 감시 없음. **큐로 바꿔도 이 3개를 같이 고치지 않으면 재발한다.**
- **2단계 설계 확정(문서화만, 미착수)**: Phase 1 = in-process 디스패치(헬퍼 1개 수정, 호출부 무수정, 2~3시간) / Phase 2 = Cloudflare Queues(재시도·DLQ·30초 제약 해소, 1일). Service Binding·Workflows·호스팅 이전은 **지금 채택 안 함**(이유 문서화).
- **Phase 1의 한계 명시**: `waitUntil`은 응답 후 **최대 30초**. 4-creative 팬아웃이 넘기면 잘릴 수 있다 → Phase 2 필요 근거.
- **상대 경로 호출(`/foo`)은 불가** 실측: `fetch`는 절대 URL만 받아 `TypeError: Failed to parse URL`. 우회 불가 확인.


### 실행 모델·플랫폼 정리 (10-30, 사장님 논의 — 문서화만)
- **"Workers 런타임 1개에서 전부 돌려야 한다"는 전제는 틀렸다.** 정확히는 **1 코드(워커 스크립트) = N invocation**. 단계마다 새 실행이 깨어나고 **각자 새 시간 예산**을 받는다. 체인 전체가 한 예산에 들어갈 필요 없음.
- **오케스트레이터는 상주 프로세스가 아니다.** 매 단계 `DB 상태 읽기 → 다음 단계 판단 → 함수 호출 → 상태 쓰기 → 종료`를 반복하는 **평범한 함수**. Temporal·Inngest·CF Workflows 전부 이 구조.
- **suspend/resume은 "잠들었다 깨는" 게 아니라 "처음부터 재생(replay) + 완료 단계 건너뛰기"** 다. isolate는 죽고, 재개 시 함수가 처음부터 다시 돌며 완료된 step 결과를 캐시에서 받는다.
  → **실무 규칙: 부수효과(API 호출·DB 쓰기·결제)는 반드시 step 안에.** step 밖에 있으면 재실행 때 중복 실행된다. `Math.random()`·`Date.now()`도 step 밖에서는 재실행마다 값이 달라져 분기가 어긋난다.
- **타임아웃은 "코드 한 줄"이 아니라 "실행 1회(invocation)" 단위**이고, 실제 계정은 CPU 시간이다. 네트워크 대기가 대부분인 우리 단계(2~8초)는 CPU를 거의 쓰지 않는다.
- **Phase 1에는 suspend/resume 개념이 없다.** `waitUntil`은 "응답 후 한 번 깨어나 체인을 쭉 이어서 실행(최대 30초)"일 뿐이다. 사장님이 그린 "단계마다 잘려 실행되는" 그림은 **Phase 2(Queues)** 다.
- **자기 zone fetch가 원래 안 좋은 패턴인 이유**(CF 이전부터): 컴퓨트 2배, 타입 소실, 인증 컨텍스트 단절, 느림. Next.js 공식 문서도 "서버 컴포넌트에서 자기 Route Handler를 fetch하지 말고 로직을 함수로 빼라"고 명시. **CF는 원래 안 좋은 패턴을 아예 불가능하게 만들었을 뿐.**
- **`BASE_URL`의 정확한 용도**: OAuth 리다이렉트·웹훅 수신·이메일 링크·DB에 저장하는 URL = **외부인이 우리를 부르는 주소**. **내부 통신용이 아니다.** 브라우저→서버 호출은 진짜 외부 요청이라 문제없다(client-gateway가 정상인 이유). 문제는 서버→자기 자신뿐.
- **호스팅 결론**: 지금 CF 유지. 버그 1개 때문에 이전하는 건 비용 낭비이고, 30초·유실 문제는 플랫폼을 바꿔도 남는다(큐가 답). 분리가 필요해지면 **CF 방패 + 단일 컨테이너(Fly/Railway, 1일/$10~20)**. AWS·Azure·GCP는 이 규모에서 2~4일 + 상시 운영 부담이라 비추천. Heroku는 방향 아님. **WAF(방패)는 지금 필요 없다** — 트래픽·어뷰징이 없고, 백엔드를 CF 밖으로 빼면 오히려 원본 IP 노출로 방어가 약해져 mTLS·IP 은닉이 추가로 필요해진다.
- **env 정리(개선 후보, 미착수)**: `getServerEnv`의 `process.env` 폴백이 **조용히 동작하는 것**이 DODO_ENV 사고의 원인. 운영에서 폴백 발생 시 경고 + `wrangler types` 기반 타입 env(문자열 키 제거) 후보. **버그는 아니므로 A0 이후.**

### prod 생성 경로 버그 발견 (10-30) — 3장 생성 시도 중
- 3단계 크리에이티브 3장을 prod에서 만들려다 **"Preparing concept"에서 영구 정지**. 3면 실측으로 원인 확정:
  `ad_creative_specs=[]`·`status=queued`·`updated_at=null` (DB) + **Replicate 예측 10-09 이후 0건** + 10-20 배치도 10일째 queued.
- **원인**: `/api/image`가 업로드 후 `internalFireAndForgetFetch(BASE_URL/api/creative/specs)`로 다음 단계 호출 →
  prod `BASE_URL=https://tailoredad.com` = **워커가 자기 zone fetch** (Workers에서 죽는 패턴). `.catch()`가 삼켜 흔적 없음.
  dev는 `BASE_URL=dev.tailoredad.com`(터널)이라 진짜 외부 요청 → 동작. **출시 이후 생성 성공 0건.**
- **부작용 없음**: 실패 배치는 완성 이미지가 없어 크레딧 차감 0 (10장 유지).
- 수정 방향: internalFetch 3곳(specs·prompt·persona)을 게이트웨이식 **in-process 직접 호출**로 교체. **미착수.**
  **10-30 정정**: 실제는 **호출부 19곳 / 대상 라우트 11개**이며, 결제 웹훅도 같은 원인으로 죽어 있다. `PIPELINE_AUDIT.md` 참조.
- 같은 이유로 **PH 런치·유료 집행은 여전히 보류**가 맞다 (결제 이전에 생성이 안 된다).

### 3단계 시딩 — 크리에이티브 3장 준비 (10-30)
- 제품 3종 선정 후 **입력 이미지 확보·전처리 완료**: `seed-outreach/` (gitignore 등록, `public/` 금지).
  - Material Kitchen **The 8" Knife** — 투명 PNG → trim + 흰 배경 + 여백 → 1400×1400
  - Chamberlain **Social Dog Medium Roast** — 투명 PNG → 흰 배경 평탄화 → 2048×2048
  - L:A BRUKET **092 Hand Cream SRL** — 원본 JPG 1438×1798 (라벨 글자가 많아 정체성 보존 최혹독 테스트)
- 브랜드 팔레트는 **이미지에서 실제 추출**(6색 양자화): MK `#4B4743/#A1A0A0/#E7E6E6` · CB `#EF8976/#714E53/#F7EDE6` · LA `#10130D/#A7A9A0/#DBDEDF`
- **생성 설정 명세 확정** (concept 1 · 1:1+4:5 · CTA off · 인물 없음 · 제품 노트·팔레트·헤드라인 후보) → `context.md` §10.2
- 사장님이 직접 실행하기로 함 (10-30). 실행 전 §10.0 버그 수정 또는 dev 우회 결정 필요.

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
- [ ] **저: 3곳 제품 선정 → 제품 사진 확보 → 크리에이티브 3장 생성** (상세 절차·이유·사용처 = **§10**. 25장 선생성 금지)
- [ ] **저: 메일 카피 초안 (1:1)** → 사장님 검수 → 발송(하루 5~8통 분산)
- [ ] **저: AI 인용 재측정** — 2~4주 후 동일 질의 (기준선 10-22 0건)
- [ ] **목표: 증언 1개** → 4단계 진입 조건
- [ ] 4단계 유료 (2개월 차, 조건: 트라이얼 5+·증언 3+·LTV 추정 가능)

### 제품 트랙
- [ ] **🔴 P0: prod 생성 경로 죽음 (10-30)** — `/api/image` → `internalFireAndForgetFetch(BASE_URL/api/creative/specs)`가 **워커 자기 zone fetch**라 prod에서 실패. 배치는 `queued`·`specs=[]`로 영구 정지, Replicate 제출 0건. **출시 이후 생성 성공 0건** (10-20 배치도 10일째 queued).
  수정: `lib/utils/internalFetch.ts` 1곳 → in-process 디스패처 위임 (**호출부 19곳은 무수정**). 상세 = **`PIPELINE_AUDIT.md`** (§10.0의 "3곳" 표기는 오기 — 실제 19곳/11라우트).
  **같은 원인으로 결제 적립도 죽어 있다** (`api/webhook/dodo/route.ts:32` → `/api/dodo/process`).
  → 이거 고치기 전에는 prod 유료 전환·PH 런치·시딩 모두 의미 없음.
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

### A0. 파이프라인 수정 (P0 — **최우선**, 상세 `PIPELINE_AUDIT.md`)

> **설계 확정: `PIPELINE_ARCHITECTURE.md`** (10-30, 10-31 정정). route는 문, 파이프라인은 **Workflow 클래스(`BatchPipeline`)가 소유**.
> 엔진 = **Cloudflare Workflows**(Queue 아님), 내부 라우트 11개 삭제, 상태 쓰기는 RPC 유지(읽기 전용).
> 구현 순서: **W0 ✅(10-31) → W1(1장 end-to-end) → W2 → W3 → W4(배포·prod 스모크) → W5**.
> **W4 배포 전까지 prod 생성은 죽어 있는 상태 유지 → 유입 금지** (시딩·PH 계속 보류)
> 근거·조사 결과·리스크·검증 계획 전부 `PIPELINE_AUDIT.md`. 여기는 실행 체크리스트만.

**Phase 1 — in-process 디스패치 (2~3시간)**
- [ ] `src/lib/internalDispatch.ts` 신설 — 경로 매칭 → lazy import → 핸들러 직접 호출 (게이트웨이 패턴). 매칭 실패는 loudly 실패
- [ ] `src/lib/utils/internalFetch.ts` 수정 — 호스트가 `BASE_URL`과 같으면 디스패처 위임, 다르면 기존 fetch. **시그니처 불변**
- [ ] `ROUTE_ENTRIES`에 누락 3개 추가 (`image/generation/persona`·`image/process/persona`·`dodo/process`)
- [ ] 실패를 DB 상태로 기록 (`status='failed'` + code·message)
- [ ] `api/webhook/fungies/route.ts` 죽은 호출 삭제 (대상 라우트 부재)
- [ ] dev 검증: creative 1·비율 1개 / creative 4·비율 2개 / persona / 실패 유도
- [ ] prod 스모크: trial로 1장 완주 + Replicate 신규 예측 확인
- [ ] develop 커밋 → master `--no-ff` 머지 → 배포

**Phase 2 — Cloudflare Queues (1일, Phase 1 안정화 후)**
- [ ] 메시지 스키마 + 컨슈머 구성 (단계 로직은 기존 핸들러 재사용)
- [ ] 단계별 idempotency (`UPDATE … WHERE status='expected'`)
- [ ] DLQ + 실패 알림 + `queued` 장기 정체 Cron 감시
- [ ] **replay 규칙 준수 확인** — 부수효과는 전부 step 안으로. step 밖 API 호출·DB 쓰기·랜덤/시각 의존 금지 (`context.md` §9)
- [ ] Phase 2 진입 판단 기준: Phase 1 배포 후 **4-creative 배치가 30초를 넘거나, 유실이 1건이라도 관측되면** 즉시 착수


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

