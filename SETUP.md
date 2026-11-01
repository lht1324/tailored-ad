# 신규 스택 셋업 (Vite + Hono) — 2026-10-31

> 이 폴더는 `tailored-ad` 저장소의 **`vite-hono` 브랜치** 워크트리입니다.
> 완성되면 이 구조가 `tailored-ad` 폴더의 본체가 되고, 현재 Next 앱은 `pre-vite` 태그로 보존됩니다.

## 스택

| | |
|---|---|
| 클라 | React 19 + Vite 8 (SPA) |
| 서버 | **Hono 4** (Cloudflare Worker) |
| 로컬 실행 | `@cloudflare/vite-plugin` → 워커가 **로컬 workerd**에서 실행 (prod와 동일 제약) |
| 배포 | `vite build` → `wrangler deploy` (워커 이름 `tailored-ad` 그대로) |

## 사장님이 실행할 것 (제가 못 하는 부분)

```bash
cd ~/Projects/tailored-ad-vite
npm install
npm run dev
```

`npm run dev` → 안내되는 주소(보통 http://localhost:5173)를 열면:

- 제목: **TailoredAd — Vite + Hono 스캐폴드**
- `GET /api/health` 칸에 JSON이 떠야 정상
  ```json
  {"success":true,"status":200,"data":{"service":"tailored-ad-api","runtime":"workers", ...}}
  ```

이게 뜨면 **클라(Vite) + 워커(Hono, workerd)가 같은 오리진으로 연결된 것**입니다.

## 이 구조에서 사라진 것

| Next에서 필요했던 것 | 지금 |
|---|---|
| dev 서버 2개 (클라 3002 / 서버 3003) | **`npm run dev` 하나** |
| `distDir` 3분할 (`.next` / `.next-dev` / `.next-docker`) | 출력 `dist/` 하나 |
| CORS 설정 | 같은 오리진 |
| "로컬은 되는데 prod만 죽는" 버그 | workerd가 로컬에서도 **same-zone fetch를 막음** |
| OpenNext 어댑터·증분 캐시 우회·custom worker | 없음 (Vite 플러그인이 처리) |

## 다음 단계 (포팅 순서)

1. `src/lib/**` 이전 (도메인 로직·DB·API 클라이언트) — `next/*` 의존만 걷어내면 대부분 그대로
2. `worker/` 에 라우트 포팅 (기존 `src/app/api/**/route.ts` 34개 → Hono `app.route()`)
3. 화면 이전: `components/**` → React Router 기반 라우팅
4. 블로그·약관 **정적 프리렌더** (SPA fallback이면 SEO가 죽으므로 필수)
5. Neon Auth를 `@neondatabase/auth/vanilla` 어댑터로 교체
6. 파이프라인 재배선 (W2·W3) — `src/lib/pipeline/steps/*`는 그대로 재사용

## 주의

- **`BASE_URL`은 외부 콜백 주소로만** 쓴다 (Replicate 웹훅 등). 내부 호출은 함수 직접 호출.
- 워커 이름을 바꾸면 **다른 워커로 배포**되어 도메인·Secrets가 따라오지 않는다. `tailored-ad` 유지.
- `cloudflare-env.d.ts`는 `npm run cf-typegen`으로 생성(현재 0.1.0에선 아직 없음).

## 포트 규칙 (프로젝트 공통)

**포트는 기술이 아니라 프로젝트를 가리킨다.** 짝수 = 기본(단일 서버), 홀수 = 예비(두 번째 프로세스).

| 프로젝트 | 기본 | 예비 |
|---|---|---|
| ShortReal | 3000 | 3001 |
| **TailoredAd (이 프로젝트)** | **3002** | 3003 |
| LocalAgentsLink | 3004 | 3005 |
| jaeholee.xyz | 3006 | 3007 |

- **Vite + Hono**: 짝수 포트만 쓴다 (클라·API가 같은 오리진·같은 프로세스)
- **Next.js**: 짝수(클라) + 홀수(서버) 쌍으로 쓴다
- 프로젝트를 Vite + Hono로 옮기면 홀수 포트가 자동으로 비워진다 (**번호 재배치 불필요**)
- `strictPort: true` — 포트가 점유돼 있으면 조용히 옆 번호로 넘어가지 않고 **실패**한다

## 타입체크 구조 (2개 프로그램)

| | 대상 | lib | types |
|---|---|---|---|
| `tsconfig.json` | 클라 (`src`, `vite.config.ts`) | ES2022 + DOM | `vite/client` |
| `tsconfig.worker.json` | 서버 (`worker`, `src/lib`, `src/workflows`, `src/types`) | ES2022 + DOM | `node` |

- `src/lib`은 **워커 프로그램에만** 속한다 (`tsconfig.json`에서 `exclude`). 서버 코드를 클라 타입으로 검사하면 `process`/`Buffer`가 없는 것처럼 보인다.
- **`@cloudflare/workers-types`는 쓰지 않는다.** 실측: 위 구성만으로 `src/lib` 63파일이 통과했다. Cloudflare 전용 전역(`Workflow`, `WorkflowEntrypoint` 등)은 `src/types/*.d.ts`에 **수기 선언**한다.
  - 이유: `wrangler types --include-runtime true`는 런타임 전역을 덮어써 기존 코드를 대량으로 깨뜨린다(구 프로젝트에서 84곳 실측).
- `process`/`Buffer`는 Workers에서 `nodejs_compat` 플래그로 실제 제공되므로 `@types/node`로 타입만 맞춘다.

## 디렉터리 구조 — 진영 분리 (10-31 2단계)

```
src/          클라 (브라우저)        @/...        React · React Router · API 클라이언트
worker/       서버 (Cloudflare)     @worker/...  Hono · 라우트 · 파이프라인 step · DB · R2
shared/       양쪽 공용             @shared/...  타입 · 순수 상수 · 순수 함수
```

**규칙**

| | |
|---|---|
| `src/` | `worker/`를 import할 수 없다 (타입 에러) |
| `worker/` | `src/`를 import할 수 없다 (타입 에러) |
| `shared/` | **부수효과 없음** — 네트워크·DB·`env` 접근 금지. 타입·상수·순수 함수만 |
| 비밀·`env` 접근 | `@worker/`에서만 |

강제 방법은 tsconfig의 `include` 분리다. 클라 프로그램은 `src`+`shared`, 워커 프로그램은 `worker`+`shared`만 본다. 그래서 경계를 넘는 import는 **컴파일 단계에서** 걸린다.

**왜 `shared/`가 필요한가**: 폰트 목록·가격표·색 계산은 에디터(클라)와 프롬프트 생성(서버)이 같이 쓴다. 2분할로는 안 되고 3분할이어야 한다.

## `@neondatabase/auth-ui`를 쓰지 않는 이유 (기록)

패키지는 이미 설치돼 있다(`@neondatabase/auth`의 전이 의존). `@neondatabase/auth/react`가 `AuthView`·`SignInForm`을 re-export하므로 기술적으로는 지금도 쓸 수 있다. 그런데도 직접 만든 화면을 쓰는 이유:

1. **원래부터 커스텀이었다** — Next 시절부터 `SignInPageClient`/`AuthForm`을 직접 만들었다 (구 프로젝트에 `auth-ui` 참조 0건). Vite 이관 때문에 바뀐 게 아니다.
2. **브랜딩** — auth-ui는 자체 디자인 시스템을 끌고 온다.
3. **버전 불일치** — `auth-ui@0.4`는 `auth@0.6`을 peer로 요구한다. 우리는 0.7이라 npm이 0.6을 **중첩 설치**했다. auth-ui 컴포넌트를 쓰면 0.6 인스턴스가 섞여 세션 상태가 갈릴 수 있다.

같은 내용이 `src/lib/auth/client.ts` 주석에도 있다. 나중에 "왜 안 썼지?"가 또 나오면 여기를 보면 된다.
