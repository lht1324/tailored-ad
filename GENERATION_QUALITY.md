# 생성 품질 — 원인 분석 및 판정 결과

> 대상: `/create` → 배치 생성 결과물.
> **상태: 판정 완료 (2026-11-07).** 원인은 프롬프트였고, 수정 후 배치에서 신발을 신은 결과를 확인했다.
> 이 문서는 **압축(세션 요약) 이후에도 그대로 참조하기 위한 고정 기록**이다.

## 0. 한 줄 결론

**파이프라인은 정상이었고, 실패 지점은 "최종 프롬프트가 모델에게 ①무엇이 무엇인지 ②어떻게 쓰이는지 ③얼마나 큰지를 말하지 않은 것"이었다.**
세 가지를 명시하자 FLUX 3는 신발을 신겼다. **모델 한계가 아니라 프롬프트 결함이었다.**

## 1. 확인된 사실 (당시 증거)

| # | 사실 | 증거 |
|---|---|---|
| **F1** | 파이프라인은 **완주한다**. 생성 실패가 아니라 **품질** 문제다 | batch `719651d2`·`3163adbc`: `status=completed`, 4장 png, score 8.8~9.1 |
| **F2** | **캡션에 이미지 태그가 없다** — 모델이 어느 참조가 상품/인물인지 모른다 | `resolveImageInputTags`는 태그를 **치환만** 한다. 실제 캡션은 `"The person standing beside the product…"`로 시작해 태그 **0개** |
| **F3** | 캡션이 상품을 인물과 **분리**한다 | spec0 `"…beside the product … highlighting the sneaker"` / spec1 `"The product beside the person … resting on a polished floor"` |
| **F4** | 프롬프트 템플릿이 **camera 축으로 staging을 정의**한다 | `hero_shot = monumental solo`, `environment_shot = placed in a world` |
| **F5** | 샘플러 `combined`가 **단독 구도 축을 허용**한다 | `hero_shot`·`environment_shot`이 풀에 남아 있었다 |
| **F6** | 페르소나가 **흉상**이다 → 참조에 **발이 없다** | `POST_AD_PERSONA_PROMPT.ts`: `head and shoulders` 하드코딩 |
| **F7** | LLM이 **콜론 붙은 키**를 반환한다 | DB `copy`: `":headline": "…"`. **미수정 — 남은 작업** |
| **F8** | 입력 상품 사진에 **매다는 끈**이 있다 | 사용자 제공 이미지 |
| **F9** | 베이스 모델은 **FLUX 3 단일** | `selectImageModel()` 항상 `FLUX_3_IMAGE` |

### 문서 조사로 추가 확인 (2026-11-06)

BFL 공식 문서·Runware 가이드로 확인한 사실:

- FLUX 3의 참조 지목 문법은 **`image 1`, `image 2`** (위치 기반)뿐이다. 이름 태그 기능은 없다.
- **"say how the images relate"** — 관계를 프롬프트로 말해야 한다. 자동 추론하지 않는다.
- **"An image with no role in the sentence still influences the output, usually by leaking."** — 역할 없는 참조는 장면에 새어 들어온다(거대 신발의 직접 원인).
- **"FLUX 3 decides where each reference sits and how big."** — 크기를 비우면 모델이 정한다.
- 참조 이미지가 있으면 해상도 상한 **4MP** (현재 `2k` = 2048² = 4,194,304 로 정확히 상한).

## 2. 원인 우선순위 (당시)

| 순위 | 원인 | 결과 |
|---|---|---|
| **P1** | 이미지 매핑 부재 (F2) | 수정 완료 |
| **P2** | 축 모순 (F4+F5) | 수정 완료 |
| **P3** | 흉상 페르소나 (F6) | 수정 완료 |
| **P4** | 착용·스케일 규칙 부재 (F3) | 수정 완료 |
| **P5** | 키 오염 (F7) | **미수정** |
| **P6** | 입력 사진의 끈 (F8) | 프롬프트에 "행택·끈은 제품이 아니다" 명시 |
| **P7** | 모델 능력 (F9) | **판정 완료 — 문제 없음** |

## 3. 적용한 수정

### 커밋 `255d7aa` — 태그·모순 정리

- 문장 구조가 **태그를 쓰도록** 3벌 전부 수정 (`'the product'` → `'PRODUCT_IMAGE'`, 관계 어휘 → 태그)
- `do this` 예시 6개가 prose를 쓰던 것 수정
- 모드별 오염 제거 (상품만 프롬프트의 `PERSON_IMAGE` 4건, 인물만의 `PRODUCT_IMAGE` 4건)
- `note`와 "제품 묘사 금지" 충돌 해소 — **노트 분류 규칙**: art direction은 반영, appearance description은 복사 금지
- 출력 스키마의 깨진 JSON 예시 수정 (`""white" | "black""` → `"white | black"`)
- 페르소나 **전신화** (`head and shoulders` → `full-body standing, head to feet`)
- `Remotion` → `overlay`, `transparent-background cutout` 단정 완화

### 커밋 `a8d95d5` — 제품 쓰임(staging) 우선 구조

- LLM이 **관계를 먼저 결정**하고 출력: `relationship: worn | held | using | placed`
- `combined` 카메라 풀에서 **단독 구도 축 제거** → 남는 축 `lifestyle_shot`, `product_in_hand`
- **스케일·접지 강제**: 실물 크기를 신체 기준으로, 접지 그림자, "참조의 화면 점유율을 옮기지 말 것"
- **린트 → 1회 재생성 → 결정적 보정**: `beside`·`next to`·`resting on` 등 인물 첨부 시 금지
- `buildCaptionWrapper.ts` 신규 — base 생성·비율 재시도 공용. `image 1 = product, image 2 = person` 명시 + staging 상기

## 4. 판정 실험 결과 — **통과**

배치 `3956437d-c302-48fb-b883-48d9531e79a4` (2026-11-06)
설정: 운동화 · 1:1 + 9:16 · concept 2 · persona ON · note 없음 · 로고 없음 · 팔레트 없음

| | creative 0 | creative 1 |
|---|---|---|
| 축 | `product_in_hand` / high_key / vivid | `lifestyle_shot` / low_key / muted |
| 캡션 앵커 | `PERSON_IMAGE wearing PRODUCT_IMAGE` | 동일 |
| 금지 표현 | **0건** | **0건** |
| 스케일·접지 | "true foot-length", "contact shadow" | "both feet planted at foot-length", "soles flat" |
| **1:1 결과** | **양발에 신겨짐**, 발 길이, 접지 그림자 | **전신 스탠딩**, 양발 착용, 접지 그림자 |
| score | 8.3 | 8.2 (9:16은 8.4) |

**보정 흔적 없음** — 결정적 보정 문구(`at real-world scale, both feet in frame…`)가 없고 문장이 자연스럽다. 린트를 처음부터 통과했거나 재생성 1회로 해결됐다.
(서버 로그는 확인하지 못했으므로 `staging violation` 발생 여부는 미확인)

### 판정 기준 대조

| 기준 | 결과 |
|---|---|
| 신발이 **발에** 있는가 | ✅ |
| **실물 비율**인가 (발 길이) | ✅ |
| **글자가 깨지지 않았는가** | ✅ (이미지 내 텍스트 0건, 오버레이 전용) |
| 제품 정체성 보존 | ✅ (천공 레더·탄색 힐 라이닝·초록 힐 탭) |

## 5. 남은 흠 (치명 아님)

1. **creative 0의 꼬인 다리** — 무릎에 올린 발의 발목-신발 연결이 살짝 모호. 신고 있다로 읽히긴 함.
2. **9:16 구도** — 1:1을 BRIA로 세로 확장한 것. 왜곡은 없지만 9:16용 구도 설계는 아니다(전신이 작고 위아래가 빔). **이번 수정과 무관한 구조적 한계.**
3. **카메라 다양성 감소** — `combined`의 camera가 2개뿐. 다른 4축이 변주를 담당.
4. **페르소나 전신화 부작용 가능성** — 1:1에 전신을 넣어 얼굴 픽셀이 줄었다. 이번 배치에서는 문제없었으나 얼굴 유사도는 계속 볼 것.

## 6. 다음 작업

| | 내용 |
|---|---|
| **1** | **다른 카테고리 1회** — 향수병으로 `held`/`using`이 나오는지 (신발 과적합 확인) |
| **2** | **키 정규화 (F7)** — `":headline"` 같은 콜론 키 제거 |
| **3** | 카메라 풀 재검토 — 관계가 고정됐으니 `detail_close`(신발 클로즈업)를 combined에 다시 허용할지 |
| **4** | `grounding: true` A/B — 상품 동일성에 역효과 가능성 |
| **5** | 로고 경로 실검증 — 배치 68개 중 로고 0건. **한 번도 실행 안 됨** |
| **6** | 프롬프트 3벌 → 1벌 통합 (유지보수, 급하지 않음) |

## 7. 압축 후에도 유지할 것

- 이 문서: `GENERATION_QUALITY.md` (develop 루트)
- 이관 이력·남은 작업: `context.md` §0, §12
- 파이프라인 설계: `PIPELINE_ARCHITECTURE.md`
- 되돌리기 지점: 태그 `pre-vite` (Next 앱 전문)
