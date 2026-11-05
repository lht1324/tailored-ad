# 생성 품질 문제 분석 (2026-11-05)

> 대상: `/create` → 배치 생성 결과물. 파이프라인 자체는 정상 동작한다.
> 이 문서는 **압축(세션 요약) 이후에도 그대로 참조하기 위한 고정 기록**이다.

## 0. 한 줄 결론

**파이프라인은 정상이고, 실패 지점은 "최종 프롬프트가 모델에게 ①무엇이 무엇인지 ②어떻게 쓰이는지 ③얼마나 큰지를 말하지 않는 것"이다.**

## 1. 확인된 사실 (증거 있음)

| # | 사실 | 증거 |
|---|---|---|
| **F1** | 파이프라인은 **완주한다**. 생성 실패가 아니라 **품질** 문제다 | batch `719651d2`·`3163adbc`: `status=completed`, 4장 png, score 8.8~9.1 |
| **F2** | **캡션에 이미지 태그가 없다** — 모델이 어느 참조가 상품/인물인지 모른다 | `lib/server/replicateInputMapper.ts::resolveImageInputTags`는 `PRODUCT_IMAGE`→`image_input[0]` **치환만** 하고 접두사를 붙이지 않는다. 실제 캡션은 `"The person standing beside the product, an oversized white t-shirt…"`로 시작해 태그가 **0개** → 치환할 것도 없음 |
| **F3** | 캡션이 상품을 인물과 **분리**한다 | spec0 `"The person standing beside the product … highlighting the sneaker"` / spec1 `"The product beside the person … the sneaker resting on a highly polished floor"` |
| **F4** | 프롬프트 템플릿이 **camera 축으로 staging을 정의**한다 | `POST_AD_CREATIVE_PROMPT.ts` L154: `hero_shot = monumental solo`, `environment_shot = placed in a world`, `lifestyle_shot = worn or in use`, `product_in_hand = held` |
| **F5** | 샘플러 `combined` 모드가 **`hero_shot`·`environment_shot`을 허용**한다 | `creativeCombinationSampler.ts` `MODE_EXCLUDED_VALUES.combined.camera = [packshot, detail_close, flat_lay, overhead_angle]` → 남는 축에 단독/배치 계열이 포함 |
| **F6** | 페르소나가 **흉상**이다 → 참조에 **발이 없다** | `POST_AD_PERSONA_PROMPT.ts` L86: `"front-facing studio portrait, head and shoulders, neutral seamless background"` (하드코딩) |
| **F7** | LLM이 **콜론 붙은 키**를 반환한다 | DB `copy`: `":headline": "…"` (3배치 중 2배치). 정상 키는 `headline` |
| **F8** | 입력 상품 사진에 **매다는 끈**이 있다 | 사용자 제공 이미지 |
| **F9** | 베이스 모델은 **FLUX 3 단일** | `selectImageModel()` 항상 `FLUX_3_IMAGE` |

## 2. 원인 우선순위

| 순위 | 원인 | 왜 이 순위인가 |
|---|---|---|
| **P1** | **이미지 매핑 부재 (F2)** | 모델이 두 참조의 역할을 모르면 나머지 지시(착용·크기)를 걸 대상이 없다. **가장 근본** |
| **P2** | **축 모순 (F4+F5)** | LLM이 규칙을 어긴 게 아니라 **축이 "단독/배치"를 시켰다**. B2를 넣어도 축이 반대면 무력화 |
| **P3** | **흉상 페르소나 (F6)** | "신고 있는" 그림을 만들 참조 정보가 없다. 프롬프트로 메울 수 없음 |
| **P4** | 착용·스케일 규칙 부재 (F3) | 프롬프트에 "worn"도 "life-size"도 없다 |
| **P5** | 키 오염 (F7) | 품질이 아니라 **데이터 유실**(`copy.headline` undefined) |
| **P6** | 입력 사진의 끈 (F8) | 모델이 "부유물"로 해석. 시스템이 견뎌야 하는 입력이지만 테스트 변수 |
| **P7** | 모델 능력 (F9) | **미판정**. P1~P4를 고친 뒤에야 판정 가능 |

## 3. 판정 실험

### 실험 1 (권장) — P1~P4를 고치고 배치 1회

```
수정: 캡션에 태그 강제(P1) · combined 축 정리(P2) · 전신 페르소나(P3) · 착용/스케일 규칙(P4)
실행: /create 동일 설정(운동화 · 1:1+9:16 · concept 2 · persona ON)
판정: 아래 3기준
```

| 결과 | 해석 | 다음 |
|---|---|---|
| 신발을 **신고** 있음 | P1~P4가 원인 | 프롬프트 정비 완료 |
| 여전히 옆에 놓임 | **모델이 "worn"을 못 따름** | 모델 교체 또는 합성 방식 변경 |
| 다리를 창작했으나 어색 | P3이 본질 | 페르소나 구도를 더 정교하게 |

### 실험 2 (선택) — 모델 능력만 격리

수정 없이 **캡션만** `"image_input[0] is the product; image_input[1] is the person wearing image_input[0] on their feet at real-world scale…"`로 강제해 1장 생성.
현재 파이프라인에는 캡션을 외부에서 주입하는 경로가 없어 **임시 디버그 경로**가 필요하다(비용 1장).

## 4. 판정 기준 (사장님 눈)

1. 신발이 **발에** 있는가
2. 인물 대비 **실물 비율**인가 (신발 ≈ 30cm)
3. **글자가 깨지지 않았는가** (코드 조판이므로 깨지면 버그)

## 5. 압축 후에도 유지할 것

- 이 문서 경로: `GENERATION_QUALITY.md` (develop 루트)
- 이관 이력·남은 작업: `context.md` §0, §12
- 파이프라인 설계: `PIPELINE_ARCHITECTURE.md`
- 되돌리기 지점: 태그 `pre-vite` (Next 앱 전문)
