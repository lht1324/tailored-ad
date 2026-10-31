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
