# TailoredAd — 마케팅 계획서

*Last Updated: 2026-10-21 · 작성: AI 에이전트 · 상태: 1단계 진행 중 (4단계 진입 전)*

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
| **0.5** | 계기판 (측정) | 어느 채널에서 사람이 왔는지 | 0원 | 사장님(SQL 1회) + 저(배포) | 🟡 코드 완료, **prod 배포 대기** |
| **1** | 디렉터리 등록 | 4~6곳 등재 + dofollow 링크 | 0원 | 사장님(계정·제출) + 저(카피) | 🔄 **Recap 완료 · SaaSHub 진행 중 · Bro Find AI 완료** |
| **2** | 직접 콘텐츠 (비교글·업종 페이지) | AI가 인용할 문단을 우리 도메인에 | 0원 | 저 | ⬜ 미착수 |
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
| **Cloudflare Web Analytics** | 방문·PV·referrer·실사용자 LCP/INP/CLS | 0원 | 스니펫 develop 반영(`9152c6c`) → **prod 배포 대기** |
| **UTM → 우리 DB** | 유저별 정확한 채널 귀속(reddit/디렉터리명) | 0원 | develop 반영(`746e8d3`) → **prod SQL 실행 대기** |
| stork.ai/ai-visibility-check | AI 노출 기준선 측정 | 0원 | ⬜ 2단계 착수 시 |

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
| **SaaSHub** | 68-70 | (측정 밖) | **0원** | 🔄 **진행 중**. "X 대안" 페이지 = 구매의도 트래픽(2014~, 25만 제품) |
| **Bro Find AI** | — | (측정 밖) | **0원** | ✅ **제출 완료**. 즉시 게시 + 블로그 게스트포스트(Jaeho Lee 이름) + 블루티크 인증. 이름 충돌 3개(브룩 AI 챗앱·이탈리아 Brоfind) → 기대값 낮게 |
| **Future Tools** | 69 | **#189,099** | **0원** | 🔄 **진짜 무료·사람 검수**(Matt Wolfe). 4,351 리스팅. 승인 보장 없음 |
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

### 4.5 배지 = dofollow 전환
Bro Find AI 배지를 서버 렌더 HTML에 넣으면 링크가 **nofollow → dofollow**로 전환 + 블루티크. 푸터에 전용 행으로 배치(250×54 네이티브). 배지 SVG는 `prefers-color-scheme` 내장 → 다크모드 자동 대응.

### 4.6 1단계 남은 작업
- [ ] 사장님: SaaSHub 제출 (5번 Q&A 문안 교체 후)
- [ ] 사장님: Future Tools 제출 (2필드 + 카테고리 Marketing)
- [ ] 사장님: Bro Find AI "Verify my badge" 클릭
- [ ] 사장님: 도메인 이메일 (support@tailoredad.com) — SaaSHub 소유권 검증 + 런칭 체크리스트

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

### 5.2 1차 범위 (제안 — 승인 후 착수)
| 라우트 | 내용 |
|---|---|
| `/alternatives/adcreative-ai` | AdCreative.ai 대안 — 가격·특징·언제 쓰는지 + 우리 차별점 |
| `/alternatives/creatify` | Creatify 대안 (영상 불필요한 사람용) |
| `/alternatives/predis` | Predis.ai 대안 (저가 소규모 팀용) |
| `/ad-creative/ecommerce` | 업종별 — 전자상업 광고 크리에이티브 |
| `/ad-creative/skincare` | 업종별 — 스킨케어 브랜드 |
| `/llms.txt` | AI 크롤러용 요약 (stork.ai 생성기 사용) |

### 5.3 작업 방식
- SSG 정적 생성(Next.js App Router) → 빌드 타임 HTML → 엣지 캐시
- 페이지당 JSON-LD(Article/FAQPage) + canonical + OG
- `sitemap.xml` 자동 편입 + 기존 비교글/디렉터리 페이지 상호링크
- 사장님 확인: 비교 대상 툴 선정 · 업종 3~5개 · "왜 우리인지" 한 줄 · 최종 카피 eyeball

### 5.4 참고: 한국어 경쟁자 3개 발견 (신규 인텔)
`draph.art(드랍아트)` · `nextify.ai` · `jenova.ai` — 한국어 AI 광고 툴이며 **한국어 AI 질의에서 이미 인용되고 있다.** 영어권은 AdCreative·Creatify가 쥐고 있으니, 한국어 콘텐츠로 진입하는 쪽이 빈틈일 수 있다. (우리 사이트는 영어 — 별도 결정 필요, 지금은 보류)

---

## 6. 3단계 — 베타 시딩 30곳 ($32)

### 6.1 컨셉
"팔아주세요"가 아니라 **"만들어드릴게요"** — 타깃 브랜드 제품으로 1장씩 만들어 첨부. 도구 제품이기에 가능한 인사. 사장님 성격에 맞고, 콜드 세일즈가 아니다.

### 6.2 타깃
- 업종: DTC 스킨케어 · 프리미엄 커피 · 보틀 위스키 · 피트니스 · 홈리빙스 (랜딩 이미지 톤과 일치, 반복구매로 이미지 수요 多)
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

## 9. 10월 남은 것 (순서)

1. [ ] 사장님: 도메인 이메일 `support@tailoredad.com` (10분) → 이후 여러 곳의 선행조건
2. [ ] 사장님: SaaSHub 제출 → Future Tools 제출 → Bro Find AI 배지 인증
3. [ ] 사장님: prod 브랜치에 `db/neon/04_analytics.sql` 실행
4. [ ] 저: 릴리즈 머지 + 배포(계기판) + prod beacon 확인
5. [ ] 저: 2단계 카피 초안(비교글 3장 + 업종 2장) → 승인 → SSG 구현 + llms.txt + sitemap 편입
6. [ ] 저: AI 가시성 기준선 측정(stork.ai/ai-visibility-check)
7. [ ] 저: 3단계 준비 — 타깃 30곳 + 크리에이티브 30장 + 메일 카피
8. [ ] 사장님: 3단계 발송 → 4단계 진입 여부 결정

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

---

## 12. 관련 파일

| 파일 | 내용 |
|---|---|
| `src/lib/landingJsonLd.ts` | 랜딩 JSON-LD 3종 |
| `public/robots.txt` · `public/sitemap.xml` | 크롤링 규칙 + 사이트맵 |
| `public/og/og.jpg` | OG 카드(라이트, 2400×1260) |
| `src/components/page/ad/public/AdFooter.tsx` | 디렉터리 배지(전용 행) |
| `src/lib/utm.ts` · `db/neon/04_analytics.sql` | UTM 귀속 |
| `src/app/dev/og/page.tsx` | OG·갤러리 카드 캡처 개발 페이지 |
| `OPTIMIZATION_PLAN.md` | 메모리·비효율 최적화 계획(별도 트랙) |
