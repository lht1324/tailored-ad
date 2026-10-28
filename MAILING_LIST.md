# TailoredAd — 시딩 메일링 리스트 (3단계)

*Last Updated: 2026-10-28 03:40 · 상태: 2차 실측 검증 완료 (1군 34곳 · 2군 15곳) · 제품 선정 전*

> **목적**: "팔아주세요"가 아니라 **"귀사 제품으로 광고 이미지를 만들어봤습니다"** — 선물형 아웃리치.
> **목표**: 전환 1~3명 · **증언 1개** (4단계 유료 증폭의 진입 조건).
> **비용**: 생성 $2 (40장 × $0.05) + 발송 무료(도메인 이메일). 별도 유료 도구 없음.

---

## 0. 리스트 두 개를 섞지 말 것 (중요)

| 구분 | 수집 시점 | 방법 | 품질 | 사용 |
|---|---|---|---|---|
| **1차 리스트 (§2)** | 10-28 오전 | 웹 검색 → contact 페이지 크롤링 | **낮음** — 주소가 `orders@`·`support@`·`help@` 등 **CS/주문 큐**인 곳이 다수. 규모도 중견 이상 편중 | 참고용. 발송 대상 아님 |
| **2차 리스트 (§3)** | 10-28 오후 | 131개 도메인 **실측 스캔** (Shopify 판별·상품 수·픽셀·주소) | **높음** — 전부 사이트 직접 방문 검증. `hello@`/실명 주소 위주 | **발송은 여기서만** |

1차 리스트를 지우지 않고 남기는 이유: 브랜드 자체는 유효하고, 나중에 2차로 재검증할 후보 풀 역할을 한다.

---

## 1. 수집·검증 방법 (재현 가능하게)

### 2차 검증에 실제로 쓴 방법 (2026-10-28)

- 후보 도메인 131개 → **홈페이지 직접 요청**으로 생존 확인 (§3의 판정은 전부 이 스캔 결과)
- **Shopify 판별**: HTML의 `cdn.shopify.com`·`myshopify.com`·`/cdn/shop/` 문자열 검사
- **상품 수**: `/products.json?limit=250` 응답 파싱 (성공한 곳만 기록)
- **광고 신호**: 홈 인라인 픽셀(`connect.facebook.net`·`fbq(`·`analytics.tiktok.com`) + **GTM 컨테이너 원문 파싱**(`googletagmanager.com/gtm.js?id=GTM-…`에서 facebook/tiktok 문자열 검색)
- **이메일**: `/pages/contact`·`/contact`·`/contact-us`·`/pages/about`·`/pages/our-story`·`/policies/contact-information`·`/pages/faq`를 순서대로 크롤링해 정규식 추출
- **오탐 제거**: `%20` 접두 인코딩 잔재, `u003e` 이스케이프 잔재, `your@email.com`류 플레이스홀더, 타사 주소(PR대행·인수법인)는 수동으로 걸러냄

### 이 방법으로 **확정할 수 없는 것** (한계)

- **광고 집행 여부**: Shopify는 Meta 픽셀을 **Web Pixels API(서버측)**로 심는다. 그래서 HTML에 `fbq`가 없어도 광고를 돌리고 있을 수 있다. **`미확인`은 "광고 안 함"의 증거가 아니다.** 확정하려면 Meta Ad Library를 눈으로 봐야 한다(로그인 장벽으로 자동 조회 불가 — 403 실측).
- **Instagram 팔로워**: 비로그인 조회가 전부 차단됨. 규모 추정은 상품 수와 브랜드 인지도로만 했다.
- **상품 수**: Shopify 봇 차단(429)으로 절반 이상 미확보. `?`는 "차단됨", 숫자는 실측값.

### 폐기한 경로

- **explee 미사용**: "AI가 리드 찾아 콜드메일 자동 발송" 에이전트. 브랜드별 맞춤 이미지 첨부 불가·자동발송이 계획과 상충·메일당 $0.04.
- **드랍쉬퍼 제외**: 브랜드명 없고 수명 2~6주라 증언 가치가 낮다.

---

## 2. 1차 리스트 (25곳 — 10-28 오전, **품질 낮음 · 발송 대상 아님**)

**표기**: ⚠️ = 규모 클 수 있음 / ☐ = 미처리

### 커피 (6)
| | 브랜드 | 도메인 | 이메일 | 지역 | 판정 |
|---|---|---|---|---|---|
| ☐ | Hermanos Coffee Roasters | hermanoscoffeeroasters.com | info@hermanoscoffeeroasters.com | UK | ★ |
| ☐ | Yallah Coffee | yallahcoffee.co.uk | orders@yallahcoffee.co.uk | UK | ★ |
| ☐ | Redemption Roasters | redemptionroasters.com | contact@redemptionroasters.com | UK | ★ |
| ☐ | Onyx Coffee Lab | onyxcoffeelab.com | info@onyxcoffeelab.com | US | ★ |
| ☐ | Rishi Tea | rishi-tea.com | hello@rishi-tea.com | US | ★ |
| ☐ | Counter Culture Coffee | counterculturecoffee.com | retail@counterculturecoffee.com | US | ⚠️ |

### 뷰티·스킨케어 (5)
| | 브랜드 | 도메인 | 이메일 | 지역 | 판정 |
|---|---|---|---|---|---|
| ☐ | Ursa Major | ursamajorvt.com | hello@ursamajorvt.com | US | ★ |
| ☐ | FaceTheory | facetheory.com | help@facetheory.com | UK | ★ |
| ☐ | Loulou Lollipop (유아) | louloulollipop.com | customercare@louloulollipop.com | US | ★ |
| ☐ | Cocokind | cocokind.com | info@cocokind.com | US | ⚠️ |
| ☐ | Typology | typology.com | press@typology.com | FR | ⚠️ |

### 홈·향 (4)
| | 브랜드 | 도메인 | 이메일 | 지역 | 판정 |
|---|---|---|---|---|---|
| ☐ | Keap Candles | keapbk.com | thelab@keapcandles.com | US | ★ |
| ☐ | Brooklyn Candle Studio | brooklyncandlestudio.com | support@brooklyncandlestudio.com | US | ★ |
| ☐ | East Fork Pottery | eastfork.com | care@eastfork.com | US | ★ |
| ☐ | Made In Cookware | madeincookware.com | hello@madeincookware.com | US | ⚠️ |

### 식품·음료 (6)
| | 브랜드 | 도메인 | 이메일 | 지역 | 판정 |
|---|---|---|---|---|---|
| ☐ | Brightland (올리브오일) | brightland.co | goodday@brightland.co | US | ★ |
| ☐ | Fishwife (통조림 생선) | fishwife.com | fishwife@fishwife.com | US | ★ |
| ☐ | Omsom (아시안 소스) | omsom.com | sales@omsom.com | US | ★ |
| ☐ | Olympia Provisions (샤퀴테리) | olympiaprovisions.com | info@olympiaprovisions.com | US | ★ |
| ☐ | Fly By Jing (칠리소스) | flybyjing.com | support@flybyjing.com | US | ⚠️ |
| ☐ | De Soi (무알콜) | drinkdesoi.com | info@drinkdesoi.com | US | ⚠️ |

### 펫·피트니스·유아 (4)
| | 브랜드 | 도메인 | 이메일 | 지역 | 판정 |
|---|---|---|---|---|---|
| ☐ | Wild One (펫) | wildone.com | hello@wildone.com | US | ★ |
| ☐ | Maxbone (펫) | maxbone.com | info@maxbone.com | US | ★ |
| ☐ | Bells of Steel (헬스기구) | bellsofsteel.com | support@bellsofsteel.com | CA | ★ |
| ☐ | Bums & Roses (유아) | bumsandroses.com | help@bumsandroses.com | US | ★ |

### 1차 리스트의 실측 재확인 결과 (2차 스캔에서 드러난 것)
- **주소가 CS 큐인 곳**: Yallah(`orders@`), Brooklyn Candle(`support@`), Bells of Steel(`support@`·`commercial@`만), Bums & Roses(주소 미검출), Rishi Tea(도메인 미응답), FaceTheory(주소 미검출)
- **Omsom·Fishwife·Poketo는 Shopify 아님** → `/products.json` 없음(자동 수집 불가)
- **죽은 도메인**: 해당 없음. 1차 25곳은 전부 DNS/MX 생존.

---

## 3. 2차 검증 리스트 (131개 도메인 스캔 · **발송은 여기서만**)

**표기**: ★ = 1군(소규모·주소 양호) / ⚠️ = 2군(규모 클 수 있음) / `?` = 상품 수 미확보(429) / 광고열 = `감지`·`미확인`(§1 한계 참조)

### ★ 1군 — 소규모·직통 주소 (34곳)

#### 스킨케어·뷰티 (7)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Stratia Skin | stratiaskin.com | 19 | info@stratiaskin.com | 미확인 |
| ☐ | Dieux Skin | dieuxskin.com | 27 | hello@dieuxskin.com | 미확인 |
| ☐ | Then I Met You | thenimetyou.com | 24 | hello@thenimetyou.com | 미확인 |
| ☐ | Tower 28 | tower28beauty.com | ? | hey@tower28beauty.com | 미확인 |
| ☐ | Ursa Major | ursamajorvt.com | ? | hello@ursamajorvt.com | 미확인 |
| ☐ | Salt & Stone | saltandstone.com | ? | info@saltandstone.com | 미확인 |
| ☐ | Evan Healy | evanhealy.com | 250 | orderdesk@evanhealy.com | 감지 |

#### 음료 (5)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Sanzo | drinksanzo.com | 8 | hello@drinksanzo.com | 미확인 |
| ☐ | Hiyo | drinkhiyo.com | 44 | hello@drinkhiyo.com | 미확인 |
| ☐ | Ghia | drinkghia.com | ? | hi@drinkghia.com | 미확인 |
| ☐ | Wildwonder | drinkwildwonder.com | ? | hello@drinkwildwonder.com | 미확인 |
| ☐ | Sunwink | sunwink.com | ? | hello@sunwink.com | 미확인 |

#### 커피 (8) — 구독제라 매달 새 소재 수요가 구조적으로 발생
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Methodical Coffee | methodicalcoffee.com | ? | **reilly@methodicalcoffee.com** | 미확인 |
| ☐ | Canyon Coffee | canyoncoffee.co | ? | hello@canyoncoffee.co | 미확인 |
| ☐ | Heart Coffee Roasters | heartroasters.com | ? | coffee@heartroasters.com | 미확인 |
| ☐ | Passenger Coffee | passengercoffee.com | ? | contact@drinkpassenger.com | **감지** |
| ☐ | Madcap Coffee | madcapcoffee.com | 112 | info@madcapcoffee.com | **감지** |
| ☐ | Bird Rock Coffee | birdrockcoffee.com | ? | info@birdrockcoffee.com | **감지** |
| ☐ | Stone Creek Coffee | stonecreekcoffee.com | ? | customers@stonecreekcoffee.com | **감지** |
| ☐ | Coava Coffee | coavacoffee.com | ? | info@coavacoffee.com | 미확인 |

#### 커피 · 영국 (3)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Redemption Roasters | redemptionroasters.com | 40 | contact@redemptionroasters.com | 미확인 |
| ☐ | Hermanos Coffee | hermanoscoffeeroasters.com | 48 | info@hermanoscoffeeroasters.com | 미확인 |
| ☐ | Ceremony Coffee | ceremonycoffee.com | ? | info@ceremonycoffee.com | 미확인 |

#### 티 (4)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Song Tea | songtea.com | 250 | hello@songtea.com | 미확인 |
| ☐ | Kettl Tea | kettl.co | 116 | contact@kettl.co | 미확인 |
| ☐ | Arbor Teas | arborteas.com | ? | info@arborteas.com | 미확인 |
| ☐ | Bellocq Tea | bellocq.com | ? | inquiries@bellocq.com | 미확인 |

#### 홈·향·도예 (3)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Keap Candles | keapcandles.com | ? | thelab@keapcandles.com | 미확인 |
| ☐ | Candlefish | candlefish.com | ? | info@candlefish.com | 미확인 |
| ☐ | Jono Pandolfi | jonopandolfi.com | ? | care@jonopandolfi.com | **감지** |

#### 식품 (3)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Masienda | masienda.com | ? | info@masienda.com | 미확인 |
| ☐ | Gustus Vitae | gustusvitae.com | ? | hello@gustusvitae.com | 미확인 |
| ☐ | Boonville Barn | boonvillebarn.com | ? | hello@boonvillebarn.com | 미확인 |

#### 펫 (2)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | Bocce's Bakery | boccesbakery.com | ? | hello@boccesbakery.com | **감지** |
| ☐ | Shameless Pets | shamelesspets.com | ? | hello@shamelesspets.com | 미확인 |

#### 의류 (2)
| | 브랜드 | 도메인 | 상품 | 이메일 | 광고 |
|---|---|---|---|---|---|
| ☐ | 3sixteen | 3sixteen.com | ? | **brandon@3sixteen.com** | 미확인 |
| ☐ | Lady White Co | ladywhiteco.com | ? | info@ladywhiteco.com | 미확인 |

**1군 집계**: 34곳 · **실명 주소 2곳**(reilly@, brandon@) · 광고 감지 7곳

### ⚠️ 2군 — 규모가 클 수 있음 (15곳, 보조 후보)
| | 브랜드 | 도메인 | 상품 | 이메일 | 사유 |
|---|---|---|---|---|---|
| ☐ | Maxbone | maxbone.com | 93 | info@maxbone.com | 펫, 중견 |
| ☐ | Brightland | brightland.co | ? | goodday@brightland.co | 인지도 높음 |
| ☐ | Fishwife | fishwife.com | ? | fishwife@fishwife.com | 인지도 높음 |
| ☐ | Tandem Coffee | tandemcoffee.com | 250 | contact@tandemcoffee.com | 상품 250 |
| ☐ | George Howell | georgehowellcoffee.com | 108 | **allison@georgehowellcoffee.com** | 실명이나 중견 |
| ☐ | Osea | oseamalibu.com | ? | **rachel@oseamalibu.com** | 실명(공동창업)·중견 |
| ☐ | Labruket | labruket.com | ? | **carla.kromberg@labruket.com** | 실명·스웨덴 중견 |
| ☐ | Farmhouse Pottery | farmhousepottery.com | ? | **kiara@farmhousepottery.com** | 실명·중견 |
| ☐ | Chamberlain Coffee | chamberlaincoffee.com | ? | hi@chamberlaincoffee.com | 인플루언서 브랜드 |
| ☐ | Recess | takearecess.com | ? | hello@takearecess.com | 투자 유치 |
| ☐ | Kin Euphorics | kineuphorics.com | ? | hello@kineuphorics.com | 투자 유치 |
| ☐ | Material Kitchen | materialkitchen.com | ? | hello@materialkitchen.com | 중견 |
| ☐ | Jacobsen Salt | jacobsensalt.com | ? | hello@jacobsensalt.com | 중견 |
| ☐ | Faribault Mill | faribaultmill.com | ? | info@faribaultmill.com | 중견 |
| ☐ | Athletic Brewing | athleticbrewing.com | ? | info@athleticbrewing.com | 대형 |

### ✗ 제외 (이유별)

**주소가 CS/주문 전용뿐** — Blueprint Coffee(`orders@`), Field Company(`help@`), Get Maude(`orders@`·`press@`), Homesick(`help@`), Indeed Labs(`support@`), Krave(`support@`), Farmacy(`customercare@`), Sunday Riley(`hello@`이나 브랜드 대형), Tony's Chocolonely(`mailuk@`), Colorful Standard(`support@`), Health-Ade류
**규모 과다** — Tentree, Boy Smells, Herbivore, Pact, Tentree, Mike's Hot Honey, Truff, Olympia Provisions, The Japanese Pantry, Black White Roasters, Smith Tea, Counter Culture(180), Sunday Forever(89), Beam Organics(73), Made In, Beekman 1802, Mushie, Modern Picnic, Again Faster
**주소 미검출** — Otherland, Herbivore, Golde, United Sodas, Brooklyn Candle, Bums & Roses, Yallah Coffee, FaceTheory, Typology, Beekman, Mushie, Again Faster, Sunday Forever, Beam, Healthybaby, Great Jones
**Shopify 아님**(자동 수집 불가) — Omsom, Fishwife, Asket, Esembly, Good Molecules, Apotheke, Poketo(인수됨), Coava(별도 스택), Blueprint, Holi Roots, Weypact
**도메인 미응답** — Little Wolf, Brandywine, Pfandle, Tatine, Youth To The People, Kettlebell Kings, Eight Saints, Oui the People, Dram, Yesfolk, Tellason, Sir & Madame, Mazama, Nettle & Bramble, Jardine Foods, Rishi Tea

---

## 3.5 필터용 표 — `MAILING_LIST.csv` (10-29)

브랜드별로 조건을 걸러보기 위한 표. Numbers/Sheets에서 열어 정렬·필터 가능 (UTF-8 BOM).

| 컬럼 | 의미 |
|---|---|
| 군 | 1군(소규모·주소 양호) / 2군(규모 클 수 있음) |
| 업종·브랜드·도메인·이메일 | 기본 정보 |
| 주소유형 | **실명**(사람 이름) / **일반**(hello·hi·팀) / **CS/주문**(info·support·orders 등) |
| 상품수·카탈로그 | `/products.json` 실측. `?` = 429로 미확보. 카탈로그는 소형(<20)·중형(20~80)·대형(80+) |
| Meta광고·GoogleAds·TikTok | 픽셀/태그 감지. Shopify는 Web Pixels API로 심어 HTML에 `fbq`가 없어 **GTM 컨테이너 원문까지 파싱**해 판정 |
| 광고신호 | 위 3개 합 (0~3) |
| 점수·우선순위 | 실명+4 / 일반+1 / CS 0 · Meta+3 / Google+1 / TikTok+1 / 중형카탈로그+1 → A(4+)·B(2~3)·C(0~1) |
| 비고 | 실명 주소, UK, 카탈로그 특이사항 |

**한계 (과신 금지)**
- **Klaviyo는 점수에서 제외** — 52곳 중 47곳에 설치돼 변별력이 없음 (10-29 실측)
- Shopify도 50/52로 상수 → 점수 미반영
- **픽셀 부재 ≠ 광고 안 함.** 서버측 심기·룩어라이크 타깃팅 등은 HTML에 흔적이 없음
- **이미지/영상 비중은 이 표에 없음** (자동 판별 불가). 최종 3곳만 Ad Library에서 육안 확인
- 수집 시점 2026-10-29. 스캔 중 IP가 429로 차단돼 44건을 4초 간격으로 재수집함 (52/52 확보)

---

## 3.6 사장님 수동 확인 반영 (2026-10-29) — **이메일 스캔은 오탐이 있었다**

사장님이 실제 사이트를 열어 확인한 결과, **자동 추출이 5곳에서 틀렸습니다.** HTML에 남은 문자열(과거 페이지·스크립트)을 긁은 것으로 보이며, 실제로는 **문의 폼만** 있었습니다.

**발송 불가로 제외 (폼만·이메일 없음)**
`Methodical Coffee` · `Bocce's Bakery` · `Recess` · `Osea` · `Farmhouse Pottery`
→ Farmhouse Pottery는 AI 챗봇이 "연결해주겠다"고 했으나 부담스러워 중단. **폼·챗봇만 있는 곳은 이 캠페인에서 제외**하는 게 맞다 (우리 접근은 이메일 기반).

**확인된 주소 — 등급 재분류 (핵심 발견)**

| 브랜드 | 주소 | 등급 | 근거 |
|---|---|---|---|
| Material Kitchen | `partners@materialkitchen.com` | **파트너십** | "For brands, influencers, and ambassadors" |
| Chamberlain Coffee | `business@chamberlaincoffee.com` | **파트너십** | "Press & Collaborations" |
| L:A BRUKET | `collaborations@labruket.com` | **미디어** | Media(Justine). 실명 상업담당 2명도 있음 — `carla.kromberg@`(DACH)·`laurine.combasson@`(FR/UK/BNL) |
| George Howell | `allison@georgehowellcoffee.com` | **미디어** | Media 전용 |
| 3sixteen | `brandon@3sixteen.com` | **도매** | Wholesale 전용. `info@`도 있음 |
| Bird Rock Coffee | `info@birdrockcoffee.com` | CS/주문 | 전화 병기 |

**왜 파트너십·미디어 주소가 최고 등급인가**
CS·주문 주소(`info@`·`support@`·`orders@`)는 담당자에게 **영업 메일을 넘길 의무가 없다.** 반면 파트너십·미디어 인박스는 **업무 자체가 외부 제안 검토**다. 같은 회사·같은 제품이라도 회신율이 다르다.

**점수 가중치 변경**: 파트너십 +6 · 미디어 +5 · 도매 +4 · 실명 +3 · 일반 +1 · CS 0 (기존 실명 중심에서 상향 조정)

**교훈**: 자동 추출은 후보를 좁히는 용도로만. **발송 전 주소 확인은 필수** (이번에 5/52 = 약 10% 오탐).

---

## 4. 발송 규칙 (사장님 작업)

### 법적 최소 요건 (미국 CAN-SPAM · 영국 PECR 공통)
- **수신거부 경로 명시** — "Reply 'no' and I won't write again." 형태로 1줄
- **신원 표기** — 회사명·실제 발송 주소(tailoredad.com)·연락 이메일
- **오해 유도 금지** — 제목이 내용과 일치해야 함

### 실무 규칙
- **발송 계정**: `support@tailoredad.com` — ⚠️ **현재 이 주소는 수신 전용**(Cloudflare Email Routing). 발송 수단(Google Workspace 권장) 확보 전에는 발송 불가
- **DMARC 없음**: `tailoredad.com`에 SPF만 있고 DMARC 레코드가 없다. 대량 발송 전 `p=none` 추가 권장
- **분산 발송**: 하루 5~8통 (한 번에 몰아 보내면 스팸 분류)
- **1:1 개인화**: 템플릿 대량 발송 금지 — 브랜드명·제품명·이미지가 각각 달라야 함
- **첨부 형식**: 1장은 본문 인라인, 나머지는 링크 (첨부파일은 스팸 필터가 가장 싫어하는 조합)
- **광고 집행 확인**: 발송 전 Meta Ad Library에서 해당 브랜드 광고를 눈으로 확인 (1곳당 1분). 자동 판별 불가

---

## 5. 메일 구성 (초안 확정 전 뼈대)

1. **제목**: 브랜드명 + 한 가지만. 예) "An ad for [Brand]'s [product], made with your photo"
2. **첫 문장**: 무엇을 했는지 (팔지 않음) — "I took the [product] photo from your store and ran it through our tool. The result is attached."
3. **본문**: 2~3문장. 우리가 뭘 하는지 한 줄 + 왜 그 브랜드에 맞는지 한 줄
4. **선물**: 첨부 이미지 + "여기서 10장 더 무료로 만드실 수 있습니다" (링크에 UTM 필수 — `?utm_source=seed&utm_campaign=<brand>`)
5. **수신거부 + 신원** 1줄
6. **요구 없음**: 미팅 요청·전화번호 요구 없이 끝냄 (회신율 우선)

---

## 6. 진행 상태

- [x] 1차 후보 수집 (25곳, 10-28 오전)
- [x] **2차 실측 검증** (131개 도메인 스캔 → 1군 34곳·2군 15곳, 10-28 오후)
- [ ] 사장님: 발송 수단 확보 (Google Workspace 등) — **발송의 선행 조건**
- [ ] 1군 34곳 Meta Ad Library 확인 (광고 집행 여부 확정)
- [ ] 브랜드별 대표 제품 1개 선정 + 제품 사진 확보
- [ ] 크리에이티브 생성 (도그푸딩 겸함)
- [ ] 메일 카피 초안 (브랜드별 1:1) → 사장님 검수
- [ ] 3통 테스트 발송 → 반응 확인 → 확장 판단
- [ ] 응대 → **증언 1개 확보** (4단계 진입 조건)

---

## 7. 응대 시 주의

- **"무료로 계속 해드릴게요" 금지** — 무료 노동이 됨. 10장 무료는 제품이 이미 제공
- **증언 요청 타이밍** — 그들이 결과물을 자기 광고에 실제로 쓴 것을 확인한 뒤에 1회만 요청
- **거절 응답은 정중히 종료** — 재접촉 금지 (도메인 평판 보호)
