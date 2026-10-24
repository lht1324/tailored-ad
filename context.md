# TailoredAd — 작업 기록 (Last Updated: 2026-10-24 01:54)

> short_real의 `/ad`(AI 스틸 광고)를 독립 앱·독립 브랜드로 분리한 프로젝트.
> 포트폴리오(jaeholee.xyz) 관련 내용은 제외.

## 0. 최근 세션 기록 (10-22 ~ 10-24 — 마케팅 트랙 + 블로그 콘텐츠 시스템)

### 마케팅 전반 (상세: `MARKETING_PLAN.md`)
- **전체 계획 정리** (10-22, `1d6e5bf`): MARKETING_PLAN.md 재작성 — 4단계 로드맵·디렉터리 실측 판정·TAAFT 스킵 결정.
- **1단계 완료** (10-22/23, 사장님 작업): 디렉터리 4곳 제출 완료 (AIToolsRecap·SaaSHub·Bro Find AI·Future Tools) + 도메인 이메일(`support@tailoredad.com`) + Bro Find AI 배지 인증.
- **HTTPS 301 문제 발견·수정** (10-22): GSC 이미지 분석 중 `http://tailoredad.com/`이 200으로 서빙됨 실측 (리다이렉트 없음 → 중복 콘텐츠 + 보안). 원인 = Cloudflare "Always Use HTTPS" OFF → 사장님이 ON → **301 정상 확인**. `www.`는 DNS 레코드 자체가 없어 중복 없음. canonical(`https://tailoredad.com`)·robots·sitemap 전부 정상이었음.
- **prod SQL 설명 + 좋은 소식** (10-22): `04_analytics.sql`(users에 UTM 컬럼 4개)은 **추가 배포 불필요** — UTM 코드(`src/lib/utm.ts`)가 이미 master에 있어 prod 배포됨. **prod DB에 SQL만 실행하면 즉시 기록 켜짐.** 홀딩해도 아무것도 안 깨짐 (클라 catch로 조용히 실패). 사장님 홀딩 중.
- **AI 인용 기준선 측정** (10-22, websearch 실측): 브랜드형·카테고리형 2건 질의 모두 **TailoredAd 0건 인용**. AI가 인용하는 형태 3종: ① Reddit 스레드 ② "best X for Y" 콘텐츠(jenova·sellerpic·adgenai) ③ 무료 툴 페이지. → "alternatives" 페이지보다 **카테고리 리스트클이 핵심 인용 단위**라는 결론으로 2단계 설계 반영.
- **2단계 설계** (10-22/23): 경쟁사 실측 페이지(adroast.ai/alternatives/pencil) 구조 분석 — 요약 박스(★AI 인용 표적)·가격표·장단점·"누구는 그 툴에 남아 있어도 된다" 정직 섹션·FAQ. 우리 FAQ는 SaaSHub 제출분 재활용.
- **타겟 재정의** (10-23): 지속 구매자 = 소규모 DTC 브랜드(LTV $200~600/년) / 첫 고객 = 글로벌 드랍쉬퍼 광고형(LTV $40~120/년). 도달: DTC는 검색(SEO 콘텐츠), 드랍쉬퍼는 커뮤니티(3단계 시딩).
- **Amazon AI disclosure 발견** (10-23): 2026-07-23 Amazon 정책 — 사진 같은 AI 사람이 들어간 리스팅·A+ 콘텐츠는 IPTC 태그 필수 (NY synthetic performer법). **AI 배경·제품만 = 태그 불필요 → 우리 product-only 모드가 유리한 근거.** 카피 근거로 채택.
- **Shopify 조사** (10-22/23): "인터넷 상가 건물" — 2025 GMV $378B·매출 $11.6B·활성 스토어 ~280~500만·175개국. 드랍쉬핑 = 핵심 사용 사례. **AI 광고 크리에이티브는 미내장** (AI 투자는 Sidekick·발견 쪽) → 자리 실재. App Store 진입은 3단계 이후 검증 뒤 결정.
- **MARKETING_PLAN.md 갱신** (10-23, `232cf61`): 1단계 완료·HTTPS·기준선·타겟 재정의·도달 전략 반영.

### 블로그 콘텐츠 시스템 구축 (10-23/24 — `5fec645`, develop)
- **경로 결정**: `/blog` 우산(루트에 흩뿌리기✗, resources✗ — 사장님: "보관함 느낌"). 블로그지만 **페이지 디자인은 판매 문서 틀** (날짜·저자 없는 adroast식). 중간 폴더(`/blog/alternatives/`) 없이 목록 페이지 안 섹션 구분.
- **동적 구조** (사장님 요구): 경로 폴더 선언 금지 → `src/app/blog/[slug]/page.tsx` 동적 세그먼트 + `generateStaticParams` SSG + `dynamicParams = false`(레지스트리 밖 슬러그 즉시 404).
- **데이터/로더 분리** (사장님 요구 — POST_ 프롬프트 패턴 준수):
  ```
  src/lib/content/blog/
    types.ts                       ← 규격(BlogPostContent): slug·kind·meta·eyebrow·headline·subheadline·
                                     quickAnswer·keyTakeaways·table·competitors·sections·faq·cta·relatedSlugs
    posts/adcreativeAiAlternatives.ts  ← 글 1 (카피 초안)
    blogContentServerAPI.ts        ← 레지스트리 + 로더 + 빌드 타임 무결성 검증
                                      (슬러그 중복·오탈자·필수값·relatedSlugs 존재 → 위반 시 빌드 실패 fail-fast)
    blogJsonLd.ts                  ← Article·BreadcrumbList·FAQPage 생성 (FAQ는 본문과 단일 소스)
  src/app/blog/page.tsx            ← 목록 (kind별 섹션: Alternatives / By industry / Guides & lists)
  src/app/blog/[slug]/page.tsx     ← 본문 틀 (generateStaticParams + generateMetadata + JSON-LD 3종)
  src/components/page/blog/        ← BlogIndexPageServer/Client + BlogPostPageServer/Client(템플릿)
  src/app/sitemap.ts               ← sitemap 자동 생성 (정적 5 + 블로그 전체, lastmod=updatedAt)
  ```
- **새 글 추가 절차**: `posts/`에 파일 1개 + `REGISTRY`에 1줄 → URL·목록·sitemap·JSON-LD 전부 자동. 라우트 코드 무수정.
- **글 1 초안** (`/blog/adcreative-ai-alternatives`): 톤 = "누구는 AdCreative에 남아 있어도 된다" 정직 비교. AdCreative 가격 실측 검증 (출처 4곳 교차 일치): **Starter $39/10크레딧 · Professional $249/50 · Ultimate $999/100**, 2026년 Professional 크레딧 100→50 절반 삭감(동일 가격), video·scoring은 $249 이상. 표 캡션에 "2026-10-24 기준, 구매 전 재확인" 명시. Amazon AI 태그 섹션 포함.
- **검증**: `tsc --noEmit` 0 · eslint 0 · `npm run build` 통과 — `/blog` Static, `/blog/[slug]` SSG(`adcreative-ai-alternatives` 프리렌더 확인), `/sitemap.xml`에 글 URL + lastmod 자동 반영 확인.
- **proxy 확인**: `/blog`는 가드 매처 밖 — 공개 경로 안전. `/create` CTA는 랜딩과 동일하게 proxy가 sign-in 경유.
- **남은 것**: ① 사장님이 `/blog`·`/blog/adcreative-ai-alternatives` eyeball (dev 서버) ② 랜딩 헤더·푸터에 `/blog` 링크 추가 여부 (화면 변경 — 승인 필요, 현재 orphan 페이지) ③ 나머지 5장 (creatify·predis·best-ai-ad-tools·ecommerce·skincare) ④ `/llms.txt` ⑤ 인용 재측정 (2~4주 후 기준선 0건과 비교).

## 1. 개요

- **브랜드**: TailoredAd — "Tailored ads, not templates" (Harnessed AI ad studio)
- **도메인**: `tailoredad.com` 서빙 중 (prod 런칭 완료). HTTPS 301 강제 ON (10-22).
- **스택**: Next.js 16 + Tailwind v4 + Neon(DB+Auth) + R2 + Upstash SSE + Replicate/OpenRouter + Dodo, Cloudflare Workers 배포(OpenNext)
- **Git**: Git Flow (`master` 프로덕션 / `develop` 작업). develop 푸시됨.
- **포트**: 클라 `3000` (`npm run dev`) / 서버 `3001` (`DOCKER=true npx next dev --webpack -p 3001` — 브릿지 veth 고장으로 compose 불가. `distDir` 분리로 `.next` 충돌 없음).
- **테마**: 라이트가 기본 (`theme-light`), 다크는 토글.
- **배포**: dev 켜둔 채 배포 가능 (distDir 분리 — dev `.next-dev` / docker `.next-docker` / prod `.next`).

## 2. 현재 정책·결정 (유지 중인 것)

- **과금**: 잔액제(이월) — 결제한 만큼 부여, 미사용분 소멸 없음. `subscription_grants` append-only,
  `remaining = 누적부여 − 누적사용`. 환불은 음수 grant 행 회수. 월 리셋 폐지.
- **무료**: trial 10장 평생 1회 (lazy 부여, partial unique로 동시호출 흡수). 잔액 0이면 402 + 업셀 모달 + Upgrade pill.
- **가격**: Starter $19/100장($0.190), Growth $49/500장($0.098), Pro $99/1,000장($0.099).
  첫주문 50% (Dodo 코드 `FIRSTORDER50`, Starter 한정·신규·1주기).
- **결제**: Dodo 확정 (Polar·LS·Creem·Paddle·Fungies 전멸). USD 고정, MoR. 상품 매핑은
  `dodoProducts.ts` (recurring 가격 asc → plan-1/2/3, 3건 아니면 loudly 실패 — **대시보드 가격 변경 시 표시가와 실청구 갈림 주의**).
  체크아웃 이메일 고정 (`allow_customer_editing_email: false`) — 웹훅 userId 폴백이 이메일 매칭에 의존.
- **얼굴 정책**: 실사 얼굴 OUT (Enterprise + Stripe 체급만 예외). AI 페르소나(합성) 노선.
  → Amazon 2026-07 synthetic performer 태그와도 정합 (product-only는 태그 불필요).
- **Hero CTA 4분기**: 비로그인→`/create`, trial+0→`/#pricing`, 로그인 그 외→`/projects`.
- **결제 확인 원칙**: `return_url` 읽기전용 + 웹훅 쓰기 (콜백 부여 금지).
- **돈문**: 구독 게이트 없음 (`proxy`는 로그인만). 402+업셀이 유일한 돈문.
- **이미지 모델**: base = FLUX 3 Image 단일화 (`selectImageModel` 항상 FLUX 3, base PoC 통과).
  ratios = BRIA outpainting 확정 (원본 앵커 + 배경 확장).
- **랜딩 카피 톤**: "AI stock"(slop) 대비 포지셔닝 — "Ads that don't look like AI stock" + pixel-exact type + 실패분 무료. "AI stock" 정의가 명시돼 있지 않다는 피드백 있음 (추후 개선 후보).
- **모바일**: 공유 파일에 반응형 추가 금지 (split 때 삭제 대상). 현상 동결, 백로그만.

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
- 기존 배치는 마이그레이션 불필요 (% 값이라 재해석만 됨. 다만 크기가 의도대로 바뀌어 보임).
- logo `cqh` 버그 수정됨 (뷰포트 폴백 → 이미지 높이 px 계산).
- scrimStrength(0-100, 에디터 전용 확장, 미지정 시 65/40 기본값).

## 5. 런칭 체크리스트 (잔량)

- [ ] 약관 실체 검토 (한국 조항 유지 여부 포함 — 10-14 실체 4건 수정됨: likeness 전면 금지·portrait 삭제·수탁자 명시·Dodo 확정. 환불은 비례 유지로 코드 일치)
- [ ] `tailorad.com` 구매 + 리다이렉트
- [ ] `shortreal.ai/ad` → 301 (런칭 당일)
- [ ] Cloudflare 4xx 435건 원인 확인 (1.38k 요청 대비 4xx 31%. 후보: 旧 `demo_*` 외부 참조·`/api/*` 401·봇. 5xx는 0.00%. 사장님 대시보드 "요청" 탭 4xx 필터)
- [ ] `npm run lint` 전체 재확인 (최근엔 신규 파일만 측정 — blog·content는 0건)
- [x] Search Console 등록 + https 색인 요청 + sitemap 제출 (10-23 사장님 완료)
- [x] 도메인 이메일 `support@tailoredad.com` (10-23 사장님 완료)

## 6. 다음 작업

### 마케팅 트랙 (详见 `MARKETING_PLAN.md` §9)
- [ ] **사장님: `/blog`·`/blog/adcreative-ai-alternatives` eyeball** (dev 서버) — 글 1 카피 검수
- [ ] **저: 랜딩에 `/blog` 링크 반영** (사장님 승인 후 — 현재 orphan)
- [ ] **저: 나머지 글 5장** (creatify·predis·best-ai-ad-tools·ecommerce·skincare — 동일 규격)
- [ ] **저: `/llms.txt`** (stork.ai 생성기)
- [ ] **사장님: prod SQL** — Neon prod 브랜치에 `db/neon/04_analytics.sql` 실행 (UTM 즉시 켜짐, 배포 불필요)
- [ ] **저: 인용 재측정** — 2~4주 후 동일 질의 (기준선 10-22 0건)
- [ ] **저: 3단계 준비** — 타깃 30곳(DTC + 드랍쉬퍼) + 크리에이티브 30장 + 메일 카피
- [ ] 4단계 유료 (2개월 차, 조건: 트라이얼 5+·증언 3+·LTV 추정 가능)

### 제품 트랙
- [ ] **Dodo live 401** (지원 문의 대기): live 키로 live `/checkouts` 직접 호출도 401. test 대조는 422(인증 통과)
  → live 자격·계정 문제, 코드 무관. 잔량: live E2E (로그인→잔액→실결제→적립→환불) + R2 쓰기 첫 생성 확인.
- [ ] **HeroWall 잘림·저화질**: `public/` hero 6종이 1:1 구버전이라 4:5 프레임 좌우 크롭.
  `landing-final/` 4:5 WebP → `public/preview/` 덮어쓰기 대기 (사장님). sizes 480px 상향 후보.
- [ ] **Portfolio Creative 중복**: 11칸 중 4쌍이 같은 creative의 비율違い. 56장 풀에서 분산 재배정 (미착수).
- [ ] **prod gateway 500 잔여 확인** (사장님): env 분리 배포 후 Projects 새로고침으로 확인 필요.
- [ ] **OPTIMIZATION_PLAN.md** 트랙 착수 (사장님 승인 시 순서: 죽은 import 삭제 → jszip/html-to-image 동적 로드 →
  memo 복구 → 목록 프로젝션 → presign lazy → 게이트웨이 스트림 → 이미지 프록시 캐시 → 썸네일 파이프라인 2~3일)
- [ ] 랜딩 모바일 햄버거 메뉴 (나머지 랜딩 개선 후 논의)
- [ ] 릴리즈 머지 (사장님 판단 시: develop `--no-ff` 머지 후 배포. 블로그 시스템 `5fec645` 포함 대기 중)

## 7. 명령어

```bash
npm run dev      # 3000 (클라)
docker compose up --build  # 3001 (서버). 패키지 변경 시 --build 필수
npm run build
npm run lint
npm run deploy   # opennext build + deploy (master에서)
```

## 8. 대시보드 작업 메모

- Cloudflare Variables/Secrets: `NEXT_PUBLIC_*` 3개는 Variable, 나머지 전부 Secret.
- `NEXT_PUBLIC_*`은 빌드타임에 박히므로 변수 변경 후 리빌드 필수.
- Neon Auth trusted domains: localhost 기본 허용. ngrok·prod 도메인은 배포 시 등록.
- Google OAuth: prod·GitHub는 자체 앱 (GitHub 앱 재사용可 — 콜백 URL 추가).
- Upstash: `tailored-ad-ratelimit` (AWS 도쿄, Free). 월 명령어 40만 전후로 PAYG 전환 + budget cap.
- dev `BASE_URL`은 ngrok 경유 (ngrok 꺼지면 self-fetch DOCTYPE 500 — ngrok 켜둘 것).
- Workers Paid($5/월) — Free 10ms CPU 한도 초과 (체크아웃 503) 이후. 게이트웨이 lazy 로드(`ROUTE_ENTRIES`)도 적용됨.
- `lib/serverEnv.ts`: Workers 런타임 env 우선 + `process.env` 폴백 — **Workers에서 `process.env`는 빌드타임 값** (Dodo env 판정 사고의 교훈).
- Replicate: auto-reload 설정됨. 429 = Upstash slidingWindow 500/60s + 백오프 (fail-open).
- Web Analytics: 계정 레벨 메뉴. dev 서버에서 브라우저로 열면 prod 토큰으로 보고됨 → dev 세션이 prod 분석에 섞임.

## 9. 운영 gotcha 요약 (과거 사고의 교훈 — 재발 방지용)

- **merge 커밋 없이 master가 직진한 사고** (10-14): 릴리즈 머지는 반드시 `--no-ff`, 머지 출력 확인.
- **웹훅 순서 역전 가드 부재**: Paddle판에서 `occurred_at` 비교 없음 — 연타 시 last-writer-wins 가능 (잔재).
- **html-to-image OG 캡처 gotcha**: `backgroundColor` 옵션이 카드 bg를 덮어씀 (넣지 말 것). `toJpeg`는 data URL 반환 → `fetch(dataUrl).blob()` 필요.
- **웹폰트**: `layout.tsx` `<head>` link + preconnect. Next 16 stylesheet link에 `precedence="default"` 필수. 폰트 CSS 3종은 `crossOrigin="anonymous"` (html-to-image SecurityError 해소).
- **ThemeToggle hydration**: `useState` initializer에서 localStorage 읽기 금지 — 마운트 후 effect 반영.
- **Auth 이메일 find-or-create**: 로그인 콜백은 기존 행 재사용 — 테스트 계정 정리는 users 행 + trial grant 함께 삭제.
- **Upstash Streams**: XRANGE 시작 커서는 inclusive (아니면 매 틱 중복). REST는 `data`를 객체로 파싱.
- **Neon 스키마 이전 시**: 체크제약 동반 확인 (`subscription_grants.reason` 사고).
- **Dodo 테스트**: TimeInterval 대문자 (`Month`). 웹훅 payload에 metadata.userId 부재 → 폴백 체인 (구독 조회 → 이메일).

(End of file)
