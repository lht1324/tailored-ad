# TailoredAd — 마케팅 계획서

*Last Updated: 2026-10-24 · 작성: AI 에이전트 · 상태: 2단계 구현 중 — 콘텐츠 시스템 완료 · 글 1 초안 검수 대기*

> 이 문서는 TailoredAd(tailoredad.com)의 **발견 가능성(discovery) 확보** 계획이다.
> 진단 근거: 사장님이 2026-10-20에 Kimi K3로 실행한 검색 실측 + 직접 조사한 서비스 + **stork.ai의 2026-10 실측 디렉터리 해부표**(Tranco 트래픽 순위·DR·실제 HTML rel 속성까지 읽은 데이터).
> **예산: 10~20만 원** (≈$74~148). 이 안에서 최대 효과.
> **원칙: 설명 → 컨펌 → 작업.** 사용자 화면에 보이는 변경은 항상 별도 승인을 받는다.

---

## 0. 한 줄 요약

> 코드는 읽히고 빠르고 맞게 보이게 준비됐다. 남은 건 **"사람이 우리를 찾을 통로"**다.
> ① 디렉터리(0원) → ② 자사 콘텐츠(0원) → ③ 첫 사용자·증언($32) → ④ 유료 증폭(2개월 차).
> **순서 근거: 유통(③의 산출물 = 증언)이 유료(④)의 전제.** 증언 없이花钱하면 안 산다.

---

## 1. 전체 로드맵 (한 화면)

| 단계 | 이름 | 산출물 | 비용 | 담당 | 상태 |
|---|---|---|---|---|---|
| **0** | 코드·성능·결제·SEO 기반 | 결제가 실제로 되고, 페이지가 읽히고, 빠른 상태 | 0원 | — | ✅ 완료 (Dodo 실결제 E2E 통과) |
| **0.5** | 계기판 (측정) | 어느 채널에서 사람이 왔는지 | 0원 | 사장님(SQL 1회) + 저(배포) | ✅ Web Analytics prod 동작 중 · UTM 코드 배포됨 (SQL 실행만 남음) · HTTPS 301 수정 완료 |
| **1** | 디렉터리 등록 | 4곳 등재 + dofollow 링크 | 0원 | 사장님(계정·제출) + 저(카피) | ✅ **Recap·SaaSHub·Bro Find AI·Future Tools 4곳 제출 완료** |
| **2** | 직접 콘텐츠 (비교글·업종 페이지) | AI가 인용할 문단을 우리 도메인에 | 0원 | 저 | 🔄 **콘텐츠 시스템 완료 · 글 1 초안 검수 대기 · 나머지 5장 대기** |
| **3** | 베타 시딩 30곳 | 첫 유저 + 첫 증언 | $32 | 저(목록·크리에이티브) + 사장님(발송) | ⬜ 미착수 |
| **4** | 유료 증폭 | 실제 사용자 유입 | $1~2k | 사장님(결제) | ⬜ **2개월 차** (증언 생긴 뒤) |

**2개월 차로 미루는 것**: Toolify($99) · Dang.ai($49) · TAAFT($49) · Reddit 광고 · PH 광고 · hellyeah(Google Ads).

---

## 2. 왜 이 순서인가 (논리)

1. **3rd-party 소스 0이 유일한 병목** — 코드로 고칠 수 있는 건 10-20에 다 고쳤다(FAQ 노출·히든 문자열·JSON-LD·타이틀·OG·robots/sitemap). 남은 건 "남이 우리를 말해 주는 곳"을 만드는 일 = 1·2단계.
2. **인용은 문단 단위** — AI는 표의 한 줄을 인용 못 한다. 그래서 "목록 한 줄"이 아니라 **비교글이나 리뷰(문단)** 가 필요하다. 경쟁사(wireflow·adroast·superscale·omneky) 전부 이 형식. → 2단계가 지속 경로.
3. **증언이 유료의 전제** — 유료 채널은 "이미 쓴 사람이 말해 주는 제품"에서만 전환된다. 증언 0개 상태의 유료 spend는 학습 없는 소진. → 3단계가 4단계보다 앞.
4. **측정이 없으면 다음 달 돈을 못 정함** — 채널별 유입·전환을 봐야 어디에 돈을 쓸지 정해진다. → 0.5단계가 1단계와 동시에.

---

## 3. 0.5단계 — 계기판 (지금 가장 싼 완료 가능 항목)

| 도구 | 무엇을 보는가 | 비용 | 상태 |
|---|---|---|---|
| **Cloudflare Web Analytics** | 방문·PV·referrer·실사용자 LCP/INP/CLS | 0원 | ✅ prod 동작 중 (beacon 1개 확인) |
| **UTM → 우리 DB** | 유저별 정확한 채널 귀속(reddit/디렉터리명) | 0원 | 🟡 코드 배포됨 (prod). SQL 실행만 남음 (users에 UTM 컬럼 4개) |
| stork.ai/ai-visibility-check | AI 노출 기준선 측정 | 0원 | ✅ 완료 (2건 질의, 0건 인용) |
| HTTPS 301 수정 | http → https 리다이렉트 | 0원 | ✅ 완료 (Cloudflare Always Use HTTPS ON) |

**사장님이 하실 일 1가지**: Neon 콘솔 → prod 브랜치 → `db/neon/04_analytics.sql` 실행 (users에 UTM 컬럼 4개 추가).
→ 이후 내가 릴리즈 머지 + 배포 + beacon 주입 확인.

---

## 4. 1단계 — 디렉터리 등록

### 4.1 판정 기준 (stork.ai 10월 실측 기준)
| 기준 | 의미 |
|---|---|
| **Tranco 트래픽 순위** | 실측 트래픽. DR만 높고 순위 밖 = "방문자 없는 백링크 공장" |
| **리스팅 깊이** | 한 줄 행인지, 문단(인용 가능)이 있는지 |
| **free 티어의 함정** | 역링크 요구·몇 달 대기·free 사라짐 등 |
| **dofollow 실제값** | 가격표가 말하는 것과 HTML의 `rel`이 다르면 후자가 진실 |

### 4.2 대상 (10-22 재조사 + 10-21 실측 보강)

| 디렉터리 | DR | 트래픽 순위 | 비용 | 판정 |
|---|---|---|---|---|
| **AIToolsRecap** | 39-40 | (측정 밖) | **0원** | ✅ **제출 완료**. 비교글 = AI 인용 가능한 형태. Growth $49는 비교글 부재로 보류 |
| **SaaSHub** | 68-70 | (측정 밖) | **0원** | ✅ **제출 완료**. "X 대안" 페이지 = 구매의도 트래픽(2014~, 25만 제품) |
| **Bro Find AI** | — | (측정 밖) | **0원** | ✅ **제출 완료**. 즉시 게시 + 블로그 게스트포스트(Jaeho Lee 이름) + 블루티크 인증. 이름 충돌 3개 → 기대값 낮게 |
| **Future Tools** | 69 | **#189,099** | **0원** | ✅ **제출 완료**. 진짜 무료·사람 검수(Matt Wolfe). 4,351 리스팅. 승인 보장 없음 |
| ToolScout.ai | — | (측정 밖) | 0원 | ⭕ 시간 날 때 |
| BAI.tools | — | (측정 밖) | 0원 | ⭕ 시간 날 때 (한국어 폼 있음) |
| ~~TAAFT~~ | 77 | #29,633 (1위) | $49 | ❌ **스킵** — 실트래픽 1위지만 free row는 안 보이고(가시성은 유료 레이어 케이크), 광고 카테고리 2만 3천 개 희석. $49 = 가장 싼 층이 무의미 |
| ~~Toolify~~ | 72 | #54,062 | $99 | ❌ **스킵** — "Google 링크스팸 정책이 이름붙인 것"(dofollow 6개 판매). Cloudflare 차단 |
| ~~Dang.ai~~ | 81 | #228,281 | $49 | ❌ **스킵** — free 티어가 역링크 크롤 강제(우리 사이트에 역링크 심으면 삭제됨) + NSFW 카테고리 맥락 |
| ~~Fazier·AI Toolz Dira~~ | 82·66 | #210K / 밖 | 0원 | ❌ reciprocal-link 세금 |
| ~~Turbo0·Good AI Tools~~ | 80·74 | #330K·#749K | $17~$25 | ❌ dofollow 광고하지만 실제 HTML은 nofollow |
| ~~TopAI.tools~~ | 64 | #197,489 | $47 | ❌ free 티어 2026에 사라짐 |
| ~~AI Tool Hunt~~ | 55 | 밖 | — | ❌ 5월부터 전 페이지 404 (리스트클엔 여전히 추천) |
| AlternativeTo | — | — | 0원 | ⬜ 미조사. SaaSHub와 같은 "대안" 메커니즘이라 후순위 후보 |

### 4.3 제출 키트 (한 벌, 재사용)
| 필드 | 값 |
|---|---|
| Product name | `TailoredAd` |
| Website | `https://tailoredad.com` |
| Tagline (≤80자) | `Turn a product photo into on-brand ad images` |
| Category | `Marketing` (TAAFT류는 `SEO & Marketing`/`Advertising`) |
| Pricing | `Freemium` (10장 무료) |
| Starting price | `Free 10 images, then $19/mo for 100, $49/mo for 500, $99/mo for 1,000. First month $9.50.` |
| Email | `support@tailoredad.com` (도메인 이메일 — 일부 디렉터리는 gmail 거부) |
| Logo | `public/logo/logo-512.png` |
| Screenshots | 랜딩 히어로·Projects·Create 3장 (SaaSHub 업로드본 재사용) |
| 대안 목록 | AdCreative.ai, Creatify, Pencil, Predis.ai, Omneky, Canva, Zeely, AdRoast |
| Q&A 6쌍 | `process/route.ts` 근거: 배치 품질 게이트 / 미사용 소멸 없음 / 실패분 무료 / 결정적 타이포 / 1회성 무료 10장 / 로고 픽셀 정확 |
| Story | SaaSHub Q&A 답변을 launch story로 각도만 바꿔 재사용 |

### 4.4 SaaSHub 제출 함정 (실측)
편집 화면 미리보기는 **마크다운 목록을 벽으로 렌더하는 버그**가 있음. 공개 페이지는 정상(`/geocopy`에서 `<li>` 10개 실측). → 미리보기만 보고 판단하지 말 것. 빈 줄(문단 경계)로 끊으면 미리보기도 정돈돼 보임.

### 4.5 배지 = dofollow 전환 → **목적 달성 후 제거 (10-25)**
Bro Find AI 배지를 서버 렌더 HTML에 넣으면 링크가 **nofollow → dofollow**로 전환 + 블루티크. 푸터에 전용 행으로 배치(250×54 네이티브).
**10-25 실측 결과**: 리스팅 "Verified" 3곳 표시(블루틱 획득) + 리스팅 링크 `rel="noopener noreferrer"`(nofollow 아님 = dofollow 성립) — **목적 달성**.
**제거 판정: 실 > 득.** ① 배지가 "0 UPVOTES"를 모든 페이지에 노출 = 역사회증거(증언 0개 상태의 신뢰 형성과 정반대) ② 라이트 푸터에서 다크 카드가 시각적으로 지배 ③ 사이트 전체 푸터 링크를 그들에게 일방 기부. 유지 편익(저트래픽 디렉터리 dofollow 1개)보다 큼.
→ **푸터에서 배지 제거 (10-25, 사장님 승인).** 리스팅·백링크·블루틱은 그쪽 페이지에 남음. 인증 취소 여부는 정책 미명시 — 1~2주 뒤 curl 재확인, 취소 시 재부착·재인증으로 되돌릴 수 있음.

### 4.6 1단계 완료 (10-23)
- [x] 사장님: SaaSHub 제출 완료
- [x] 사장님: Future Tools 제출 완료
- [x] 사장님: Bro Find AI "Verify my badge" 완료
- [x] 사장님: 도메인 이메일 (support@tailoredad.com) 완료
- [x] HTTPS 301 수정 완료 (Cloudflare Always Use HTTPS ON)
- [x] GSC: https:// 색인 요청 + sitemap.xml 제출
- [x] AI 인용 기준선 측정 완료 (2건 질의, 0건 인용)

---

## 5. 2단계 — 직접 콘텐츠 (AI 인용의 지속 경로)

### 5.1 근거 (10-21 실측)
한국어 질의 "AI 광고 크리에이티브 도구 추천"의 AI 답변이 인용한 것:
```
Reddit 스레드 (r/FacebookAds — Meta 광고용 AI 툴 추천)
jenova.ai/resources/…   "2026년 디지털 광고 크리에이티브 디자인에 가장 적합한 AI…"
draph.art/ko/blog/…    "광고 만들어주는 AI, 마케터를 위한 실용적인 디자인 도구"
adgenai.com/ko-blog-posts/…  "크리에이티브 자동화 도구: 추천 및 도입 가이드"
```
→ **"best X for Y" 콘텐츠 페이지가 AI 인용 단위.** 경쟁사들도 전부 이 형식(wireflow·adroast·superscale·omneky).

### 5.2 1차 범위 (10-24 확정 — `/blog` 우산 + 글 6장 + llms.txt)
| 라우트 | 잡는 검색 | 유형 |
|---|---|---|
| `/blog` | (목록 페이지 — 섹션: Alternatives / By industry / Guides & lists) | 우산 대문 |
| `/blog/adcreative-ai-alternatives` | AdCreative.ai 대안 | 대안 비교 — **초안 구현 완료 (`5fec645`) · 사장님 검수 대기** |
| `/blog/creatify-alternatives` | Creatify 대안 | 대안 비교 |
| `/blog/predis-alternatives` | Predis.ai 대안 | 대안 비교 |
| `/blog/best-ai-ad-tools` | best AI ad creative tools | 카테고리 리스트클 (경쟁사 + 우리, 정직한 한 줄씩) |
| `/blog/ecommerce-ad-creative` | AI 광고 크리에이티브 (업종) | 업종 가이드 (멀티채널 셀링 관점) |
| `/blog/skincare-ad-creative` | 동일 (업종 2) | 업종 가이드 |
| `/llms.txt` | (AI 크롤러) | 요약 — ✅ **완료 (10-25)**. `src/app/llms.txt/route.ts`가 레지스트리에서 자동 생성 (force-static 프리렌더) |

**경로 결정 (10-23)**: 루트 흩뿌리기✗ · `/resources`✗(사장님: "보관함 느낌") · `/blog` 채택. 블로그지만 **페이지 본체는 판매 문서 틀** (날짜·저자 없음, CTA 반복). 중간 폴더 없이 목록 페이지 안에서 섹션 구분. URL은 색인 후 변경 금지 — 지금 결정이 최종.

**기준선 측정 결과 (10-22)**: 2건 질의 모두 0건 인용. 인용되는 형태 = Reddit 스레드 · "best X for Y" 콘텐츠 · 무료 툴 페이지. → 카테고리 리스트클(`/best-ai-ad-tools`)이 AI 인용의 핵심 단위.

**Amazon AI disclosure 각도 (10-23 신규)**: Amazon 2026-07-23 정책 — 사진처럼 생긴 AI 사람이 들어간 리스팅 이미지·A+ 콘텐츠는 IPTC 태그 필수 (NY synthetic performer법). AI 배경·소품·제품만 = 태그 불필요. 우리 product-only 모드 = 태그 불필요. → 카피 근거 + SEO 콘텐츠 각도 ("Amazon AI image rules 2026").

### 5.3 작업 방식 (10-24 — 시스템 구축 완료, `5fec645`)
- **동적 콘텐츠 시스템**: `src/app/blog/[slug]` + `generateStaticParams` SSG + `dynamicParams=false` (레지스트리 밖 슬러그 즉시 404).
  새 글 = `src/lib/content/blog/posts/` 파일 1개 + 레지스트리 1줄 → URL·목록·sitemap·JSON-LD 전부 자동.
- **데이터/로더 분리** (POST_ 프롬프트 패턴 준수): `types.ts`(규격) + `posts/*`(데이터) + `blogContentServerAPI.ts`(레지스트리·로더·빌드 타임 무결성 검증 — 슬러그 중복·오탈자·끊긴 내부링크 시 빌드 실패).
- 페이지당 JSON-LD(Article/Breadcrumb/FAQPage — FAQ는 본문과 단일 소스) + canonical + OG 자동.
- `src/app/sitemap.ts` 자동 생성으로 전환 (수동 `public/sitemap.xml` 삭제). lastmod = 글 updatedAt.
- 사장님 확인: 글 1 eyeball (dev 서버) · 랜딩 헤더·푸터에 `/blog` 링크 추가 여부 (현재 orphan — 화면 변경이라 승인 필요)

### 5.4 ★ 카피 제1원칙 — AI 냄새 제거 (10-25 사장님 지시. 모든 글에 적용)

> **글은 사람이 쓴 것처럼. AI가 쓴 것처럼 읽히는 순간 그 글은 신뢰를 잃고, 인용도 안 된다.**

**집필 전 체크리스트 (통과 못 하면 출고 금지):**
| # | 규칙 | 근거 |
|---|---|---|
| 1 | **엠대시(—) 0개.** 마침표·쉼표·콜론으로 쪼갠다. 단, metaTitle의 브랜드 구분자("— TailoredAd")는 브랜드 서식이므로 예외 | 09-22 랜딩 de-AI 선례 |
| 2 | **자기평가 부사 금지**: honest·honestly·genuinely·actually·really·simply. 증거(숫자·출처)가 말하게 한다 | "Honest breakdowns"류는 오히려 AI 지문 |
| 3 | **"X, not Y" 구문은 페이지당 1개 이하.** "typeset, not generated"류 연타가 최다 지문 | 스킬: confident over qualified |
| 4 | **3항 나열(triad) 연타 금지.** 리스트 길이를 2·3·4로 섞고 문장 길이도 섞는다 | "X, Y, and Z" 리듬 = 대표 AI 지문 |
| 5 | **격언식 표어 금지**: "Written to be quoted, not to rank", "The dividing line is...", "The short answer"류. 페이지당 1개 이하 | 뽀샵식 마무리는 AI 서명 |
| 6 | **같은 정보 두 번 말하지 않기** — subheadline과 섹션 제목이 같은 말 반복 금지 | 초안에서 "five minutes" 2회 발견 |
| 7 | **같은 형용사 반복 점검** — pixel-exact·deterministic 같은 브랜드 어휘도 본문 3회 초과면 줄인다 | |
| 8 | **스타카토 연타 금지** — 짧은 단문 3연속은 AI 리듬. 길이를 섞는다 | |
| 9 | **수동태·명사화 금지** — "-tion/-ment" 남용, "is generated"류. 능동으로 | 스킬: active over passive |
| 10 | **구체 숫자는 유지·출처 명시** — 구체성이 사람의 글이다. 가격·날짜·검증 출처를 쓴다 | 스킬: specificity over vagueness |

**퇴고 절차**: 초안 → 위 체크리스트 통과 → grep으로 엠대시·부사 잔여 검사(0건 확인) → 사장님 eyeball.

**10-25 글 1 적용 실적**: 엠대시 12→0, "honest/genuinely" 5→0, "X, not Y" 6→1(headline 1곳만 생존), 격언 표어 3→0, "five minutes" 중복 제거, "typos and warped glyphs" 3→2회.

### 5.5 참고: 한국어 경쟁자 3개 발견 (신규 인텔)
`draph.art(드랍아트)` · `nextify.ai` · `jenova.ai` — 한국어 AI 광고 툴이며 **한국어 AI 질의에서 이미 인용되고 있다.** 영어권은 AdCreative·Creatify가 쥐고 있으니, 한국어 콘텐츠로 진입하는 쪽이 빈틈일 수 있다. (우리 사이트는 영어 — 별도 결정 필요, 지금은 보류)

### 5.6 타겟 재정의 (10-23)
**지속 구매자 (LTV 높음)**: 소규모 DTC 브랜드 (1~10명 팀) — 신제품 정기 출시 + 브랜드 일관성 + 디자이너 부재. LTV $200~600/년
**첫 고객 (LTV 낮음)**: 글로벌 드랍쉬퍼 (광고型) — 제품 수명 2~6주, LTV $40~120/년. 첫 결제 용도로 좋음
**메시지 분리**: DTC 브랜드용 = "Brand-consistent ad creatives for teams without a designer" / 드랍쉬퍼용 = "Product photo → ad in 5 formats, exact type. Test 30 variants risk-free."

### 5.7 도달 방법 (채널 전략)
- **DTC 브랜드**: Google 검색 ("AI ad creative", "AdCreative alternative") → 2단계 SEO 콘텐츠가 주 채널
- **드랍쉬퍼**: 커뮤니티 (Facebook 그룹, Reddit, TikTok) → 3단계 시딩
- **공통**: 디렉터리 (SaaSHub, Bro Find AI, Future Tools, AIToolsRecap) + AI 검색 인용 (llms.txt)
- **하지 말 것**: PH 런치, TAAFT $49, Toolify $99, 100곳 스프레이, 측정 전 유료 광고

### 5.8 Shopify 조사 완료 (10-23)
Shopify = "누구나 온라인 가게를 열 수 있게 해주는 인터넷 상가 건물". 2025 GMV $378B, 매출 $11.6B, 활성 스토어 ~280~500만, 175+ 국가. 드랍쉬핑 = Shopify의 핵심 사용 사례. App Store = 유통 채널 (21,000+ 앱, $1.3B 개발자 지급). AI 광고 크리에이티브는 아직 내장 안 함 → TailoredAd의 자리 실재. App Store 진입은 3단계 이후 검증 뒤 결정.

---

## 6. 3단계 — 베타 시딩 30곳 ($32)

### 6.1 컨셉
"팔아주세요"가 아니라 **"만들어드릴게요"** — 타깃 브랜드 제품으로 1장씩 만들어 첨부. 도구 제품이기에 가능한 인사. 사장님 성격에 맞고, 콜드 세일즈가 아니다.

### 6.2 타깃 (10-23 재정의)
- **지속 구매자 (DTC 브랜드)**: 상품 20개 이상 + 네이버/쿠팡/메타 동시 운영 셀러 → "셀프웍스·셀웨이 쓰는 사람", "쿠팡+네이버 동시 운영"
- **첫 고객 (드랍쉬퍼)**: 글로벌 드랍쉬퍼 (광고型) — Meta/TikTok 광고 돌리는 셀러. LTV 낮지만 첫 결제 용도
- 규모: 매출 100만~5000만 달러 (팀이 있고 디자이너 없거나 못 쓰는 곳)
- 리스트 소스: explee B2B DB(105M+ CEO 컨택트) — **발송 도구가 아니라 "찾는 도구"로만 사용**
- 소요: 1일 / 비용 $30(발송) + $2(생성 30장)

### 6.3 기대값(솔직)
- 전환 1~3명, 대화 10건, **증언 1개**
- 정량 목표가 아니라 **증언 확보가 목표** (증언이 4단계의 전제)

---

## 7. 4단계 — 유료 증폭 (2개월 차)

### 7.1 unfair.so
- quote $20~250/크리에이터, $99/249/990 플랜, 케이스: 231K 뷰·1,140% ROI·1,800명 방문·50+ 데모
- 선별 기준: 팔로워 수 말고 **오디언스 정합** (AI creators·마케터)
- 시간: US 오전 9~11시 = KST 자정~오전 2시 (사장님 취침 시간 → 예약 후 아침에 응대)

### 7.2 진입 조건 (미달하면 안 됨)
- [ ] 트라이얼 5명 이상
- [ ] 증언·스크린샷 3개 이상
- [ ] LTV 추정 가능

### 7.3 그 외
Reddit 광고($100~200 테스트) · PH 광고(프런티어 안 함, 광고로만) · hellyeah(Google Ads) — 전부 계측 후.

---

## 8. 하지 않는 것 (결정 기록)

| 안 하는 것 | 이유 |
|---|---|
| PH 런치 | 업보트 구필(규칙위반)·이질감·4주 준비·오디언스 0 |
| TAAFT $49 | free row 안 보임(유료 레이어 케이크) + 2만 3천 개 희석 |
| Toolify $99 | Google 링크스팸 정책이 이름붙인 유형 |
| Dang.ai | free 티어 역링크 강제 + NSFW 맥락 |
| 역링크 요구 디렉터리(Fazier·AI Toolz Dira·Twelve Tools) | 우리 사이트를 조작당함 |
| dofollow 광고=실제 nofollow(Turbo0·Good AI Tools) | 시간 낭비 |
| 이��일 수집 폼 | 사장님 지시(10-20 철회). UTM+Web Analytics로 계측 |
| 다크 OG 카드 | 브랜드 기본 테마=라이트. 다크는 앱 다크모드(#0A0A0B)도 아닌 제3의 표면 |
| 유료 광고(측정 전) | 학습 없이 소진 |
| 자동 대량 세일즈 | 스팸 |
| 디렉터리 100곳 스프레이 | "살아있는 몇 개가 100개보다 낫다"(stork 실측) |

---

## 9. 10월 남은 것 (순서) — 10-23 갱신

1. [x] 사장님: 도메인 이메일 `support@tailoredad.com` 완료
2. [x] 사장님: SaaSHub 제출 완료
3. [x] 사장님: Future Tools 제출 완료
4. [x] 사장님: Bro Find AI "Verify my badge" 완료
5. [x] 사장님: HTTPS 301 수정 완료 (Cloudflare Always Use HTTPS ON)
6. [x] 사장님: GSC https 색인 요청 + sitemap.xml 제출
7. [x] 저: AI 인용 기준선 측정 완료 (2건 질의, 0건 인용)
8. [ ] 사장님: prod 브랜치에 `db/neon/04_analytics.sql` 실행 (UTM 기록 켜기 — 배포 불필요, 코드 이미 prod 배포됨)
9. [x] 사장님: `/blog` 글 6장 검수 통과 (10-25 "이상은 없어")
10. [x] 저: 블로그 콘텐츠 시스템 구축 완료 (10-24, `5fec645` — 동적 [slug]·레지스트리 분리·sitemap 자동화·JSON-LD·글 1 초안)
11. [x] 저: 나머지 글 5장 완료 (10-25, `fab6f41` — creatify·predis·best-ai-ad-tools·ecommerce·skincare)
12. [x] 저: 푸터에 Blog 링크 추가 (10-25, `8476002` — orphan 해소)
13. [x] 저: `/llms.txt` 완료 (10-25 — 레지스트리 자동 생성, force-static)
14. [ ] 저: 3단계 준비 — 타깃 30곳(DTC 브랜드 + 드랍쉬퍼) + 크리에이티브 30장 + 메일 카피
15. [ ] 사장님: 릴리즈 머지 + 배포 판단 (블로그 시스템 전체 + 배지 제거 + llms.txt 탑재)
16. [ ] 사장님: 3단계 발송 → 4단계 진입 여부 결정

## 10. 11월 (조건부)
- 4단계 유료 증폭(unfair.so 5~7 quote, $100~250)
- 2단계 확장: 업종 페이지 +10, "best AI ad tools" 页, llms-full
- 3단계 후기 testimonial을 비교글·landing에 반영

---

## 11. 결정 로그

| 날짜 | 결정 | 이유 |
|---|---|---|
| 10-20 | 이메일 수집 폼 철회 | 사장님 지시. UTM+Web Analytics로 계측 |
| 10-20 | OG 라이트 채택 | 브랜드 기본 테마 정합 + 카드→랜딩 연속성 |
| 10-20 | 디렉터리 Company = `Jaeho Lee` | 리뷰 문단이 사람이 읽는 문장이 되어야 함 |
| 10-21 | SaaSHub Q&A 3~6쌍 | 비교 페이지 Q&A가 AI 인용 단위 |
| 10-21 | TAAFT 스킵 | 실트래픽 1위지만 free row 무의미 + 희석 |
| 10-21 | Bro Find AI 3개만(무료) | 나머지는 소모/대기 대비 효과 미미 |
| 10-21 | dev/prod 빌드 폴더 분리(`.next-dev`) | 배포마다 dev 정지 필요했던 문제 영구 해결 |
| 10-21 | SaaSHub 미리보기는 버그 | 공개 페이지 정상 — 미리보기만 보고 판단 금지 |
| 10-22 | AI 인용 기준선 0건 | 2건 질의 모두 0건 인용. 인용 형태 = Reddit · best X for Y 콘텐츠 · 무료 툴 페이지 |
| 10-22 | HTTPS 301 수정 | http://가 200으로 서빙됨 → Cloudflare Always Use HTTPS ON → 301 |
| 10-23 | Amazon AI disclosure 규칙 | 2026-07-23 정책: synthetic performer 태그 필수. product-only 모드 = 태그 불필요 → 카피 근거 |
| 10-23 | 타겟 재정의 | 지속 구매자 = 소규모 DTC 브랜드. 첫 고객 = 글로벌 드랍쉬퍼. 메시지 분리 |
| 10-23 | Shopify 조사 완료 | GMV $378B, 매출 $11.6B, 175+ 국가. AI 광고 크리에이티브 미내장 → 자리 실재 |
| 10-23 | 1단계 완료 | Recap·SaaSHub·Bro Find AI·Future Tools 4곳 제출 완료 |
| 10-23 | `/blog` 우산 + 동적 [slug] 채택 | 루트 흩뿌리기✗·resources✗(보관함 느낌)·blog✓(선례 wireflow). 본체는 판매 문서 틀. 중간 폴더 없이 목록 섹션 구분 |
| 10-24 | 블로그 콘텐츠 시스템 (`5fec645`) | 새 글 = 파일 1개 + 레지스트리 1줄. 데이터/로더 분리(POST_ 패턴). sitemap 자동화. 레지스트리 밖 슬러그 404 |
| 10-24 | AdCreative.ai 가격 실측 검증 | 출처 4곳 교차 일치: $39/10크레딧·$249/50·$999/100. 2026년 Professional 크레딧 100→50 삭감(동일가). video·scoring은 $249 이상 |
| 10-25 | ★ 카피 제1원칙 채택 | AI 냄새 제거. 체크리스트 §5.4 (엠대시 0·자기평가 부사 금지·"X, not Y" 1개 이하·triad 금지·표어 금지). 글 1 전면 퇴고 완료 |
| 10-25 | Bro Find AI 배지 제거 | 목적(dofollow·블루틱) 달성 확인 후 실>득 판정 — "0 UPVOTES" 역사회증거 + 시각적 지배. 재부착 가능하니 되돌릴 수 있는 결정 |
| 10-25 | 블로그 글 6장 완성·검수 통과 |Creatify·Predis 가격 2026-10 개편 실측 반영 (구 리뷰와 다른 현재가). 원어민 관용구 자체 교정 4건 + 사장님 검수 통과 |
| 10-25 | llms.txt 레지스트리 연동 | 정적 파일 대신 `src/app/llms.txt/route.ts` 자동 생성 — 새 글 추가 시 무수정. gotcha: 가격은 PricingSection·landingJsonLd·llms.txt 삼중 관리 |

---

## 12. 관련 파일

| 파일 | 내용 |
|---|---|
| `src/lib/landingJsonLd.ts` | 랜딩 JSON-LD 3종 |
| `public/robots.txt` · `src/app/sitemap.ts` | 크롤링 규칙 + sitemap 자동 생성 (10-24부터 수동 파일 대체) |
| `src/app/llms.txt/route.ts` | AI 크롤러용 사이트 요약 — 레지스트리에서 자동 생성 (force-static). gotcha: 가격 삼중 관리 |
| `src/lib/content/blog/` | 블로그 콘텐츠 — types(규격)·posts(데이터)·blogContentServerAPI(레지스트리·검증)·blogJsonLd |
| `src/app/blog/page.tsx` · `src/app/blog/[slug]/page.tsx` | /blog 목록 + 본문 틀 (SSG, dynamicParams=false) |
| `src/components/page/blog/` | 블로그 템플릿 UI (Index·Post × Server/Client) |
| `src/lib/content/blog/posts/adcreativeAiAlternatives.ts` | 글 1 초안 — AdCreative.ai 대안 (검수 대기) |
| `public/og/og.jpg` | OG 카드(라이트, 2400×1260) |
| `src/components/page/ad/public/AdFooter.tsx` | 디렉터리 배지(전용 행) |
| `src/lib/utm.ts` · `db/neon/04_analytics.sql` | UTM 귀속 |
| `src/app/dev/og/page.tsx` | OG·갤러리 카드 캡처 개발 페이지 |
| `OPTIMIZATION_PLAN.md` | 메모리·비효율 최적화 계획(별도 트랙) |
| `src/components/page/ad/landing/LandingPageClient.tsx` | 랜딩 페이지 구조 (9개 블록) |
| `src/components/page/ad/landing/hero-section/HeroSection.tsx` | 히어로 — "Ads that don't look like AI stock" |
| `src/components/page/ad/landing/pricing-section/PricingSection.tsx` | 가격 — 3플랜, 첫달 50% 할인 |
| `src/components/page/ad/landing/faq-section/FAQSection.tsx` | FAQ 7개 (네이티브 details) |
