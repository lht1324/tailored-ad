# Product Marketing Context — TailoredAd

*Last updated: 2026-10-29 · 작성: 자동 초안(코드베이스 + 기존 문서) · 사장님 검수 대기*

> **이 문서의 역할**: 포지셔닝·타깃·고객 언어의 **단일 소스**. 실행 계획은 `MARKETING_PLAN.md`, 작업 기록은 `context.md`.
> 표기: **[검증]** = 실측/출처 있음 · **[추정]** = 근거는 있으나 미확인 · **[공백]** = 아직 없음(AI가 지어내면 안 되는 항목)

---

## Product Overview

**One-liner**
Turn one product photo into ad stills in five formats, with the headline and logo set by code instead of painted by an AI.

**What it does**
Upload a product photo and a logo. The system generates a batch of scene candidates, filters them through a quality gate, and shows only the ones worth using. A layout model then places the headline, CTA and logo, and the final render **composites that text deterministically** (rendered like a web page, not generated). Every approved design exports as 1:1, 4:5, 9:16, 16:9 and 2:3.

**Product category** (what shelf we sit on)
AI ad creative generator / AI product-photo-to-ad tool. Customers search: "AI ad generator", "product photo to ad", "AdCreative alternative", "AI ad creative tools". **[검증 — AI 답변이 인용하는 검색 형태]**

**Product type**: B2C SaaS (self-serve), Cloudflare Workers.

**Business model & pricing** **[검증 — Dodo 카탈로그 + prod 실측]**
| Plan | Price | Images/mo | Per image |
|---|---|---|---|
| Starter | $19 | 100 | $0.190 |
| Growth | $49 | 500 | $0.098 |
| Pro | $99 | 1,000 | $0.099 |

- Free: 10 images, no card
- First order: 50% off, **Starter only** (`FIRSTORDER50`)
- Billing unit: **finished image**. Failed generations are free. Unused images never expire (rollover). Downloads and edits unlimited.

---

## Target Audience

**Target companies**
Small DTC ecommerce brands, 1–10 people, roughly $1M–$50M revenue, 10–80 SKUs, running paid social (Meta, sometimes TikTok). **[추정]** — 상품 수는 실측(§MAILING_LIST), 매출은 미확인.

**Refined target (10-28 → 10-29, 이게 현재 정의)**
> **"광고는 돌리는데 팀이 작은 곳."** 중견 DTC가 아니다.
> 판별 신호: Meta 픽셀/Google Ads 태그 감지 · 제품 사진이 스튜디오급 · 카탈로그 20~80 · **파트너십·미디어 전용 주소 존재**

**Decision-makers**
- 창업자/오너 (소규모에서 실제 구매자)
- Head of Growth / 마케팅 매니저
- 프리랜서 퍼포먼스 마케터·소규모 대행사 (클라이언트 여러 곳)

**Primary use case**
시즌·신제품·프로모션마다 같은 제품을 **5개 배치 사이즈로 다시 만들어야 하는데**, 디자이너가 없거나 외주비가 부담스러운 상황.

**Jobs to be done**
- "금요일까지 광고 소재 variants를 올려야 한다" — 디자이너 없이
- "병·로고가 광고마다 똑같이 보여야 한다" — 제품 정체성이 곧 브랜드
- "AI가 그린 글자가 깨져서 광고비를 태운 적이 있다" — 그걸 다시 겪지 않기

**Use cases (구체 시나리오)**
- 커피 구독: 매달 새 원두 → 매달 새 소재
- 스킨케어: 신제품 런치 + 시즌 세트
- 홈·향: 시즌 컬렉션 + 리타겟팅 소재 교체
- 펫: 정기 프로모션

---

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---|---|---|---|
| 창업자/오너 (구매자) | 광고비 대비 성과, 시간 | 디자이너 채용은 과하고, 외주는 느리고 비쌈 | 하루 안에 5포맷 소재, 장당 $0.10~0.19 |
| 마케팅 매니저 (사용자) | 브랜드 일관성, 테스트 속도 | Canva로 만들면 4시간, 텍스트 정렬이 매번 틀어짐 | 만든 배치가 품질 게이트를 통과한 것만, 타이포는 코드가 고정 |
| 프리랜서/대행사 (고볼륨) | 클라이언트 리포트 품질 | 클라이언트마다 다른 브랜드 룰 | 같은 레이아웃에서 5포맷, 로고 픽셀 정확 |
| 디자이너 (반대편) | 퀄리티 통제 | (우리 고객이 아님 — §Anti-persona) | — |

---

## Problems & Pain Points

**Core problem**
광고 소재 생산이 **사람 손에 묶여 있다.** 디자이너가 없으면 Canva로 반나절, 있으면 대기열. 그런데 광고는 계속 새 소재를 요구한다.

**Why alternatives fall short**
- **Canva/Photoshop**: 내가 다 만들어야 함. 5포맷 = 5번 작업. 시간이 곧 비용
- **Photoroom/Pebblely**: 제품 사진은 잘 나오지만 **광고가 아니다** (헤드라인·CTA 없음). 우리 결과물의 입력이지 대체재가 아님
- **AdCreative.ai/Creatify/Predis**: 크레딧 계산이 불투명하고, 유용한 기능이 $249 같은 상위 티어에 잠김. 무엇보다 **글자를 모델이 그린다** → 깨진 글자 위험
- **직접 AI 이미지 생성 (Midjourney 등)**: 텍스트를 못 넣음. 결국 Canva로 다시
- **외주 디자이너**: 건당 $50~200, 리비전 라운드, 3~5일

**What it costs them**
- 시간: 소재 1세트(5포맷) = Canva 3~6시간
- 돈: 외주 건당 $50~200 / AdCreative Professional $249/월
- 기회: 소재 테스트를 못 돌려서 "지는 광고"를 오래 돌림

**Emotional tension**
"이 정도면 AI로 만든 티 나는데, 그걸 우리 브랜드 이름으로 올려도 되나?" — **부끄러움**이 실제 저항이다. 깨진 글자는 그 부끄러움의 가장 구체적인 형태.

---

## Competitive Landscape

**Direct** (같은 문제, 같은 해결책) — 가격은 2026-10 확인 **[검증]**
| 도구 | 가격 | 그들이 못 하는 것 (우리 관점) |
|---|---|---|
| AdCreative.ai | $39/10크레딧 · $249/50 · $999/100 | 크레딧 소진형, 유용 기능이 $249 티어, **글자를 모델이 그림** |
| Creatify | $15/55 · $55/280 (2026-10 개편) | **영상 전용 파이프라인**. 스틸만 필요한 팀에겐 형태가 안 맞음 |
| Predis.ai | $32/79/249 (월간) | 소셜 캘린더와 **크레딧 풀 공유** — 광고와 포스트가 예산 경쟁 |
| AdRoast | $29 flat (자체 발표) | 프리셋 기반 이미지+15초 영상. 스코어링 중심 |
| Pencil | from $14 (경쟁사 보고) | 엔터프라이즈 거버넌스 지향 |

**Secondary** (다른 해결책, 같은 문제)
- Canva — 자유도 최고, 시간 비용 최고. Free plan 존재 **[검증]**
- Photoroom ($7.99~) · Pebblely ($19/200장) — **제품 사진** 생성. 광고 조립은 별개 **[검증]**
- 프리랜서/대행사 — 품질 최고, 속도·비용 최악

**Indirect** (상충하는 접근)
- "그냥 AI 슬롭 대량 생성해서 테스트" — 싸지만 브랜드 자산을 태움
- "디자이너 한 명 채용" — 근본 해결이지만 우리 타깃(1~10명 팀)에겐 과함

---

## Differentiation

**Key differentiators**
1. **글자를 코드가 조판한다** — 모델이 그리지 않음. 오타·깨진 글리프가 결과물에 도달할 수 없음
2. **한 레이아웃 → 5포맷** (1:1·4:5·9:16·16:9·2:3)
3. **완성된 이미지당 과금** — 실패분 무료, 미사용분 소멸 없음, 다운로드·편집 무제한
4. **배치 품질 게이트** — 실험작은 보여주지 않음. 샘플링 비용은 우리 부담
5. **사람을 만들지 않는 모드가 있다** — product-only는 합성 인물 0 → Amazon AI-person 태그 대상 아님 **[검증 2026-07 정책]**

**How we do it differently**
생성은 AI가 하고, **조판은 코드가 한다.** 이 분업이 제품 구조 자체다.

**Why that's better**
AI 이미지의 실패는 대부분 "글자가 깨졌다" 또는 "제품이 변했다"다. 우리는 두 번째를 참조 이미지로 고정하고, 첫 번째를 **아예 생성 대상에서 제거**했다.

**Why customers choose us over alternatives**
"영상은 필요 없고, 스틸 이미지의 글자만 제대로 나오면 된다" — 이 조건이 맞으면 대안이 거의 없다.

---

## Objections

| Objection | Response |
|---|---|
| "Photoroom은 $7.99인데?" | 그건 **제품 사진**이다. 헤드라인·CTA·5포맷은 별개 작업이고, 그게 우리가 하는 일이다 |
| "AI 티 나면 어쩌나" | 그게 우리가 파는 것이다. 후보를 배치로 뽑아 게이트로 거르고, 타이포는 코드가 조판한다. 실패분은 무료 |
| "내 제품이 똑같이 나올까" | 참조 이미지로 형태·색·재질을 고정하고, 로고는 픽셀 단위로 합성한다. 단 색은 눈으로 확인해야 한다 (특히 스킨케어) |
| "영상은?" | 못 만든다. 영상이 주력이면 Creatify가 맞다 — 우리는 그걸 인정하고 비교 페이지에도 쓴다 |
| "스코어링/경쟁사 분석은?" | 없다. AdCreative.ai가 그걸 판다 |
| "새 제품이라 불안하다" | 맞다. 그래서 무료 10장에 카드도 안 받는다 |
| "아마존 대표이미지로 쓸 수 있나" | 아니다. 순백·텍스트 금지 규정상 다른 자산이다. 보조 이미지·A+·광고 소재용이다 |

**Anti-persona (우리에게 안 맞는 사람)**
- **영상이 주력**인 팀 → Creatify
- **사내 디자이너·크리에이티브 팀**이 있는 곳 → 이미 해결됨
- **아마존 대표이미지 1장만** 필요한 셀러 → 순백 컷이면 충분, 굳이 우리일 필요 없음
- **대량 슬롭**을 싸게 뽑고 싶은 사람 → 우리는 품질 게이트 때문에 그 용도에 비쌈
- **실사 모델 UGC**가 필요한 사람 → 우리는 실사 얼굴을 합성하지 않는다
- **폼·챗봇으로만 연락받는 조직** → (영업 관점) 접촉 비용이 큼

---

## Switching Dynamics (JTBD Four Forces)

**Push (지금 쓰는 것에서 밀려나는 이유)**
- Canva로 5포맷 만드는 데 반나절
- AI가 그린 헤드라인이 깨져서 광고비를 태운 경험
- 크레딧이 매달 소멸하거나, 쓴 만큼 청구서가 튐
- AdCreative에서 유용한 기능이 $249 티어에 있어서 잠김

**Pull (우리 쪽으로 당기는 것)**
- "글자를 코드가 놓는다"는 구조적 보장
- 5포맷이 한 번에
- 실패분 무료 + 미사용분 소멸 없음
- 10장 무료, 카드 없음

**Habit (지금 방식을 유지하게 하는 것)**
- Canva/포토샵에 익숙한 손
- 이미 결제 중인 툴의 남은 크레딧
- "내가 만들면 확실하다"는 통제감

**Anxiety (바꾸는 것에 대한 불안)**
- 새 도구 배우는 시간 (30분도 아깝다)
- 우리 제품이 이상하게 나올까
- AI 이미지가 브랜드를 깎을까
- 아마존 정책 위반 (합성 인물 태그)

---

## Customer Language

**How they describe the problem** — **[검증] 실제 검색·스레드에서 관찰된 표현 (출처: 2026-10 웹 검색 결과 제목)**
- "what ai tools turn product photos into ad creatives **fast**?"
- "Is there an AI tool that can **actually understand your brand**?"
- "i've been uploading product shots to a few ai tools lately, like claude for ideas but **nothing that spits out ready visuals**"
- "I create every ad creative for my Shopify store using AI — **no designer, no Canva, no budget**"

**How they describe us** — **[공백]** 실고객 0명. 이 칸은 시딩 반응에서 나온 문장으로만 채운다. **AI가 지어내지 말 것.**

**Words to use**
- product photo, ad still, headline, CTA, logo, placement, format
- "set by code / composited" (조판 방식 설명)
- "failed generations are free", "unused images never expire"
- "stills only" (한계를 먼저 말할 때)

**Words to avoid**
- AI slop / AI stock (우리가 비판하는 대상의 이름 — 단, 랜딩 H1은 예외로 이미 사용 중)
- "revolutionary", "game-changing", "seamless", "unleash"
- "honest" / "genuinely" (자기평가 부사 — 카피 제1원칙 위반)
- "10x", "effortless"
- 엠대시(—) 남용 — 카피 제1원칙 참조

**Glossary**
| Term | 우리 정의 |
|---|---|
| batch | 한 번의 생성 요청. 후보 여러 장 → 품질 게이트 통과분만 노출 |
| quality gate | 후보를 걸러 사용자에게 보여줄 것만 남기는 단계 |
| composited / deterministic type | 글자를 모델이 그리는 게 아니라 코드가 좌표에 배치하는 것 |
| product-only mode | 인물 없이 제품만. 합성 인물 0 → Amazon 태그 대상 아님 |
| persona (virtual model) | 장면에 사람이 필요할 때 배치 단위로 생성되는 **가상** 인물. 실사 얼굴 아님 |
| finished image | 과금 단위. 실패·재시도는 무료 |
| rollover | 미사용 이미지가 다음 달로 이월 (소멸 없음) |

---

## Brand Voice

**Tone**: 담백하고 단정. 과장 없음. **한계를 먼저 말한다** ("영상은 못 만든다", "아마존 대표이미지는 아니다").

**Style**: 짧은 문장과 긴 문장을 섞는다. 능동태. 구체 숫자·날짜·출처를 쓴다. 자기평가 부사 금지. 엠대시 금지.

**Personality**: 정확한 · 솔직한 · 실무적 · 과시하지 않음

**규칙 문서**: 카피 제1원칙 10개 → `MARKETING_PLAN.md` §5.4 (위반 시 출고 금지)

---

## Proof Points

**Metrics** — **[공백]**
- 고객 수 0 · 유료 결제 0건 · 후기 0건 (2026-10-29 prod DB 실측: `usage_ledger` 0, `subscription_grants`는 trial 2건뿐)

**Customers**: 없음

**Testimonials**: 없음

**What we CAN claim today** (지어내지 말고 이 선에서만)
- 무료 10장, 카드 불필요 (제품 사실)
- 실패분 무료 · 미사용분 소멸 없음 (제품 사실)
- 한 레이아웃 → 5포맷 (제품 사실)
- 가격 $19/100 · $49/500 · $99/1,000 (카탈로그 실측)
- 결제 E2E 통과 (내부 사실, 외부 주장 아님)

**Value themes**
| Theme | Proof |
|---|---|
| 글자가 깨지지 않는다 | 구조(코드 조판)로 보장. 단 **외부 검증 없음** |
| 5포맷 한 번에 | 제품 기능 (내부 확인) |
| 과금이 예측 가능하다 | 실패 무료 + 이월 (약관 명시) |
| 사람을 만들지 않는다 | product-only 모드 (Amazon 태그 대상 아님) |

---

## Goals

**Business goal**
첫 유료 고객 확보 → **첫 증언 1개 확보** (4단계 유료 증폭의 진입 조건)

**Conversion action**
`/create` → 무료 10장 생성 → 유료 전환. 랜딩의 핵심 CTA는 "Create your first ad".

**Current metrics** — **[공백]**
- 방문자·가입·전환: Cloudflare Web Analytics 동작 중이나 **유의미한 표본 아직 없음**
- AI 인용: 기준선 0건 (2026-10-22 측정), 재측정 예정
- 트라이얼 5명 / 증언 3개 = 4단계 진입 조건 (현재 0)

---

## 열린 질문 (사장님 결정 필요)

1. **"AI stock" 정의** — 랜딩 H1이 쓰는 말인데 본문에서 정의하지 않음. FAQ 6번에서 간접 설명만. (10-24 피드백에서 나온 미해결 항목)
2. **타깃 한 문장** — "광고는 돌리는데 팀이 작은 곳"이 최종인가, 아니면 커피·스킨케어 같은 업종 축을 먼저 세울 것인가
3. **고객 언어 공백** — 시딩 반응이 오기 전까지 §Customer Language의 "how they describe us"는 비워둔다. 채울 시점의 기준을 정할 것
