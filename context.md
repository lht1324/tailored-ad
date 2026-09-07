# TailorAd — 작업 기록 (Last Updated: 2026-09-07)

> short_real의 `/ad`(AI 스틸 광고)를 독립 앱·독립 브랜드로 분리한 프로젝트.
> 포트폴리오(jaeholee.xyz) 관련 내용은 제외.

## 1. 개요

- **브랜드**: TailorAd — "Tailored ads, not templates" (Harnessed AI ad studio)
- **도메인**: `tailoredad.com` 구매됨. DNS 연결은 실생성 이미지 준비될 때까지 홀딩.
- **짝꿍 도메인**: `tailorad.com` 미구매. 살 때 같이 사서 리다이렉트 예정.
- **스택**: Next.js 16 + Tailwind v4 + Supabase + Replicate/OpenRouter, Cloudflare Workers 배포(OpenNext)
- **Git**: Git Flow (`master` 프로덕션 / `develop` 작업). 로컬 작업 브랜치 `develop`.
- **포트**: 클라 `3000` (`npm run dev`) / 서버 `3001` (`docker compose up`, 컨테이너 `3000` 매핑). short_real과 동일.

## 2. 분리 인벤토리 (short_real → 이 레포)

- `app/ad/*` 5개 → 루트로 이동 (`/`, `/create`, `/projects`, `/sign-in`, `/legal/*`, `/callback/auth`)
- `app/api/ad/*` → `app/api/*` (`/ad` prefix 제거: tasks, image, creative, ad-generation-batches)
- `app/webhook/ad/*` → `app/webhook/*` (Replicate 콜백 리시버. 빼먹었다가 후추가 — 생성 플로우 필수)
- `components/page/ad/**` 29개 + `components/page/sign-in`, `components/page/legal`
- `components/public` 중 GoogleIcon, GoogleSignInButton, DefaultSignInButton만
- `lib`: `api/client/ad`, `api/client/baseFetch*`, `api/client/usersClientAPI`,
  `api/types/supabase/ad`, `api/types/supabase/Users.ts`(포크, 아래 참조),
  `api/types/api/BaseResponse.ts`, `api/server/ad`, `api/server/usersServerAPI.ts`,
  `supabase/*`, `utils/{getIsValidRequest,getNextBaseResponse,internalFetch,jsonUtils}`,
  `llm-prompts/ad`, `OpenRouterClient.ts`, `FontFamilyList.ts`, `ReplicateClient.ts`, `fonts.ts`
- `context/AuthContext.tsx`, `proxy.ts`, 전역 레이아웃/globals

## 3. 분리 시 적용한 변경

1. **Cloudflare 어댑터**: `internalFetch.ts`의 `@vercel/functions` waitUntil →
   `getCloudflareContext().ctx.waitUntil` + 로컬 폴백. `wrangler.jsonc` + `open-next.config.ts` 추가.
2. **next/font 전면 제거** (Cloudflare 빌드 불가: esbuild woff2 로더 없음, upstream 미해결):
   `lib/fonts.ts` 300줄 → 이름→CSS스택 매핑 60줄. 폰트 34종+Rajdhani+Geist Mono는
   globals.css CSS import 한 줄로. 화면 동일.
3. **Users 타입 포크**: `VideoGenerationTasks`가 워크스페이스 에디터를 물고 들어와서 절단.
   `preferred_ai_model_config`는 로컬 `AdModelConfig`로 대체 (ad 트리에서 미사용 확인).
4. **URL 정리**: 페이지·API·웹훅의 `/ad` prefix 전부 제거. 구경로는 404.
5. **리브랜드**: 메타·헤더·푸터·지원메일(`support@tailoredad.com`)·다운로드명·LLM 프롬프트까지
   ShortReal 잔재 제거. OG 이미지는 shortreal.ai URL 그대로 (own 버킷으로 이전 예정).
6. **린트 전멸**: 복사해온 코드의 에러 18개 수정 (진짜 버그 1개 포함: PortfolioSection hooks).
7. **약관**: ShortReal 문서를 복사 후 브랜드명·URL·지원메일만 교체. **실체 조항 미검토**
   (특히 한국 금지 조항 — 유지 여부 결정 필요, 아래 체크리스트).

## 4. 결정 사항

- **Supabase**: 신규가 아니라 ShortReal 프로젝트 공유 (비용). 테이블은 `ad_generation_batches` 전용,
  버킷은 `ad_image_storage` 전용으로 이미 분리됨. `users` 공유 = 로그인 통합 (크로스셀 보너스).
- **결제(Polar)**: ad 코드에 과금 wiring 없음. 런칭 전 붙여야 함 (블로커).
- **데모 이미지**: short_real preview 9종 복사했다가 전량 삭제. 도그푸딩(실생성물)으로 채울 예정.
- **shortreal.ai/ad**: 런칭 당일 301 → tailoredad.com 후 은퇴.

## 5. 런칭 체크리스트

- [ ] 실생성 이미지 6~8장 → 랜딩 PortfolioSection에 박기 (스테이징에서 생성 → 버킷에서 회수)
- [ ] `support@tailoredad.com` (+`contact@`) Email Routing (tailoredad.com 도메인에서 별도 설정)
- [ ] Polar 과금 연결 (블로커)
- [ ] 약관 실체 검토 (한국 조항 유지 여부 포함)
- [ ] `tailorad.com` 구매 + 리다이렉트
- [ ] `shortreal.ai/ad` → 301 (런칭 당일)
- [ ] `tailoredad.com` DNS 연결 (이미지 준비되면)
- [ ] Search Console 등록 (런칭 후)

## 6. 명령어

```bash
npm run dev      # 3000 (클라)
docker compose up --build  # 3001 (서버, 컨테이너 3000 매핑)
npm run build
npm run lint
npm run deploy   # opennext build + deploy (master에서)
```

## 7. 대시보드 작업 메모

- Cloudflare Variables/Secrets: `NEXT_PUBLIC_*` 3개는 Variable, 나머지 전부 Secret
  (`SUPABASE_SERVICE_ROLE_KEY`, `REPLICATE_API_TOKEN`, `OPENROUTER_API_KEY` 등).
  `BASE_URL`/`NEXT_PUBLIC_BASE_URL`은 prod 값(`https://tailoredad.com`)으로.
- `NEXT_PUBLIC_*`은 빌드타임에 박히므로 변수 변경 후 리빌드 필수.
- Supabase Redirect URLs에 workers.dev + 실도메인 등록 (구글 로그인용).
