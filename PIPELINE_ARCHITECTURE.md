# TailoredAd — 파이프라인 아키텍처 설계 (오케스트레이터)

*Last Updated: 2026-10-30 · 작성: AI 에이전트 · 상태: **설계 확정 / 구현 미착수***

> 이 문서는 **"누가 파이프라인을 소유하는가"** 를 정하는 설계서다.
> 진단·조사 근거는 `PIPELINE_AUDIT.md`(self-fetch 전수 조사), 실행 체크리스트는 `context.md` §11 A0.
> **원칙: route.ts는 문(door)이고, 파이프라인은 오케스트레이터가 소유한다.**

---

## 0. 왜 이 설계인가 (한 문단)

지금은 **route.ts가 다음 route.ts를 호출**한다. 프롬프트 생성 라우트가 마지막 줄에서 "이미지 생성 라우트로 가라"고 지시하는 식이다. 원래 이유는 Vercel의 5분 타임아웃이었지만, **Cloudflare Workers에서는 이 이유가 사라진다**(HTTP 요청에 벽시계 제한이 사실상 없다). 대신 자기 zone fetch가 금지되어 그 구조가 **아예 동작하지 않는다**(`PIPELINE_AUDIT.md` §2). 게다가 route가 route를 부르는 한, 각 라우트는 자기 일만 할 수 없고 파이프라인 지식이 문 안에 눌러앉는다.

그래서 역할을 넷으로 쪼갠다: **문(route) / 단계(step 함수) / 순서(오케스트레이터) / 접근(serverAPI)**.

---

## 1. 실측 전제 (설계 근거)

| 항목 | 실측 | 설계 함의 |
|---|---|---|
| route 파일 | **35개** | 그중 파이프라인 내부 연결용 **10개** + 죽은 라우트 1개 |
| 업무 로직 위치 | 이미 `lib/api/server/ad/*`에 메서드 22개 | 라우트에 남은 건 **조립 + 연결**뿐 → 추출이 가볍다 |
| 클라이언트가 내부 라우트를 직접 호출? | **아니오** (참조는 주석뿐) | 내부 라우트 10개는 **삭제 가능** |
| 상태 쓰기 주체 | `queued`·`generating`·`failed` = **코드** / `designing`·`completed` = **SQL RPC** | **오케스트레이터가 상태를 직접 쓰면 RPC와 충돌** → 읽기 전용 |
| `rendering` 상태 | **미사용** (타입에만 존재) | 삭제 |

### 상태 전이 (현재 실제 동작)
```
(생성) ──► queued ──[code: specs]──► generating ──[RPC: 모든 이미지 완료]──► designing
                                                                              │
                                          [RPC: 모든 score 완료] ──► completed
실패: specs 단계에서만 failed (code). creative 단위 실패는 배치를 죽이지 않는다.
rendering: 어디서도 쓰이지 않음 → 제거 대상.
```

---

## 2. 판정 규칙 — 무엇이 route이고 무엇이 함수인가

| # | 규칙 | 위반 시 증상 |
|---|---|---|
| **R1** | **외부**(브라우저·Replicate·Dodo·크론)가 부르면 **route로 남긴다** | 외부인이 들어올 문이 없음 |
| **R2** | **파이프라인만** 부르면 **함수로 빼고 route를 삭제**한다 | route→route 결합이 다시 생김 |
| **R3** | route에 남는 건 `인증 → 파싱 → 함수 호출 → 응답` 뿐. **20줄 초과 시 설계 위반** | 로직이 다시 문에 눌러앉음 |
| **R4** | 파이프라인 함수는 `NextRequest`·`Response`·`cookies`를 **import하지 않는다** | HTTP와 업무가 다시 엉킴 |

> **R4 강제 방법**: `src/lib/pipeline/**`에서 `next/server` import 시 ESLint error (`no-restricted-imports`).

---

## 3. route 처리표 (35개)

### 3.1 남긴다 — 외부 문 (24개)

| 묶음 | 라우트 | 남는 역할 |
|---|---|---|
| 브라우저 입구 | `api/client-gateway`, `api/auth/[...path]`, `api/events`, `callback/auth` | 인증·중계·SSE |
| **생성 시작** | `api/image` | 업로드 → **오케스트레이터 시동** → 즉시 202 |
| 조회·편집 | `api/ad-generation-batches`, `api/ad-generation-batches/[batchId]`, `api/user/[userId]`, `api/user/by-email`, `api/profile/logo`, `projects/[projectId]/image`, `api/creative/[creative-index]/design` | 얇은 CRUD |
| 결제 | `api/dodo/checkouts`, `api/dodo/products`, `api/dodo/orders`, `api/dodo/subscriptions`, `api/dodo/subscriptions/change`, `api/dodo/subscriptions/cancel`, `api/dodo/subscriptions/revert` | 얇은 중계 |
| **외부 웹훅** | `api/webhook/dodo`, `webhook/replicate/image/base`, `webhook/replicate/image/ratios`, `webhook/replicate/persona` | 검증 → **advance 트리거** → 즉시 200 |
| 정적 | `llms.txt` | — |

### 3.2 삭제한다 — 내부 연결 문 (11개)

| 삭제할 route | 대체 함수 |
|---|---|
| `api/creative/specs` | `assignSpecs()` |
| `api/creative/[creative-index]/prompt` | `prepareCreativePrompt()` |
| `api/creative/[creative-index]/analysis` | `analyzeCreative()` |
| `api/image/generation/base` | `submitBaseImage()` |
| `api/image/generation/ratios` | `submitRatios()` |
| `api/image/generation/persona` | `submitPersona()` |
| `api/image/process/base` | `handleBaseResult()` |
| `api/image/process/ratios` | `handleRatioResult()` |
| `api/image/process/persona` | `handlePersonaResult()` |
| `api/dodo/process` | `grantCredits()` |
| `api/webhook/fungies` | **죽은 라우트** (대상 `/api/fungies/process` 부재, 폐기 결제사) — 대체 없음 |

> 삭제는 **오케스트레이터가 그 단계를 실제로 대체한 뒤**에 한다. 먼저 지우면 파이프라인이 끊긴다.

---

## 4. 최종 파일 트리

```
src/lib/pipeline/
  orchestrator.ts        advanceBatch(batchId)          ← 파이프라인 전담
  plan.ts                planNextSteps(batch)            ← 순수 함수 (테스트 대상)
  types.ts               StepError, StepOutcome, BatchView
  guards.ts              멱등 가드 (이미 했으면 skip)
  steps/
    assignSpecs.ts
    prepareCreativePrompt.ts
    submitBaseImage.ts
    handleBaseResult.ts
    submitRatios.ts
    handleRatioResult.ts
    analyzeCreative.ts
    submitPersona.ts
    handlePersonaResult.ts
    finalizeBatch.ts
  billing/
    grantCredits.ts

src/lib/api/server/ad/   ← 유지. DB·LLM·이미지 접근 계층 (메서드 22개)
src/app/api/**/route.ts  ← 얇은 문만
worker.ts                ← custom worker (Queue consumer export). OpenNext 공식 방식
```

**왜 `lib/pipeline`인가**: 이 프로젝트는 이미 `lib/api/server/ad`, `lib/content/blog`, `lib/db`처럼 도메인별 폴더를 쓴다. `src/services/`를 새로 만들면 관례가 둘로 갈라진다.

---

## 5. 오케스트레이터 와꾸

### 5.1 `planNextSteps(batch)` — 순수 함수

```ts
// DB 상태만 보고 "다음에 뭘 해야 하는지" 계산한다. 부수효과 0. 네트워크 0.
export function planNextSteps(batch: AdGenerationBatch): PlannedStep[] {
  if (batch.status === 'queued') {
    return [steps.assignSpecs];
  }
  if (!allSpecsHavePrompt(batch)) {
    return missingCreatives(batch).map(steps.prepareCreativePrompt);
  }
  if (!allBasesSubmitted(batch)) {
    return missingCreatives(batch).map(steps.submitBaseImage);
  }
  if (!allImagesComplete(batch)) {
    return [];                                  // Replicate 대기. 할 일 없음
  }
  if (batch.status === 'designing' && !allScored(batch)) {
    return unanalyzedCreatives(batch).map(steps.analyzeCreative);
  }
  if (allScored(batch)) {
    return [steps.finalizeBatch];
  }
  return [];
}
```

**이 함수가 "다음 단계로 넘겨주는 일"의 유일한 소유자다.** route도, 다른 step도 아니다.

### 5.2 `advanceBatch(batchId)` — 실행기

```ts
export async function advanceBatch(batchId: string): Promise<void> {
  const batch = await loadBatch(batchId);       // 상태는 읽기만 (RPC가 쓴다)

  for (const step of planNextSteps(batch)) {
    try {
      await step.run(batch);                    // 각 step은 멱등 가드를 통과해야 실행
    } catch (error) {
      await recordStepFailure(batchId, step.id, error);   // last_error 기록 (조용한 실패 금지)
      throw error;                                        // 재시도는 엔진이 담당
    }
  }
}
```

### 5.3 호출 지점은 4곳뿐

| 호출자 | 언제 | 방식 |
|---|---|---|
| `POST /api/image` | 업로드 직후 | 큐 enqueue → 즉시 응답 |
| Replicate 웹훅 3종 | 결과 도착 | 큐 enqueue → 즉시 200 |
| `POST /api/webhook/dodo` | 적립 | 큐 enqueue → 즉시 200 |
| **크론 (신규)** | 10분 정체 배치 | 큐 enqueue |

---

## 6. 단계 계약 11개

**공통 계약**
- 입력·출력은 **plain object** (Request/Response 금지)
- 실패는 `throw new StepError(code, message)` — 오케스트레이터가 기록
- **멱등**: 같은 입력으로 두 번 실행해도 결과가 같아야 한다 (가드 통과 시 no-op)

| # | 함수 | 입력 | 출력 | 멱등 가드 |
|---|---|---|---|---|
| 1 | `assignSpecs` | `{batchId}` | `{specs}` | `specs.length > 0` → skip |
| 2 | `prepareCreativePrompt` | `{batchId, creativeIndex}` | `{creativePrompt, copy, baseRatio}` | `copy.headline != null` → skip |
| 3 | `submitBaseImage` | `{batchId, creativeIndex}` | `{predictionId}` | 해당 ratio predictionId 존재 → skip |
| 4 | `handleBaseResult` | `{batchId, creativeIndex, ratioKey, result}` | `{next}` | `imageResults[ratioKey]` 존재 → skip |
| 5 | `submitRatios` | `{batchId, creativeIndex, ratioKeys}` | `{submitted}` | 제출된 ratio 제외 |
| 6 | `handleRatioResult` | `{batchId, creativeIndex, ratioKey, result}` | `{next}` | 동일 |
| 7 | `analyzeCreative` | `{batchId, creativeIndex}` | `{designs}` | design 존재 → skip |
| 8 | `submitPersona` | `{batchId}` | `{predictionId}` | 존재 → skip |
| 9 | `handlePersonaResult` | `{batchId, result}` | `{next}` | 동일 |
| 10 | `finalizeBatch` | `{batchId}` | `{status}` | `completed` → skip |
| 11 | `grantCredits` | `{dodoPayload}` | `{granted}` | 웹훅 이벤트 id 기준 중복 차단 |

> 기존 `lib/api/server/ad/*`의 메서드는 **그대로 호출**한다. 이 계층은 옮기지 않는다(이미 올바른 위치).

---

## 7. 실행 엔진 — 결정: **Cloudflare Queues**

| | 1안 `waitUntil` | **2안 Queue (채택)** | 3안 Workflows |
|---|---|---|---|
| 새 인프라 | 0 | 큐 1 + custom worker | 워크플로 1 + custom worker |
| 웹훅 응답 지연 | 없음 | 없음 (별도 invocation) | 없음 |
| **30초 컷 위험** | **있음** — 분석(이미지 5장 LLM)이 길면 조용히 잘림 | **없음** | 없음 |
| 재시도 | 직접 구현 | **자동 + DLQ** | 자동 + step별 |
| 관측 | 로그뿐 | 큐 메트릭 | step별 조회 |
| 복잡도 | 낮음 | 중간 | 중간~높음 |

**채택 근거**
1. 우리 파이프라인의 모든 경계가 **이미 외부 이벤트**(Replicate 웹훅)다. Workflows의 핵심 무기인 `waitForEvent`가 필요 없다 (Replicate가 대신 기다린다)
2. 큐 메시지 = `{ batchId }` 한 개. "이 배치를 한 칸 전진시켜라"라는 뜻이라 **오케스트레이터가 순수 함수로 유지**된다
3. 1안은 매력적이지만 **분석 단계가 30초를 넘으면 조용히 잘린다.** 이번 사고와 같은 종류의 실패(조용한 유실)를 또 만든다

**부수 효과**: Queue consumer를 붙이려면 OpenNext의 **custom worker**가 필요하다 (공식 문서: `opennext.js.org/cloudflare/howtos/custom-worker`). `main`을 `worker.ts`로 바꾸고 생성된 fetch 핸들러를 재사용한다.

**Workflows를 쓰지 않는 이유를 정확히**: 불필요해서지, 불가능해서가 아니다. 나중에 **사람 승인·며칠짜리 대기**가 생기면 그때 Workflows로 올린다. step 함수는 그대로 재사용된다.

---

## 8. 실패·재시도 정책

| 단계 | 재시도 | 실패 시 결과 |
|---|---|---|
| `assignSpecs` | 2 | 배치 `failed` |
| `prepareCreativePrompt` | 2 | **그 creative만 실패** (배치 계속) |
| `submitBaseImage` | 2 | 그 creative만 실패 |
| `submitRatios` / `handleRatioResult` | 2 | 해당 ratio만 error 마킹 |
| `analyzeCreative` | 2 | design 없이 완료 (score 없음) |
| `finalizeBatch` | 3 | 경고만 |
| `grantCredits` | 5 → DLQ | **수동 확인 필수** (돈) |

**원칙**: 생성은 creative 단위 격리, **결제만 전체 실패로 승격**.

---

## 9. 결정 로그 (이 설계에서 확정한 것)

| # | 결정 | 이유 |
|---|---|---|
| D1 | 엔진 = **Queue** | 30초 컷 회피 + 재시도·DLQ. waitForEvent 불필요 |
| D2 | `rendering` 상태 **삭제** | 미사용 (타입에만 존재) |
| D3 | 상태 쓰기 = **RPC 유지**, 오케스트레이터는 읽기 전용 + `last_error` 별도 기록 | RPC와 경쟁하면 last-writer-wins 사고 |
| D4 | 내부 라우트 10개 + fungies **삭제** | 클라이언트 미사용 확인, 오케스트레이터가 대체 |
| D5 | 크론 감시 **추가** | `queued`/`generating` 10분 정체 = 이번 사고의 재발 감지 |
| D6 | 서비스 위치 = `src/lib/pipeline` | 기존 `lib/*` 관례 유지 |
| D7 | `lib/api/server/ad/*` **유지** | 이미 올바른 계층. 건드리면 위험만 늘어남 |

---

## 10. 구현 순서 (각 단계 끝나도 서비스 정상)

| 단계 | 내용 | 끝나면 | 예상 |
|---|---|---|---|
| **S2** | `WORKER_SELF_REFERENCE` 서비스 바인딩 + `internalFetch` 수정 | **prod 생성 복구** (임시) | 1시간 |
| **S0** | `prepareCreativePrompt` 1개만 추출 + 라우트 얇게 | 동작 동일, 그릇 확정 | 1~2시간 |
| **S1** | 나머지 10개 step 추출 | 라우트 전부 얇아짐 | 반나절~1일 |
| **S3** | `planNextSteps` + `advanceBatch` + Queue + custom worker | **오케스트레이터 가동**, self-fetch 0 | 1일 |
| **S4** | 내부 라우트 11개 삭제 + 크론 감시 + `rendering` 제거 | 구조 정리 완료 | 반나절 |

> **S2가 S0·S1과 독립**이다. S2를 먼저 해도 되고, S1을 먼저 해도 S2는 여전히 필요하다.
> 순서를 바꿔도 손해가 없는 유일한 조합이 "S2 먼저".

---

## 11. 함정 (구현 전 필독)

1. **`step` 밖 부수효과 금지** — 재실행 시 중복. `Math.random()`·`Date.now()`도 step 안에서
2. **RPC와 상태 쓰기 경쟁 금지** — `designing`/`completed`는 SQL RPC가 쓴다. 오케스트레이터가 같은 컬럼을 쓰면 안 된다
3. **웹훅은 즉시 200** — 큐 enqueue만 하고 무거운 일은 consumer에서
4. **멱등키** — Replicate 웹훅은 재전송된다. `imageResults[ratioKey]` 존재 여부로 차단
5. **custom worker 도입 시** `DOQueueHandler`·`DOShardedTagCache` re-export 유지 (ISR 캐시가 쓰고 있음)
6. **큐 메시지 크기** — `{ batchId }`만 넣는다. 이미지 base64를 메시지에 넣으면 안 된다
7. **삭제는 마지막** — 대체 함수가 prod에서 검증된 뒤에 라우트를 지운다

---

## 12. 참고

| 문서 | 내용 |
|---|---|
| `PIPELINE_AUDIT.md` | self-fetch 전수 조사(호출부 19곳/라우트 11개), Phase 1·2 근거 |
| `context.md` §11 A0 | 실행 체크리스트 |
| `context.md` §9 | 운영 gotcha (replay 규칙, BASE_URL 용도) |
| OpenNext `howtos/custom-worker` | worker에 fetch 외 핸들러 추가하는 공식 방법 |
| Cloudflare Workers Limits | "same zone fetch without service bindings fails" |
