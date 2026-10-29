# TailoredAd — 생성 파이프라인 감사 보고서 (self-fetch 전수 조사)

*Last Updated: 2026-10-30 05:55 · 작성: AI 에이전트 · 상태: **조사 완료 / 수정 미착수***

> **한 줄 결론**: 운영 서버에서 파이프라인이 **한 번도 끝까지 돌아간 적이 없다.** 원인은 단일 파일(`lib/utils/internalFetch.ts`)이며, 같은 원인이 **결제 적립까지 함께 막고 있다.**
> 이 문서는 "무엇이·왜·어디까지·어떻게" 고칠지에 대한 판단 근거다. 실행은 사장님 승인 후 별도 세션에서 한다.

---

## 1. 확정된 사실 (증거 기반)

prod에서 실제로 1장 생성을 시도한 뒤 3면에서 교차 확인했다.

| 확인 대상 | 실측 결과 | 의미 |
|---|---|---|
| `ad_generation_batches` | `status=queued`, `ad_creative_specs=[]`, `updated_at=null` | 조합 배정(specs) 단계가 **실행조차 안 됨** |
| Replicate 예측 목록 | **2026-10-09 이후 0건** | 이미지 생성 요청이 **한 번도 제출되지 않음** |
| 10-20 생성 배치 | 10일째 `queued` | **출시 이후 생성 성공 0건** |
| `subscription_grants` | 2건 모두 `reason='trial'`·구독 ID NULL | 유료 적립 기록 **0건** |
| `usage_ledger` | 0건 | 사용 차감 기록 없음 |
| 실패 배치 크레딧 | 차감 없음 (trial 10장 유지) | **금전 피해는 없음** (기능 손실만) |

---

## 2. 근본 원인

### 2.1 직접 원인 — Workers의 같은 zone fetch 차단

`src/lib/utils/internalFetch.ts`의 `internalFireAndForgetFetch()`는 **`BASE_URL`로 실제 HTTP 요청**을 보낸다.
그런데 prod의 `BASE_URL=https://tailoredad.com`은 **그 요청을 처리하는 워커 자신**이다.

Cloudflare Workers는 **자기가 서빙하는 zone으로의 subrequest를 허용하지 않는다**(무한 루프 방지). 따라서 호출이 즉시 실패한다.

### 2.2 왜 dev에서는 동작했나

dev의 `BASE_URL=https://dev.tailoredad.com`은 **Cloudflare Tunnel을 거치는 외부 요청**이라 정상적으로 사장님 PC 서버까지 도달한다. 즉 dev는 "진짜 네트워크 요청"이 되고, prod만 "자기 자신 호출"이 된다.

**이 차이 때문에 dev 검증이 prod를 보증하지 못했다.** 이것이 이번 사고의 구조적 함정이다.

### 2.3 왜 19곳이 한꺼번에 죽었나

`internalFireAndForgetFetch`는 **모든 파이프라인 단계가 공유하는 단일 유틸**이다. 한 곳이 잘못되면 전 단계가 같이 죽는다. 실제로 생성 체인 전체 + 결제 적립이 동시에 멈췄다.

---

## 3. 전수 조사 — 호출부 19곳 / 대상 라우트 11개

### 3.1 전체 목록

| # | 호출부 (파일:행) | 호출 대상 | 성격 |
|---|---|---|---|
| 1 | `api/image/route.ts:275` | `/api/image/generation/persona` | 업로드 후 첫 분기(인물) |
| 2 | `api/image/route.ts:281` | `/api/creative/specs` | 업로드 후 첫 분기(제품) |
| 3 | `api/creative/specs/route.ts:85` | `/api/creative/{i}/prompt` | 조합 배정 → 프롬프트 (creative 수만큼) |
| 4 | `api/creative/[creative-index]/prompt/route.ts:178` | `/api/image/generation/base` | 프롬프트 → 생성 제출 |
| 5 | `api/image/process/persona/route.ts:134` | `/api/creative/specs` | 인물 처리 → 조합 배정 |
| 6 | `api/image/generation/base/route.ts:146` | `/api/image/generation/ratios` | base 제출 실패 시 우회 |
| 7 | `api/image/process/base/route.ts:75` | `/api/image/generation/base` | 같은 비율 재시도 |
| 8 | `api/image/process/base/route.ts:110` | `/api/image/generation/base` | 다음 비율 제출 |
| 9 | `api/image/process/base/route.ts:124` | `/api/image/generation/ratios` | 비율 확장 단계 개시 |
| 10 | `api/image/process/base/route.ts:217` | `/api/creative/{i}/analysis` | 비율 1개일 때 분석 직행 |
| 11 | `api/image/process/base/route.ts:222` | `/api/image/generation/ratios` | 비율 여러 개일 때 확장 |
| 12 | `api/image/process/ratios/route.ts:71` | `/api/image/generation/ratios` | 비율 재시도 |
| 13 | `api/image/process/ratios/route.ts:92` | `/api/creative/{i}/analysis` | 마지막 creative면 분석 |
| 14 | `api/image/process/ratios/route.ts:180` | `/api/creative/{i}/analysis` | 마지막 creative면 분석 |
| 15 | `webhook/replicate/image/base/route.ts:45` | `/api/image/process/base` | Replicate 콜백 → 후처리 |
| 16 | `webhook/replicate/image/ratios/route.ts:43` | `/api/image/process/ratios` | Replicate 콜백 → 후처리 |
| 17 | `webhook/replicate/persona/route.ts:35` | `/api/image/process/persona` | Replicate 콜백 → 후처리 |
| 18 | `api/webhook/dodo/route.ts:32` | `/api/dodo/process` | **결제 적립** |
| 19 | `api/webhook/fungies/route.ts:36` | `/api/fungies/process` | **대상 라우트 없음(죽은 호출)** |

### 3.2 대상 라우트 11개와 등록 상태

`client-gateway`의 `ROUTE_ENTRIES`(24개)에 **이미 등록된 것**과 **누락된 것**이 섞여 있다.

| 대상 라우트 | gateway 등록 | 비고 |
|---|---|---|
| `/api/creative/specs` | ✅ | |
| `/api/creative/{i}/prompt` | ✅ | |
| `/api/creative/{i}/analysis` | ✅ | |
| `/api/image/generation/base` | ✅ | |
| `/api/image/generation/ratios` | ✅ | |
| `/api/image/process/base` | ✅ | |
| `/api/image/process/ratios` | ✅ | |
| `/api/image/generation/persona` | ❌ | **신규 등록 필요** |
| `/api/image/process/persona` | ❌ | **신규 등록 필요** |
| `/api/dodo/process` | ❌ | **신규 등록 필요** |
| `/api/fungies/process` | ❌ | **라우트 파일 자체가 없음** (`src/app/api/fungies/` 부재) |

- 11개 라우트 전부 `getIsValidRequestS2S`(x-internal-secret)로 인증 → 세션·userId 주입 없이 내부 호출 가능.
- **fungies는 폐기된 결제사**다. 호출부만 남아 있고 대상이 없다. 이번에 **삭제 대상**으로 정리한다.

---

## 4. 파급 범위

| 영역 | 영향 | 심각도 |
|---|---|---|
| 이미지 생성 (전 단계) | **전면 불가.** 업로드까지만 되고 멈춤 | 🔴 치명 |
| 비율 확장 · 분석 | 위와 동일 (체인 중간이라 도달 불가) | 🔴 치명 |
| **결제 → 크레딧 적립** | **적립되지 않음.** 웹훅은 200을 반환하므로 Dodo는 성공으로 기록 | 🔴 치명 (금전 신뢰) |
| trial 부여 | 영향 없음 (lazy 부여, 별도 경로) | 🟢 정상 |
| 인증 · 결제창 · 상품 목록 | 영향 없음 | 🟢 정상 |
| 금전 피해 | 없음 (실패 배치는 크레딧 미차감) | 🟢 |

**핵심**: "결제창이 열린다"는 것과 "결제가 완결된다"는 것은 다르다. 현재 구조에서는 **돈을 받고 아무것도 주지 않는 상태**가 가능하다. 이 상태로 유료 트래픽을 받으면 안 된다.

---

## 5. 왜 10일간 발견되지 않았나 (재발 방지 관점 — 중요)

self-fetch는 **방아쇠**일 뿐이고, 사고를 10일간 숨긴 것은 **세 가지 구조적 결함**이다.

1. **에러를 삼킨다** — `internalFireAndForgetFetch`가 `.catch(error => console.error(...))`만 한다. Workers 로그는 기본 보존이 짧아 흔적이 남지 않는다.
2. **실패를 상태로 남기지 않는다** — 단계 실패 시 배치가 `queued`에 그대로 머문다. "실패"와 "진행 중"이 구분되지 않는다.
3. **감시가 없다** — `queued` 상태로 장기 정체한 배치를 감지하는 장치(Cron·알림)가 없다.

→ **큐로 바꿔도 1·2·3을 같이 고치지 않으면 같은 방식으로 조용히 죽는다.** 이 보고서의 수정 범위에 반드시 포함한다.

---

## 6. 수정 설계

### 6.1 Phase 1 — in-process 디스패치 (즉시, 위험 낮음)

**목표**: 운영에서 생성·적립이 실제로 동작하게 만든다.

**변경 파일 2개 (+ 라우트 표)**

| 파일 | 작업 |
|---|---|
| `src/lib/internalDispatch.ts` (신설) | 경로+쿼리+본문을 받아 **핸들러 함수를 직접 호출**. `client-gateway`와 동일 패턴. 매칭 실패는 loudly 실패(throw + 로그) |
| `src/lib/utils/internalFetch.ts` (수정) | URL 호스트가 `BASE_URL`과 같으면 → 디스패처로 위임. 다르면 기존 `fetch` 유지. **시그니처 불변 → 호출부 19곳 무수정** |
| `ROUTE_ENTRIES` (확장) | 위 3.2의 누락 3개 추가 (`generation/persona`·`process/persona`·`dodo/process`) |

**동작 방식**

```
internalFireAndForgetFetch(`${BASE_URL}/api/creative/specs?batchId=…`, {method:'POST'}, body)
        ↓ 호스트 일치 판정
dispatchInternal('/api/creative/specs?batchId=…', {method:'POST', body})
        ↓ 표에서 매칭 (lazy import)
new NextRequest('http://internal/…', {method, headers:{x-internal-secret}, body})
        ↓
핸들러 함수 직접 호출 (네트워크 없음)
```

**같이 고치는 것 (필수)**

- 실패 시 **DB에 실패 기록**: 단계별 `code`·`message`를 남기고 최종 실패는 배치 `status='failed'`로 전이
- `fungies` 죽은 호출 삭제 (라우트 부재)
- `console.error`만 남기던 자리에 **배치 단위 에러 로그 1줄**(batchId 포함) 유지

**한계 (정직하게)**

- `ctx.waitUntil`은 **응답 후 최대 30초**까지만 실행을 보장한다. 체인이 30초를 넘으면 잘릴 수 있다.
- in-process는 **재시도가 없다.** 한 단계가 실패하면 그 배치만 실패하고 끝난다(기존과 동일).
- 여러 creative가 동시에 실행되어 메모리·CPU 사용이 늘어난다(4개 팬아웃 시).

즉 Phase 1은 **"동작하게 만드는 응급처치"**이며, 정석은 Phase 2다.

### 6.2 Phase 2 — Cloudflare Queues (정석)

**목표**: 단계 넘기기를 큐로 교체. 재시도·DLQ·시간 제약 해소.

**메시지 스키마 (안)**

```ts
type PipelineMessage = {
    batchId: string;
    creativeIndex?: number;
    step: 'specs' | 'prompt' | 'generation' | 'ratios' | 'analysis' | 'persona';
    attempt: number;
};
```

**설계 규칙**

- HTTP 라우트는 "큐에 넣는 얇은 입구"로 축소 (핸들러 로직은 컨슈머가 재사용)
- **idempotency**: 각 단계는 DB의 현재 `status`가 기대값일 때만 진행 (`UPDATE … WHERE status = 'expected'`)
- **재시도**: 큐 자동 + backoff, 최종 실패는 **DLQ**
- **DLQ 감시**: DLQ 적재 시 알림(이메일/웹훅). "10일째 queued" 같은 상태를 Cron으로 감지
- **비용**: 100만 메시지당 $0.40 수준 → 우리 물량은 사실상 0원

**replay 규칙 (Phase 2 필수 — 10-30 개념 정리에서 도출)**

durable 실행의 "잠들었다 깨기"는 **프로세스가 살아 있는 게 아니라, 처음부터 재실행하며 완료된 단계의 결과를 재사용**하는 것이다(isolate는 죽는다). 따라서:

| 금지 | 이유 |
|---|---|
| step 밖에서 API 호출·R2 업로드·DB 쓰기 | 재실행 때 **중복 실행** (중복 과금·중복 생성) |
| step 밖에서 `Math.random()`·`Date.now()`·환경 의존 분기 | 재실행마다 값이 달라져 **분기가 어긋남** |
| step 사이 지역변수에만 의존 | 재실행 시 재계산됨 |

→ **부수효과는 전부 step 안에.** 우리 파이프라인은 LLM 호출·Replicate 제출·R2 업로드가 전부 부수효과이므로, 이 규칙을 어기면 재시도가 곧 중복 제출이 된다.

**외부 콜백은 그대로 둔다**

Replicate → 우리 웹훅은 **진짜 외부 요청**이라 self-fetch 문제가 없다. 지금 구조 유지가 맞다. (통합하고 싶으면 Workflows의 이벤트 대기가 있으나, 지금 도입할 이유는 없다.)

### 6.3 검토했지만 **지금은 채택하지 않는** 것

| 대안 | 채택하지 않는 이유 |
|---|---|
| **Service Binding** | 같은 zone 제약은 해결되지만 `wrangler` 설정 + 여전히 30초 제약. in-process로 충분 |
| **Workflows** | 다단계·이벤트 대기에 가장 적합하나 도입 비용이 크다. 큐 안정화 후 재검토 |
| **호스팅 이전 (Vercel/Fly)** | 버그 1개 때문에 이사하는 비용. 30초·유실 문제는 플랫폼을 바꿔도 남는다 |
| **상대 경로 `/foo` 호출** | `fetch`는 절대 URL만 받음(실측 `TypeError: Failed to parse URL`). 우회 불가 |

---

## 7. 검증 계획

### 7.1 dev 검증 (Phase 1 적용 후)

- [ ] 배치 1개 생성: creative 1 · 비율 1:1 단일 → `specs` 채워짐 → `prompt` → Replicate 제출 확인
- [ ] creative 4 · 비율 1:1+4:5 → 팬아웃·비율 확장·analysis까지 완주
- [ ] 인물(persona) 경로 1회
- [ ] 실패 유도(잘못된 입력) → 배치가 `failed`로 전이하고 사유가 남는지

### 7.2 prod 스모크 (배포 후)

- [ ] trial 계정으로 1장 생성 완주 (`queued` → `completed`)
- [ ] Replicate 예측에 **신규 건**이 찍히는지 (10-09 이후 0건이 깨져야 정상)
- [ ] 실패 시 `status='failed'` + 사유 기록 확인

### 7.3 결제 적립 (별건)

- [ ] Starter 실결제 1건 → `/api/dodo/process` 실행 → `subscription_grants` 유료 1건 + 100장
- [ ] `usage_ledger` 차감 0 확인
- [ ] 환불 처리 확인

> Dodo live `/checkouts` 401이 별도로 남아 있다(Products API는 정상). 이건 **결제창 진입** 문제이고, 이 보고서의 self-fetch는 **결제 후 적립** 문제다. **둘 다 해결돼야 결제 E2E가 성립**한다.

---

## 8. 작업 순서 · 예상 소요

| 순서 | 작업 | 소요 | 배포 단위 |
|---|---|---|---|
| 1 | Phase 1 (디스패처 + 헬퍼 + 표 3줄 + 실패 기록 + fungies 삭제) | 2~3시간 | develop → master |
| 2 | dev 검증 (§7.1) | 1시간 | — |
| 3 | prod 스모크 (§7.2) | 30분 | — |
| 4 | **여기서 사진 3장 생성 재개 가능** | — | — |
| 5 | Phase 2 Queues 설계·구현 | 1일 | develop → master |
| 6 | DLQ·Cron 감시 | 반나절 | develop |

**Phase 1만으로 사진 3장과 결제 적립은 살아난다.** Phase 2는 그 뒤 안정화 작업이다.

---

## 9. 전후 비교

| 항목 | 현재 | Phase 1 후 | Phase 2 후 |
|---|---|---|---|
| prod 생성 | ❌ 불가 | ✅ 가능 (30초 내) | ✅ 가능 (제한 없음) |
| 결제 적립 | ❌ 불가 | ✅ 가능 | ✅ 가능 |
| 단계 실패 추적 | ❌ 흔적 없음 | ⚠️ DB 기록(재시도 없음) | ✅ 재시도 + DLQ |
| 30초 초과 체인 | — | ⚠️ 잘릴 수 있음 | ✅ 안전 |
| 장기 정체 감지 | ❌ 없음 | ⚠️ 부분 | ✅ Cron 감시 |

---

## 10. 주의사항 / 하지 말 것

- **이 보고서는 조사 결과다.** 실행은 승인 후 별도 세션에서 한다.
- Phase 1과 Phase 2를 **한 커밋에 섞지 않는다.** 문제 발생 시 원인 분리가 안 된다.
- `internalFireAndForgetFetch`의 **시그니처를 바꾸지 않는다.** 바꾸면 19곳을 동시에 건드려야 하고, 회귀 위험이 커진다.
- **dev에서만 검증하고 끝내지 않는다.** 이번 사고의 교훈이 정확히 그것이다(dev는 터널이라 구조가 다르다).
- 큐 도입 시 **idempotency 없이 배포하지 않는다.** 재시도가 곧 중복 제출이다.
- 이 작업 전에는 **PH 런치·유료 집행·시딩 발송을 하지 않는다.** 받을 수 없는 약속을 하는 셈이다.
