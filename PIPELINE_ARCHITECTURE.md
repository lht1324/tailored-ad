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

## 5. 오케스트레이터 와꾸 — Workflow 클래스가 순서를 소유한다

> **10-31 정정**: 이전 판의 `planNextSteps` + `advanceBatch` 상태머신은 **불필요해졌다**.
> Workflows의 `step.do`가 결과를 저장하고 실패 시 그 step부터 재개하므로, DB 상태를 읽어
> "다음 할 일"을 매번 계산하는 장치가 필요 없다. **오케스트레이터 = Workflow의 `run()`**

```ts
// src/workflows/batchPipeline.ts
export class BatchPipeline extends WorkflowEntrypoint<CloudflareEnv, { batchId: string }> {
  async run(event: WorkflowEvent<{ batchId: string }>, step: WorkflowStep) {
    const { batchId } = event.payload;

    await step.do('assign-specs', () => assignSpecs({ batchId }));

    for (const c of creatives) {
      await step.do(`prompt-${c}`, () => prepareCreativePrompt({ batchId, creativeIndex: c }));
      await step.do(`submit-base-${c}`, () => submitBaseImage({ batchId, creativeIndex: c }));
    }

    // Replicate가 일하는 동안 워크플로는 waiting (동시성 슬롯도 소모하지 않음)
    const ev = await step.waitForEvent('replicate', { type: 'replicate', timeout: '20 minutes' });
    await step.do('handle-base', () => handleBaseResult({ batchId, ...ev.payload }));

    await step.do('submit-ratios', () => submitRatios({ batchId }));
    // ... ratios 대기 → analyzeCreative → 종료
  }
}
```

### 호출 지점은 2종류의 문뿐

| 문 | 하는 일 |
|---|---|
| `POST /api/image` | 배치 생성 → `env.BATCH_PIPELINE.create({ id: batchId, params })` → **202** |
| `POST /api/webhook/replicate/*` | 서명검증 → `env.BATCH_PIPELINE.get(batchId).sendEvent({ type:'replicate', payload })` → **200** |
| `POST /api/webhook/dodo` | 서명검증 → step 함수 직접 or 별도 워크플로 (W3에서 결정) |


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

## 7. 실행 엔진 — 결정: **Cloudflare Workflows**

> **10-31 변경**: 이전 판은 Queue였다. 공식 문서 재확인 후 **Workflows**로 정정.

| | 1안 `waitUntil` | 2안 Queue | **3안 Workflows (채택)** |
|---|---|---|---|
| wall clock | **30초 후 취소** | 15분/invocation | **step당 무제한** |
| 재시도 | 직접 구현 | 자동 + DLQ | **자동 + step별 설정** |
| 재실행 비용 | 전부 재실행 | 중복 실행 위험 | **step 결과 재사용(과금 중복 없음)** |
| 상태 조회 | 없음 | 큐 메트릭 | **instance id로 상태 조회** |
| 외부 이벤트 대기 | 불가 | 별도 구현 | **`step.waitForEvent`** |
| 새 인프라 | 0 | 큐 + custom worker | 워크플로 + custom worker |

**공식 근거**
> Cloudflare Workers Best Practices (2026-02-15): "Use **Queues for simple fan-out and buffering**, and **Workflows for multi-step durable processes**."

**우리 케이스가 Workflows인 이유** (Ryan Lindsey의 판단 기준 그대로)
- step 비용이 비쌈(LLM·Replicate) → **재시도 시 결과를 재사용해야** 함
- 대기가 대부분(모델 응답)
- `batchId`로 상태를 조회할 일이 있음
- 실패가 조용히 사라지면 안 됨

**Workflows 한도 (실측, Workers Paid)**
| 항목 | 값 |
|---|---|
| step wall clock | **무제한** (네트워크 대기 포함) |
| step CPU | 30초 기본 / 최대 5분 (`limits.cpu_ms`) |
| step 반환값 | **1MiB** ← 이미지 base64 반환 금지, R2 키만 |
| steps per workflow | 10,000 (최대 25,000) |
| `step.sleep` | 최대 365일 |
| workflow instance ID | 최대 100자, `^[a-zA-Z0-9_][a-zA-Z0-9-_]*$` |

→ **프롬프트 LLM 대기는 wall clock 무제한이라 잘리지 않는다.** CPU만 30초인데 우리 단계는 대기 위주다.

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
| D1 | 엔진 = **Workflows** (10-31 변경, 이전 Queue) | 공식 권고: "multi-step durable processes → Workflows". 재시도 시 step 결과 재사용으로 **과금 중복 방지** |
| D2 | `rendering` 상태 **삭제** | 미사용 (타입에만 존재) |
| D3 | 상태 쓰기 = **RPC 유지**, 오케스트레이터는 읽기 전용 | RPC와 경쟁하면 last-writer-wins 사고 |
| D4 | 내부 라우트 10개 + fungies **삭제** | 클라이언트 미사용 확인, 오케스트레이터가 대체 |
| D5 | 정체 감시 **추가** | `waitForEvent` 타임아웃·워크플로 실패를 놓치지 않기 위해 |
| D6 | 서비스 위치 = `src/lib/pipeline` | 기존 `lib/*` 관례 유지 |
| D7 | `lib/api/server/ad/*` **유지** | 이미 올바른 계층. 건드리면 위험만 늘어남 |
| D8 | ~~S2(서비스 바인딩 임시 복구) 생략~~ → **불필요해짐** | Workflows 도입으로 self-fetch 자체가 사라짐 |
| D9 | `planNextSteps`/`advanceBatch` 상태머신 **불필요** | Workflows의 step 저장·재개가 그 역할을 대체 |
| D10 | `cloudflare:workers` 타입은 **최소 수기 선언** | `wrangler types --include-runtime true`가 기존 코드 84곳을 깨뜨림(실측) |
| D11 | `cloudflare-env.d.ts` **git 추적** | 없으면 fresh clone에서 tsc 실패. 값이 아닌 env 이름만 담김 |

---

## 10. 구현 순서 (각 단계 끝나도 서비스 정상)

| 단계 | 내용 | 끝나면 | 예상 | 상태 |
|---|---|---|---|---|
| **W0** | custom worker(`worker.ts`) + `BatchPipeline` 골격 + workflows 바인딩 + 타입 기반 | 배포 가능한 골격 (dry-run 검증) | 1~2시간 | ✅ **완료 (10-31, `f504766`)** |
| **W1** | `assignSpecs`·`prepareCreativePrompt`·`submitBaseImage`·`handleBaseResult` 이동 + 워크플로 연결 + 라우트 4개 삭제 | ★ **1장 생성 end-to-end 동작** | 3~4시간 | ⬜ |
| **W2** | `submitRatios`·`handleRatioResult`·`analyzeCreative` 이동 | 다중 포맷 완주 | 2~3시간 | ⬜ |
| **W3** | `submitPersona`·`handlePersonaResult`·`grantCredits` 이동 | 내부 라우트 전부 소멸 | 2~3시간 | ⬜ |
| **W4** | `npm run deploy` → **prod 스모크**(1장 완주 + Replicate 신규 예측) | 실사용 가능 | 1시간 | ⬜ |
| **W5** | 정체 감시(워크플로 실패/타임아웃) + `next/server` import lint + `rendering` 제거 | 마감 | 반나절 | ⬜ |

**W0에서 실측한 것 (10-31)**
- `wrangler deploy --dry-run`이 **`env.BATCH_PIPELINE (BatchPipeline) → Workflow`** 바인딩을 인식했다
- `main: "./worker.ts"`로 바꿔도 OpenNext 산출물(`.open-next/worker.js`)을 정상 번들한다
- `wrangler types --include-runtime true`는 **기존 코드 84곳을 깨뜨린다**(`request.json()` → `unknown`). 그래서 `--include-runtime false` + 최소 수기 선언(`src/types/cloudflare-workers.d.ts`)으로 간다
- `.open-next`는 next build가 아니라 **opennextjs-cloudflare build** 산출물이다. `worker.ts`의 import는 그때만 존재하므로 `@ts-ignore`(expect-error 아님)를 쓴다

**W1이 이 계획의 핵심이다.** 4개 step이 붙는 순간 파이프라인이 prod에서 처음으로 완주하므로, "다 옮기고 나서 테스트"가 아니라 **첫 사이클에서 검증**한다.

---

## 11. 함정 (구현 전 필독)

1. **`step` 밖 부수효과 금지** — 재실행 시 중복. `Math.random()`·`Date.now()`도 step 안에서
2. **step 반환값 1MiB** — 이미지 base64를 반환하면 초과한다. **R2에 쓰고 키만** 반환
3. **RPC와 상태 쓰기 경쟁 금지** — `designing`/`completed`는 SQL RPC가 쓴다. 워크플로가 같은 컬럼을 쓰면 안 된다
4. **웹훅은 즉시 200** — `sendEvent`만 하고 무거운 일은 워크플로에서
5. **`waitForEvent` 타임아웃은 throw** → 워크플로 인스턴스가 실패로 끝난다. `try/catch`로 감싸 재시도/실패 처리
6. **`waitForEvent`의 `type`은 문자·숫자·`-`·`_`만** (`.` 불가)
7. **instance id = batchId** — `create({ id: batchId })`로 만들면 웹훅이 `get(batchId)`로 찾을 수 있다
8. **custom worker 도입 시** `DOQueueHandler`·`DOShardedTagCache` re-export 유지 (ISR 캐시가 쓴다)
9. **`cloudflare-env.d.ts` 갱신** — `wrangler.jsonc` 바인딩을 바꾸면 `npm run cf-typegen` 재실행
10. **삭제는 마지막** — 대체 함수가 prod에서 검증된 뒤에 라우트를 지운다

---

## 12. 참고

| 문서 | 내용 |
|---|---|
| `PIPELINE_AUDIT.md` | self-fetch 전수 조사(호출부 19곳/라우트 11개), Phase 1·2 근거 |
| `context.md` §11 A0 | 실행 체크리스트 |
| `context.md` §9 | 운영 gotcha (replay 규칙, BASE_URL 용도) |
| OpenNext `howtos/custom-worker` | worker에 fetch 외 핸들러 추가하는 공식 방법 |
| Cloudflare Workers Limits | "same zone fetch without service bindings fails" |
