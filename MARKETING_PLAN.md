# TailoredAd — 마케팅 계획서

*Last Updated: 2026-10-21 02:05 · 작성: AI 에이전트 · 상태: 1단계 진행 중*

> 이 문서는 TailoredAd(tailoredad.com)의 **발견 가능성(discovery) 확보** 계획이다.
> 진단 근거는 사장님이 2026-10-20에 Kimi K3로 실행한 검색 실측 + 직접 조사한 서비스 3곳
> (explee.com / unfair.so / hellyeahai.com) + 12개 디렉터리 비교 자료다.
>
> **예산: 10~20만 원** (≈$74~148). 이 안에서 최대 효과를 뽑는 게 제약이다.
> **原则: 설명 → 컨펌 → 작업.** 사용자 화면에 보이는 변경은 항상 별도 승인을 받는다.

---

## 0. 한 줄 요약

> 코드가 읽히고·빠르고·맞게 보이게 만드는 것(10-20 완료) 이후, **남은 병목은 "사람이 우리를 찾을 수 있는通道"이 없던 것**이다.
> 1단계(디렉터리) → 2단계(직접 콘텐츠) → 3단계(베타 시딩) → 4단계(유료 증폭) 순으로,
> **0원 항목을 먼저 쓰고 돈은 social proof가 생긴 2개월 차에 쓴다.**

---

## 1. 진단 — 현재 상태 (실측)

### 1.1 AI 검색 실측 (Kimi K3, 2026-10-20)

사장님이 AI로 "TailoredAd"를 검색한 결과:

| 관찰 | 내용 |
|---|---|
| 정확 매칭 | 사이트 자신만. 소스 신뢰도 `unrated` |
| 제3자 언급 | **0건** (리뷰·Product Hunt·Reddit·블로그·디렉터리 전부 없음) |
| 의미 충돌 | "tailored ad"가 영어 일반 명사구 → 의류·개인화 광고 콘텐츠에 묻힘 |
| 카테고리 질의 | "AI 광고 크리에이티브 툴 추천" → 경쟁사(AdCreative.ai·Omneky·Adroast·Spendict·Novabrand)만 등장, TailoredAd 없음 |
| 직접 URL 패치 시 | 콘텐츠는 잘 읽힘 (워크플로 5단계, quality-gated batch, deterministic type, 10장 무료 등 구체 클레임 추출됨) |

### 1.2 코드로 고친 부분 (10-20 완료, prod 반영)

| 항목 | 조치 | 검증 |
|---|---|---|
| FAQ 답변 미노출 | 닫힌 아코디언(AnimatePresence)이라 답변이 DOM에 없음 → 네이티브 `<details>/<summary>` 전환 | 닫힌 6개 답변 전부 HTML 등장(grep 1건씩) |
| 히든 에러 문자열 | `invisible` 에러 문구가 DOM에 남아 텍스트 추출기에 혼입 → `&nbsp;`만 렌더 | HTML grep 0건 |
| JSON-LD 부재 | `src/lib/landingJsonLd.ts` 신설 — Organization / SoftwareApplication(가격 3종·featureList 8개) / FAQPage(7쌍) | 브라우저 파싱 3종 확인 |
| 메타 타이틀 | Title Case → sentence case, 아포스트로피 U+2019(엔티티 노출 방지) | prod `<title>` 실측 |
| OG 이미지 | shortreal.ai URL → `public/og/og.jpg`(own 도메인, 1200×630) | prod `og:image` 실측 |
| robots / sitemap | `public/robots.txt`(Allow /, Disallow /api/ /callback/ /dev/ + sitemap 선언), `public/sitemap.xml`(랜딩+약관 3종) | prod 200 확인 |

### 1.3 남은 병목 — 이건 코드로 안 된다

AI 답변은 **RAG라 인덱싱된 제3자 소스에서만** 우리를 꺼낼 수 있다. 제3자 소스가 0이면 어떤 모델도 "AI 광고 크리에이티브 툴" 답에 TailoredAd를 넣을 수 없다.
→ **디렉터리 등록(1단계) + 직접 콘텐츠(2단계) + 외부 언급(3단계)이 해법.**

### 1.4 인용 메커니즘 (중요 — 어디에 등록할지가 여기서 갈림)

- AI는 **문단**을 인용한다. **표의 한 칸은 인용 못 한다.**
- 따라서 "도구 목록 한 줄"만 있는 디렉터리는 인용 가치가 낮고, **리뷰·비교글**에 이름이 실리면 인용된다.
- 근거(조사): AIToolsRecap은 자사 비교글에 "ChatGPT and Perplexity cite it. Does your tool?"라고 문장을 박아넣었고, 820+ AI citations을 표방한다.
- 경쟁사들도 같은 패턴을 하고 있다: `wireflow.ai/blog/best-adcreative-ai-alternatives-2026`, `adroast.ai/alternatives/pencil`, `omneky.com/newsroom/...`, `superscale.ai/compare/...`
  → **이 페이지들이 지금 AI가 인용하는 실제 형태.** 2단계는 이걸 직접 만드는 일.

### 1.5 경쟁사 지도 — 우리 포지션

| 축 | 제품 | 가격 | 비고 |
|---|---|---|---|
| 스태틱 대량 + 성능 스코어 | **AdCreative.ai** | 무료티어+유료 | 이 부류의 지배자. 김이 리포트에도 나옴 |
| UGC 영상 | Creatify($39)·Arcads($110) | — | 영상은 우리가 안 건드림 |
| 예측 스코어링 | Pencil | $14~ | |
| 저가 소규모 | Predis.ai | ~$32 | |
| 디스플레이/HTML5 | Creatopy | $36 | |
| 엔터프라이즈 DCO | Omneky($25~99)·Smartly.io | 수천만 | |
| UGC 실사 | Icon / Superside / Rocketium / Zeely / AdRoast / Hunch / Flair / Wireflow / Superscale | 다양 | |

**포지션 갭 (우리가 차지할 자리)**: 전부 "영상"·"대량 변형"·"엔터프라이즈" 쪽이다. **"스틸 이미지 + 결정적 타이포/로고 + 건당 과금 + 미사용 소멸 없음"** 구간은 사실상 비어 있다.
추가로 경쟁사들이 "크레딧 롤오버"를 판매한다는 것(Omneky)이 **"월 크레딧 소멸 = 마케터의 진짜 불만"**임을 보여준다 → 우리의 "unused images never expire"는 그 불편을 정면으로 해결한다. **코피 자산으로 쓸 수 있는 차별점.**

### 1.6 자사 포지셔닝 원칙 (카피 규칙)

- **브랜드 기본 테마 = 라이트** → OG 카드도 라이트 채택(10-20). 카드→랜딩 연속성.
- **Company/Developer = "Jaeho Lee"**, 제품명 = "TailoredAd".
  근거: 디렉터리 리뷰 문단이 "TailoredAd is an AI ad creative studio **by Jaeho Lee**"처럼 사람이 읽는 문장이 되어야 한다. "TailoredAd by TailoredAd"가 되면 AI 냄새.
- **"TailoredAd"(한 단어) + "AI ad studio"** 를 외부 언급에서 고정 문자열로 심는다 (시맨틱 충돌 회피).
- **AI 냄새 금지**: em dash, "seamless/unlock/empower/revolutionary", "brand-consistent", "deterministically" 같은 세일즈/기술 buzzword. 랜딩 카피 de-AI 원칙과 동일(마침표로 끊기, 평서문).

---

## 2. 4단계 계획

| 단계 | 이름 | 한 줄 | 비용 | 기간 | 상태 |
|---|---|---|---|---|---|
| **1** | 디렉터리 등록 | 외부 목록에 올려 이름·링크를 남긴다 | 0원 | 1~2h | **진행 중** (Recap 제출 완료) |
| **2** | 직접 콘텐츠 | AI가 인용하는 형태(비교글·업종 페이지)를 직접 만든다 | 0원 | 1~1.5일 | 대기 |
| **3** | 베타 시딩 30 | 타깃에게 무료 1장을 준다 → 첫 유저·첫 후기 | $32 | 1일 | 대기 |
| **4** | 유료 증폭 | social proof가 생긴 뒤 돈을 쓴다 | $1~2k | 0.5일 | **2개월 차** (예산 밖) |

**PH(Product Hunt)는 안 한다** — 업보트 구걸이 필요하고(규칙상 금지·실질 효과 약함), 사장님 스타일 아님.
**유료 광고(hellyeah CLI 등)는 보류** — 측정(2단계 계기판) 없이 쓰면 학습 없이 소진.

---

## 3. 1단계 — 디렉터리 등록 (지금 여기)

### 3.1 대상 5곳 (조사 근거)

| 디렉터리 | 규모 | 비용 | 심사 | 링크 | 비고 |
|---|---|---|---|---|---|
| **AIToolsRecap** | DR 39~40 · 툴 1,143 · 비교글 259 · 리뷰 250 · 구글 노출 7.41M · **AI 인용 820+** · 월 12.5만 방문 · 2026-03 개척 | Basic **0원**(크레딧 10) / Growth $49/yr / Authority $99/yr | 3~5일 + 사람이 직접 써봄 | Growth에 dofollow | **AI 인용 특화**(스키마 markup·GSC 우선색인·비교글 포함) |
| **SaaSHub** | DR 68~70 · 월 56.4만 PV | **0원** | 1~7일(큐 32일 说 있음) | dofollow 여부 출처마다 상충 | **"X 대안" 쿼리**에 뜸. 경쟁사 8종 등록 필수 |
| **Dang AI** | DR 60 | **0원** | 1~3일 | dofollow | 무료 백링크 최고 DR |
| **Toolify** | DR 64~65 · 툴 26,000 · 월 수백만 | **0원**(익스프레스 $100은 24~72h) | 2~4주 | dofollow | 롱테일 검색 트래픽 |
| **There's An AI For That** | DR 72~77 · 툴 54,582 · 뉴스레터 250만 | **$49 1회**(심사비) | 1~2일 | 출처마다 상충 | 최대 오디언스·task 기반 검색. **무료 티어 없음**(X 월간 스레드 경로만) |

> 후속 후보(0원): Futurepedia(DR 62, 무료~유료 확인 필요), AI Valley(DR 45), TopAI.tools(DR 58), AIxploria, OpenTools, Smol Launch, RankmyAI, AI Valley.

### 3.2 AIToolsRecap 조사에서 나온 함정 2개 (중요)

1. **81개 이미지 툴 중 리뷰 붙은 건 8개뿐** (Midjourney 13, Mage 2, GPT Image 2 2, 나머지 1개씩). 나머지 73개는 `0 reviews / 0 articles / 0 compared`.
   → 리스팅만 올리면 **눈에 안 띄는 한 줄**이 된다.
2. **우리 경쟁사 7종이 아예 미등재**: AdCreative.ai·Creatify·Pencil·Predis.ai·Omneky·Zeely·AdRoast 전부 없음 (Canva·Midjourney·FLUX 같은 일반 이미지 툴만 있음).
   → "비교글 포함"(Comparison Inclusion)의 이득이 **우리 카테고리에는 적용이 안 된다** (광고 크리에이티브 비교글이 이 사이트에 존재하지 않음).
   → 그래서 **Growth $49/yr는 보류**. Basic(0원)만 올리고, 리뷰가 붙은 뒤(3~5일) 판단한다.

### 3.3 제출 키트 (한 벌 만들어 재사용)

| 항목 | 값 | 상태 |
|---|---|---|
| Tool Name | `TailoredAd` | ✅ |
| Website URL | `https://tailoredad.com` | ✅ |
| Category | `Image AI` | ✅ (Nano Banana·Midjourney·FLUX·Recraft·DALL·E 전부 이 칸. 마케팅 칸은 이 사이트에 없음) |
| Pricing Model | `Freemium` | ✅ |
| Company / Developer | `Jaeho Lee` | ✅ |
| Short Description | `Ad images for teams without a designer. Upload a product photo, get stills for every format, with the type and logo placed exactly. You pay per finished image.` | ✅ |
| Full Description | (아래 전문) | ✅ |
| Key Features | (아래 11줄) | ✅ |
| Best For / Use Case | `Marketers`, `Businesses` | ✅ (Designers 넣으면 안 됨 — 우리 타깃은 "디자이너 없는 팀") |
| Tags / Keywords | `ai ad generator, ad creative, social media ads, product photo, marketing images, ad banner, brand kit, ecommerce ads` | ✅ |
| Platform | `Web` | ✅ (API·모바일·확장 없음) |
| Integrations | (비움) | ✅ |
| Starting Price | `$19/month` | ✅ (첫 달 $9.50 프로모션은 반복 가격 $19가 정답) |
| Free Trial Available | `Yes` | ✅ (Freemium 아님 — 10장 1회성 트라이얼) |
| Founded Year | `2026` | ✅ |
| Logo | `public/logo/logo-512.png` | ✅ 자동 인식됨 |
| 스크린샷 3~5장 | 2400×1260 카드 1장 확보, **제품 화면 2~3장 필요** | ⬜ |

**Full Description 전문 (190 words, AI 냄새 제거 완료)**
```
TailoredAd turns a product photo into finished ad images. You upload the product and your logo, and it makes stills for 1:1, 4:5, 9:16, 16:9, Story and banner, all from one layout.

You do not get one image per idea. TailoredAd generates a batch, checks the batch, and shows you the best one or two. Checking is the product, so the rest of the batch is our cost, not yours.

Headlines, calls to action and logos are placed after the image is made, not painted into it by a model. That is why the type stays exact and why the logo looks the same in every scene. The product keeps its color, shape and label across every format.

You pay for finished images. Not for downloads, not for a month. Starter is $19 for 100 images, Growth $49 for 500, Pro $99 for 1,000. Unused images do not expire. Editing and downloads are free. A failed generation costs nothing. Ten images are free, with no card.

People in the ads are generated. Real faces are never composited.

Start at tailoredad.com.
```

**Key Features 11줄**
```
Ad images from one product photo and logo
1:1, 4:5, 9:16, 16:9, Story and banner from one layout
Batches of candidates, only the best one or two shown
Headline, CTA and logo placed after the image is made
Exact type, no AI letter artifacts
Product and logo consistent across every scene
Pay per finished image
Unused images never expire
Failed generations cost nothing
Unlimited downloads, free editing
10 free images, no card required
```

### 3.4 SaaSHub용 별도 설명 (오디언스가 다름)
SaaSHub 독자는 "팀 단위로 도구를 고르는 구매자"다. TAAFT용 문구 재사용 금지 — **SaaSHub용 150~300자 설명을 따로** 쓴다(보안·팀 단위·가격 티어 중심).

**경쟁사 8종 목록 (SaaSHub 등록 필수, 정직하게)**: AdCreative.ai · Creatify · Pencil · Predis.ai · Omneky · Canva · Zeely · AdRoast

**차단 요소**: SaaSHub 소유권 검증 = **tailoredad.com 도메인 주소의 이메일** 필요. 지금 `support@tailoredad.com`이 없어서 막힌다.
→ **Cloudflare Email Routing으로 10분 설정** (G2·Capterra 등에도 필요 + 런칭 체크리스트의 미해결 항목이기도 함).

### 3.5 TAAFT $49 — 결정 전 확인
TAAFT는 JS 렌더링이라 서버로는 경쟁사 등재 여부를 확인할 수 없다. **사장님이 브라우저에서 "ad creative" 검색**해서 AdCreative·Creatify가 뜨는지 보고 결정. 뜨면 우리도 옆에 있어야 하는 곳이고, 안 뜨면 $49 근거가 약해진다.

### 3.6 1단계 남은 작업
- [ ] SaaSHub 계정 + 제출 (경쟁사 8종, 소유권 검증)
- [ ] Dang AI 계정 + 제출
- [ ] Toolify 계정 + 제출
- [ ] 스크린샷 2~3장 촬영(사장님 브라우저) → `public/preview/`에 두고 파일명 전달 → 나머지 갤러리 카드는 내가 OG 파이프라인으로 합성
- [ ] TAAFT: 사장님 브라우저로 "ad creative" 검색 → 경쟁사 등재 확인 → 결정
- [ ] Recap: 3~5일 후 리뷰 붙었는지 확인 → Growth $49 업그레이드 판단

---

## 4. 2단계 — 직접 콘텐츠 (AI 인용의 지속 경로)

### 4.1 왜 이것이 핵심인가
디렉터리 리스팅은 1회성이지만, **직접 만든 검색 페이지는 계속 AI가 인용하는 문단이 된다.** 경쟁사가 wireflow·adroast로 하고 있는 것이 정확히 이거다.

### 4.2 1차 범위 (제안 — 승인 후 착수)
| 라우트 | 내용 |
|---|---|
| `/alternatives/adcreative-ai` | AdCreative.ai 대안 — 가격·특징·언제 쓰는지 실제 비교 + 우리 강점 |
| `/alternatives/creatify` | Creatify 대안 (UGC 영상이 필요 없는 사람용) |
| `/alternatives/predis` | Predis.ai 대안 (저가 소규모 팀용) |
| `/ad-creative/ecommerce` | 업종별 — 전자상업 광고 크리에이티브 |
| `/ad-creative/skincare` | 업종별 — 스킨케어 브랜드용 |

각 페이지 구성: 정직한 비교(가격·특징·한계) + 우리 강점(건당 과금·미사용 소멸 없음·결정적 타이포·로고 일관성) + 실제 결과물 이미지 + FAQ + JSON-LD(Article/FAQPage) + 내부링크.

### 4.3 작업 방식
- SSG 정적 생성(Next.js App Router) — 빌드 타임에 HTML 생성 → CDN 엣지 캐시(`s-maxage`)
- 각 페이지 `sitemap.xml` 자동 포함 + canonical + OG
- 사이트맵에 자동 편입되도록 `src/app/sitemap.ts` 또는 `public/sitemap.xml` 갱신
- **사장님 확인 항목**: (1) 비교 대상 툴 선정 (2) 업종 3~5개 (3) "우리가 왜 다른지" 한 줄 (4) 최종 카피 eyeball

### 4.4 추가 후보 (2단계 확장)
- `llms.txt` — AI 크롤러용 평문 요약 (10분)
- `/blog` — 실전 사용법·팁 콘텐츠 ( juncture: AI가 제품 사용법까지 인용)
- comparison/industry 페이지에서 Image AI 카테고리 진입(수익은 작지만 AI 색인 지표)

---

## 5. 3단계 — 베타 시딩 30곳 ($32)

### 5.1 컨셉: "팔아주세요"가 아니라 "만들어드릴게요"
사장님 성격상 콜드 세일즈는 부담. 그래서 **타깃 브랜드 제품으로 1장씩 만들어 첨부**하고 "무료로 1장 만들어드렸습니다"로 접근한다. 도구 제품이기에 가능한 인사.

### 5.2 타깃 선정 기준
- 업종: DTC 스킨케어·프리미엄 커피·보틀 위스키·피트니스 용품·홈리빙스 (랜딩 이미지의 톤과 맞고 반복 구매로 이미지가 잦은 업종)
- 규모: 매출 100만~5000만 달러 (팀이 있는 곳 = 디자이너가 없거나 못 쓰는 곳)
- 연락: founders/marketing lead
- 리스트 소스: **explee의 B2B DB(105M+ CEO 컨택트)** — 발송 도구가 아니라 "찾는 도구"로만 사용. (explee = 자동 세일즈 에이전트 / 750통당 $0.04 / 무료 크레딧 $30)

### 5.3 실행 흐름
1. explee 가입 → 사이트 URL로 캠페인 생성 → 타깃 30곳 추출 (또는 세그먼트 익스플로러)
2. **내가** 각 타깃 제품 이미지 수집·크리에이티브 1장 생성(생성비 1장 $0.05 내외) → 캡처
3. **내가** 메일 카피 3안 작성 (제목·본문·CTA) → 사장님 승인
4. **사장님** 직접 발송 (자동 발송 아님)
5. 응답 오면: 10장 무료 크레딧 or 1장 추가 제작 제안 → 피드백·증언 수집

### 5.4 기대값(솔직)
- 비용: explee $30 + 생성비 $2 = **$32 (약 4만 원)**
- 전환: 30통 중 응답 3~6건 → 트라이얼 1~3명
- **진짜 목표는 숫자가 아니라 대화 10건과 첫 증언 1개.** 증언이 4단계(유료 증폭)의 연료다.
- **주의**: 자동 대량 발송은 스팸으로 간다. 30통 수작업이 맞다.

---

## 6. 4단계 — 유료 증폭 (2개월 차)

### 6.1 unfair.so (크리에이터 유료 quote)
- 개별 quote $20~250 / 캠페인 패키지 예시 $2,200 → 22명 → 480K 임프레션
- "구걸"을 돈으로 대체하는 유일한 방법 (사장님 스타일 저격)
- **기대값(솔직)**: $1~2k → 방문 1,800명 → 트라이얼 55~110 → 유저 3~7명. **환산으론 손해.**
  산출물은 "X 포스트가 인덱싱되어 AI가 인용하는 3rd-party 소스"와 백링크. **2단계의 목적을 1~2k로 즉시 사는 것.**
- 선별 기준: 사이트가 크리에이터 오디언스를 분석해준다("AI creators 31명, AI founders 34명"). **마케터·AI交集 오디언스만** 고를 것 (팔로워 수 말고 정합)
- Launch 시간: US 오전 9~11시 = KST 자정~오전 2시 (사장님 취침 시간 → 캠페인은 예약, 사장님은 아침에 댓글 응대)

### 6.2 그 외 유료 옵션
| 옵션 | 비용 | 비고 |
|---|---|---|
| Reddit 광고 | $100~200 테스트 | 서브레딧 타겟. 실제 관심층만. $1~2 CPC 수준에서 트라이얼 소수 |
| TAAFT $49 1회 | $49 | 1단계에 이미 포함 |
| PH 광고(featured) | $50~200/일 | PH 시청층=메이커, 우리 타깃과 미묘하게 어긋남 |
| hellyeah(Google Ads) | — | **보류**: LTV/CAC 나오기 전. 측정(2.6) 붙고 나면 |

### 6.3 2개월 차에 들어가기 위한 조건 (미달하면 안 함)
- [ ] 트라이얼 사용자 5명 이상
- [ ] 증언·스크린샷 3개 이상
- [ ] LTV 추정 가능(평균 재구독 or 업그레이드율)

---

## 7. 계기판 (측정) — 이미 준비됨

| 도구 | 무엇을 보는가 | 비용 | 상태 |
|---|---|---|---|
| **Cloudflare Web Analytics** | 방문자·PV·**referrer**(어느 사이트에서 왔나)·실사용자 LCP/INP/CLS | 0원 | 스니펫 추가 완료(develop `9152c6c`) → **prod 배포 대기** |
| **UTM → 우리 DB** | 각 유저의 **정확한 채널**(reddit/디렉터리명 등) + 가입까지. `users.utm_source/medium/campaign/content` | 0원 | develop `746e8d3` → **prod SQL 실행 + 배포 대기** |

**왜 둘 다 필요한가**: CF는 referrer 단위(우리 통제 밖), 우리 DB는 UTM 단위(정확한 귀속).
**왜 아직 0인가**: 트래픽 자체가 없음. 계기판은 차가 오는 중 — 1단계부터 채널이 열려야 의미 생김.

**prod 반영에 필요한 사장님 작업 2가지**
1. Neon 콘솔 → prod 브랜치 → SQL Editor → `db/neon/04_analytics.sql` 실행 (users에 UTM 컬럼 4개)
2. 배포(릴리즈 머지) — 내가 진행, `--no-ff` 머지 후 deploy + beacon 주입 확인

**참고**: HTML이 엣지에 1년 캐시(`s-maxage=31536000`)라 배포 후 옛 HTML이 남으면 beacon이 안 보일 수 있음 → 그때 캐시 퍼지 1회.

---

## 8. 하지 않는 것 (결정 기록)

| 안 하는 것 | 이유 |
|---|---|
| **Product Hunt 런치** | 업보트 구필 필요(규칙상 금지, PH는 협조 업보트를 추적·탈락), 오디언스 0이면 #195위 실측 사례, 4주 사전 준비 필요 |
| **업보트 부탁 DM** | PH 규칙 위반. "살펴보고 의견 남겨줘"만 가능 |
| **자동 대량 콜드메일(explee 발송)** | 사장님 성격 저격 + 콜드 DM 자체가 부담.  explee는 **리스트 추출 도구로만** 사용 |
| **유료 광고(Google Ads 등)** | 측정·LTV 없이 소진. 계기판 붙고 LTV 나온 후 |
| **이메일 수집 폼(랜딩)** | 사장님 지시로 철회(10-20). 계측은 UTM+Web Analytics로 충분 |
| **다크 OG 카드** | 브랜드 기본 테마=라이트. 다크는 앱 다크모드(#0A0A0B)도 아닌 제3의 표면 |
| **크레딧 부스트(Fatured Homepage·Category Top·Boost)** | 1회성 트래픽 부스트. 월 12.5만 방문 사이트에서 효과 제한적. Growth $49도 비교글 근거가 없어 보류 |
| **"AI 냄새" 카피** | em dash·buzzword·세일즈 문장. 랜딩 카피 de-AI 원칙과 동일 |

---

## 9. 일정 (2개월)

| 주차 | 할 일 | 담당 |
|---|---|---|
| **W1** | 1단계: SaaSHub·Dang AI·Toolify 제출(0원) + 스크린샷 2~3장 촬영 + 도메인 이메일 설정 | 사장님(계정·촬영) + 저(카피·합성) |
| **W1** | Recap 리뷰 결과 확인 → Growth 업그레이드 여부 판단 | 사장님 |
| **W1** | prod SQL 실행 + 릴리즈(UTM·Web Analytics) | 사장님(SQL) + 저(배포) |
| **W2** | 2단계: 비교글 3장 + 업종 페이지 2장 (SSG) | 저(구현) + 사장님(카피 승인) |
| **W2** | 3단계: 타깃 30곳 선정 + 크리에이티브 30장 + 메일 카피 | 저 + 사장님(발송) |
| **W3** | 3단계 실행 + 응답 관리 + 첫 증언 확보 | 사장님 |
| **W4** | 검색 재실측(Kimi/ChatGPT) — 1단계·2단계 반영 확인 | 사장님 |
| **M2** | 조건 충족 시 4단계(unfair.so $1~2k) | 사장님 판단 |

**KPI(측정 가능한 것)**
- 디렉터리 게시 수: 목표 4곳(Recap·SaaSHub·Dang AI·Toolify)
- 비교글/업종 페이지: 5장
- 유입: 방문자/일, referrer 분포
- 트라이얼 가입 수, 유료 전환 수
- AI 인용 출현(카테고리 질의 3종을 4주 간격으로 재실측 — 10-20 실측이 기준선)

---

## 10. 결정 로그

| 날짜 | 결정 | 이유 |
|---|---|---|
| 10-20 | 이메일 수집 폼 철회 | 사장님 지시. 계측은 UTM+Web Analytics로 대체 |
| 10-20 | OG 카드 **라이트** 채택 | 브랜드 기본 테마 정합 + 카드→랜딩 연속성 + 대다수 공유 UI가 밝음 |
| 10-20 | Company/Developer = **Jaeho Lee** | 리뷰 문단이 사람이 읽는 문장이 되어야 함("TailoredAd by TailoredAd" 방지) |
| 10-20 | Recap Growth $49 **보류** | 비교글이 우리 카테고리에 없고 경쟁사 7종 미등재 → 비교글 인센티브 근거 없음 |
| 10-20 | **PH 스킵** | 구필·규칙위반·효과 약함. 사장님 스타일 아님 |
| 10-20 | 1단계를 디렉터리로 확정 | 트래픽 생성 + AI 인용 소스 2-in-1. 순서 1→2→3→4 |
| 10-21 | **Marc Lou 모델**(제작자 + 다수 제품)로 방향 | 청중·신뢰·비용 구조상 개인 브랜드 하의 제품이 현재 상황 최적. 제품명 TailoredAd는 유지(카테고리 키워드·도메인·AI 인용 엔티티 일치) |

---

## 11. 참고: 조사한 서비스 3곳 요약 (10-20)

| 서비스 | 정체 | 우리와의 관계 |
|---|---|---|
| **explee.com** | AI 콜드아웃 세일즈 에이전트(구 AutoGTM). URL 넣으면 시장 조사→ICP→리드 발굴→맞춤 이메일→미팅 예약. $0.04/이메일, $30 무료 크레딧, 105M+ CEO 컨택트, 97% 인박스율(워밍된 도메인 풀 발송). **프로그래밍 SEO**(/b2b-database/locations/*)가 트래픽 엔진 | 경쟁자 아님 — **3단계의 타깃 리스트 추출 도구**로만 사용. 자동발송은 안 씀 |
| **unfair.so** | 크리에이터 마케팅. 크리에이터가 **동시에** quote-post → 피드 알고리즘 폭발. quote $20~, $99/249/990 플랜. 사례: treg13 2.82M 뷰, unfair 자체 231K 뷰·1,140% ROI·1,800명 방문·50+ 데모 | **4단계 채널** — "구걸"을 돈으로 대체. 단 2개월 차에 social proof가 있을 때 |
| **hellyeahai.com** | AI 퍼포드미디어 플랫폼. URL 하나로 프리감사→전략·크리에이티브·캠페인 생성→승인→론칭→매일 최적화(에이전트 로그). AIMA 엔진. FAQ: "AI ad creative tool은 이미지 생성에서 멈춘다. 우리는 풀 페이드 워크플로를 돌린다" | 경쟁자 아님(전면 워크플로 보유). **사장님께 CLI 스킬이 이미 설치**됨. 유료 광고는 보류(측정 전). 자기 FAQ가 우리를 정확히 분류 → 이미지+카피에서 "생성까지만" 포지셔닝 명확히 함 |

---

## 12. 관련 파일

| 파일 | 내용 |
|---|---|
| `src/lib/landingJsonLd.ts` | 랜딩 JSON-LD 3종 (Organization/SoftwareApplication/FAQPage) |
| `public/robots.txt` | 크롤링 규칙 + sitemap 선언 |
| `public/sitemap.xml` | 랜딩 + 약관 3종 |
| `public/og/og.jpg` | OG 카드(라이트, 2400×1260) |
| `src/components/page/ad/landing/LandingPageClient.tsx` | UTM 캡처 호출 |
| `src/lib/utm.ts` | UTM 저장·소비 |
| `src/app/api/subscribers/` | (철회됨 — 참고용으로 없음) |
| `db/neon/04_analytics.sql` | prod 실행 대기 (users UTM 컬럼 4개) |
| `src/app/layout.tsx` | Cloudflare Web Analytics 스니펫 |
| `src/app/dev/og/page.tsx` | OG 카드 캡처 개발 페이지(디렉터리용 갤러리 제작 재사용) |
| `OPTIMIZATION_PLAN.md` | 메모리·비효율 최적화 계획(마케팅과 별개 트랙) |
