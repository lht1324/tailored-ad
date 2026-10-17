# TailoredAd — 메모리·비효율 최적화 계획서

> 2026-10-17/18 전수 조사 결과 (사장님 승인 대기, 미착수).
> 스캔 범위: `src` 전체 — `'use client'` 43개 파일, API 라우트 30개, lib 전체.
> 낭비 규모: 대 / 중 / 소, 난이도: 쉬움 / 보통 / 큰 작업.
> **이미 정상으로 확인된 것 (재조사 불필요)**: DB 싱글톤 재생성 없음 · 게이트웨이 lazy 로드 작동 중 ·
> SSE 훅 cleanup 정상 · setInterval 누수 없음 · key=index 남용 없음 · 에디터 Remotion dynamic import済 ·
> 랜딩에 무거운 라이브러리 끌려들지 않음 · lucide named import (트리쉐이킹 정상).

## 우선순위 총괄표

| 순위 | 항목 | 위치 | 낭비 | 난이도 | 소요 |
|---|---|---|---|---|---|
| 1 | 다운로드 라이브러리(jszip+html-to-image) 동적 로드 | `compositeDownload.tsx:5-6` + importer 6곳 | 대 | 쉬움 | 반나절 |
| 2 | 죽은 import가 AWS SDK(4.4MB)를 /projects에 끌어들임 | `ad-generation-batches/route.ts:5` | 대 | **5분** | 5분 |
| 3 | 이미지 프록시 세션/소유 쿼리 캐시·얇은 select | `projects/[projectId]/image/route.ts` | 대 | 보통 | 1일 |
| 4 | 목록 API 얇은 프로젝션 (design·specs 제거) | `adGenerationBatchServerAPI.ts:75-92` | 대 | 보통 | 반나절 |
| 5 | 게이트웨이 본문 스트리밍 통과 (4중 복사 제거) | `client-gateway/route.ts:163` | 대 | 보통 | 반나절 |
| 6 | 상세 presign 다운로드 시점 lazy화 | `ad-generation-batches/[batchId]/route.ts:40-56` | 대 | 보통 | 반나절 |
| 7 | 생성 결과물 썸네일 파이프라인 (원본 PNG 직표시 해소) | `projectImageUrl.ts` + process 라우트 | 대 | 큰 작업 | 2~3일 |
| 8 | SSE 멀티플렉스 + MAX_TICKS 연장 | `AuthContext.tsx:111` / `events/route.ts:20-21` | 중~대 | 보통 | 반나절 |
| 9 | 에디터 canvas memo 복구 | `EditorPageClient.tsx:408-420` | 중 | 쉬움 | 1시간 |
| 10 | 에디터 폰트 CSS 필요 페이지로 이동 | `layout.tsx:47-52` | 중 | 보통 | 반나절 |
| 11 | analysis base64 스파이크 완화 | `analysis/route.ts:142-145` | 중 | 보통 | 반나절 |
| 12 | objectURL revoke + 프리뷰 소형화 | `UploadZone.tsx:44` / `CreatePageClient.tsx:61` | 소 | 쉬움 | 30분 |
| 13 | memo 파괴 잔여 3건 + events inArray + 전체행 select 축소 | 각 항목 참조 | 소 | 쉬움 | 합계 1시간 |

---

## 1. 클라이언트 번들 낭비

### 🔴 1-1. jszip + html-to-image가 다운로드 클릭 전에 항상 로드됨 — 대 / 쉬움
`src/components/page/ad/projects/[projectId]/components/compositeDownload.tsx:5-6` 정적 import (`toBlob`, `JSZip`).
이 파일을 정적으로 import 하는 곳이 6곳: `ProjectDetailPageClient.tsx:13`(페이지 루트!), `CreativeRow.tsx:6`,
`FormatTile.tsx:7`, `AdLightboxModal.tsx:8`, `EditorPageClient.tsx:14-15`, `EditorCanvas.tsx:6`.
jszip 1.1MB + html-to-image 0.5MB(minified)가 **상세·에디터 진입만으로 무조건 다운로드·파싱**.
다운로드는 클릭 시에만 쓰는데 항상 로드됨. `EditorCanvas`를 dynamic import 해둔 노력이
compositeDownload 정적 import 때문에 반쯤 무력화된 상태.

**수정안**: (1) `COMPOSITE_SIZES`·`buildDownloadFileName`·타입만 별도 상수 파일로 분리
(EditorCanvas/EditorPageClient는 상수만 import), (2) 다운로드 함수들은 각 `onClick~` 핸들러 안에서
`await import('@/.../compositeDownload')` 동적 로드.

### 🔴 1-2. 죽은 import로 AWS SDK가 /projects 목록에 끌려들어옴 — 대 / 쉬움 (5분)
`src/app/api/ad-generation-batches/route.ts:5` — `adImageServerAPI` import 후 본문에서 사용 0건 (grep 확인).
이 import가 `imageServerAPI → r2.ts → @aws-sdk/client-s3`(4.4MB 패키지)를 목록 조회 콜드 패스에
통째로 로드. `/projects` 첫 로드가 가장 더운 경로.

**수정안**: import 한 줄 삭제. 추가로 `src/lib/r2.ts:1-8`의 SDK를 `getR2()` 내부 `await import()`로
미루면 presign 안 쓰는 라우트까지 SDK 로드에서 벗어남.

### 🟡 1-3. 에디터 canvas memo가 인라인 props로 무력화 — 중 / 쉬움
`src/components/page/ad/projects/[projectId]/edit/EditorPageClient.tsx:408-420`:
- `input={canvasInput ?? {...}}` — fallback 객체 리터럴이 렌더마다 새 identity → `memo(EditorCanvas)` 깨짐
- `onSelectHeadline={() => ...}`, `onSelectCta={() => ...}` (419-420) — 인라인 화살표 → memo 깨짐
- `EditorCanvas.tsx:23`에서 `inputProps={{...input, ...}}` 스프레드로 또 새 객체 → Remotion Player가
  매 렌더마다 새 inputProps 수신. **드래그 중(60fps setState)마다 Player 서브트리 재평가**.

**수정안**: fallback 객체 useMemo, 두 셀렉트 콜백 useCallback.

### 🟡 1-4. 34개 폰트 패밀리 CSS가 전 페이지 글로벌 로드 — 중 / 보통
`src/app/layout.tsx:47-52` — Anton~Work Sans 34개 패밀리·전 웨이트·이탤릭을 한 Google Fonts CSS로 전역 `<link>`.
에디터 헤드라인(`lib/fonts.ts` fontMap)에서만 필요하고 랜딩은 Satoshi(fontshare)만 씀.
CSS는 캐시되지만 파싱 비용 + 에디터 미사용 페이지의 FOUT 체크(`AdOverlay.tsx:68-82`의
`document.fonts.load`)가 전 페이지 폰트 스택에 노출.

**수정안**: 에디터 폰트 CSS를 detail/editor 세그먼트 layout으로 하향, 또는 `document.fonts.load` 시점에만 로드.

### 🟢 1-5. object URL 누수 — 소 / 쉬움
- `create/components/UploadZone.tsx:44-56` — 교체·삭제 시 `URL.revokeObjectURL` 없음.
  10MB 파일 블롭이 페이지 생존 내내 유지.
- `create/CreatePageClient.tsx:61,82,104` — 공식 로고 재적용할 때마다 새 objectURL 생성 (기존 revoke 없음).

### 🟢 1-6. 프리뷰에 원본 파일 전체 디코드 — 소~중 / 보통
`create/components/PreviewCanvas.tsx:49-52,73,82` + UploadZone 썸네일이 `previewUrl`(원본 File objectURL,
최대 10MB·수천만 픽셀)을 그대로 `<img>`에 전달. 브라우저 디코드 비트맵 수십~수백MB 가능.
**수정안**: `lib/imageResize.ts` downscale을 프리뷰용 소형 blob 생성에 재활용 (전송용 축소는 완료된 건 —
재보고 아님, 프리뷰 경로만 미흡).

---

## 2. 서버(Workers) 메모리·CPU

### 🔴 2-1. 게이트웨이가 요청 본문 전체를 버퍼+복사 — 대 / 보통
`src/app/api/client-gateway/route.ts:163` — `body: hasBody ? await request.arrayBuffer() : undefined`.
multipart 생성 요청(상품 10MB + 로고 10MB)에서 (1) 원본 스트림, (2) arrayBuffer 복사본,
(3) `new NextRequest` 재조립, (4) 하류 `request.formData()` 파싱본 — **최대 4중 복사로
Workers 128MB 힙의 상당분 스파이크**. 업로드 경로가 유일한 대용량 경로인데 정확히 그 경로가 버퍼링됨.

**수정안**: `body: request.body` + `duplex: 'half'` 스트림 통과. GET 외 일괄 적용 가능.

### 🔴 2-2. 이미지 프록시 — 이미지 1장당 세션 2~3쿼리 + presign — 대 / 보통
`src/app/projects/[projectId]/image/route.ts` (force-dynamic):
- 요청마다 `getIsValidRequestC2S()` → Better Auth getSession + `getUserByEmail` DB 쿼리 (`getIsValidRequest.ts:6-34`)
- 배치 소유 확인용 전체 행 select (`:48`, JSONB 전체 파싱)
- presign (`:61`) — 이미지 1장당 HMAC 서명 1회

50타일 프로젝트 = **쿼리 150회 + presign 50회** 동시 폭발. Workers CPU 직격.
`Cache-Control: private, max-age=3600`이 있어 재방문은 흡수되지만 첫 로드가 문제.

**수정안**: (1) isolate 레벨 30~60초 유저 캐시 (email → user 행), (2) 배치는 `id+user_id` 얇은 select,
(3) 장기: 이미지 응답을 R2 직접 서빙(서명 URL 리다이렉트) 전환.

### 🔴 2-3. 상세 fetch마다 이미지 전량 presign (최대 50장 순차) — 대 / 보통
`src/app/api/ad-generation-batches/[batchId]/route.ts:40-56` — 모든 creative×ratio의 24시간 서명 URL을
**매 요청 순차 발급**. 문제: (a) 표시는 pretty URL(`/projects/[id]/image`)을 쓰므로 signedUrls는
다운로드 클릭 때만 필요한데 항상 발급, (b) 러닝 중엔 SSE 이벤트(파이프라인 쓰기마다 1건)마다
`fetchProject()` → **이벤트 1건당 presign 폭풍 재실행**, (c) 배치 끝까지 결과 JSONB 전체 매번 파싱.

**수정안**: signedUrls 발급을 다운로드 시점 lazy로 (예: `/api/ad-generation-batches/[batchId]/signed-url?c=&r=`
단건 엔드포인트 또는 다운로드 전용 프록시).

### 🔴 2-4. 프로젝트 목록이 specs+design JSONB 통째로 내려줌 — 대 / 보통
`src/lib/api/server/ad/adGenerationBatchServerAPI.ts:75-92` — `listAdGenerationBatchesByUserId`가
`select()` 전칼럼 (ad_creative_specs 전체 + ad_creative_results 전체, design 레이아웃 JSON 포함) × 20행.
클라는 `ProjectCard`에서 `getProjectProgress`(imageResults의 score/ext/error만 사용,
`adProjectClientAPI.ts:150-177`)와 메타필드만 씀. **design JSON이 응답 대부분** →
Neon 전송량·Workers JSON 파싱·직렬화·클라 파싱 4중 낭비. 20개 배치면 수백 KB~수 MB.

**수정안**: 목록용 얇은 프로젝션 (imageResults에서 design 제거, ad_creative_specs 제외 —
CreativeRow의 `spec.camera` 표시는 상세 전용이라 목록엔 불필요).

### 🟡 2-5. SSE 홀드 상시화 — 로그인 탭마다 무한 반복 — 중~대 / 보통
`src/app/api/events/route.ts:20-21` — TICK 1.5초 × MAX_TICKS 20 = 30초마다 커넥션 종료 → 클라 재연결.
`AuthContext.tsx:111-118`가 **모든 로그인 페이지에서 유저 스트림 SSE 항상 구독**(랜딩 포함) +
상세/에디터/목록 페이지가 각각 추가 구독 → **탭 1개에 SSE 1~2개 24시간 상시**.
서버는 1.5초마다 스트림당 Upstash XRANGE 1회 (유휴 유저도 분당 ~40회 REST 호출),
재연결마다 세션+유저 DB 쿼리 2~3회.

**수정안**: (1) AuthContext 스트림+페이지 스트림 단일 멀티플렉스 EventSource 통합,
(2) MAX_TICKS 연장(예: 120 = 3분)으로 재연결 오버헤드 축소, (3) 재연결 시 재인증 생략(커서 기반).

### 🟡 2-6. analysis 라우트 base64 다량 동시 보관 — 중 / 보통
`src/app/api/creative/[creative-index]/analysis/route.ts:142-145,178-179` — 비율당
fetch→arrayBuffer→Buffer→base64를 **5비율분 배열에 동시 보유** 후 LLM 요청 조립.
이미지당 ~2MB라면 buffer+base64(+문자열) 합산 15~30MB 스파이크. OpenRouterClient가
data URI를 또 문자열로 조립(`lib/OpenRouterClient.ts:75-80`) — 실제론 그 이상.

**수정안**: 조립 직후 원본 buffer 참조 끊기, 가능하면 이미지를 URL로 전달(모델이 fetch 가능한 경우) 검토.

### 🟢 2-7. process 라우트 이미지 2중 보관 — 소~중 / 쉬움
`app/api/image/process/{base,persona,ratios}/route.ts:169-170` (및 각각 동일 패턴) —
`arrayBuffer` + `Buffer.from()` 뷰/복사본 동시 보유 후 R2 업로드. 스트리밍 불가(S3 SDK가 buffer 요구)라
구조적이지만, `Buffer.from` 후 원본 ArrayBuffer 참조 즉시 해제하도록 순서 정리 가능.

### 🟢 2-8. 파이프라인 단계들이 전체 행을 반복 파싱 — 소 / 쉬움
`app/api/image/generation/base|ratios|persona/route.ts`, `process/base/route.ts:98,151` 등 —
user_id·aspect_ratios·확장자만 필요한 곳에서 `getAdGenerationBatchById` 전체 select(JSONB 전체).
웹훅 1건마다 배치 끝 규모의 JSON 재파싱. **수정안**: 얇은 select 함수 추가.

### 🟢 2-9. SSE 배치 소유확인 순차 쿼리 — 소 / 쉬움
`src/app/api/events/route.ts:34-40` — batchId당 개별 `await` 루프.
`inArray(adGenerationBatches.id, ids)` 1쿼리로 축소. (목록 페이지 SSE는 batchId 없어 실질 영향 상세만.)

---

## 3. React 렌더 낭비

### 🟢 3-1. CreativeRow→FormatTile memo 파괴 — 소~중 / 쉬움
`src/components/page/ad/projects/[projectId]/components/CreativeRow.tsx:260` —
`onExpand={() => onExpandTile?.(tileKey)}` 인라인. fetch/refresh 때마다 50개 FormatTile 전부 재렌더.
**수정안**: `(key) => onExpandTile(key)` 시그니처로 타일에 tileKey를 props로 주고 콜백 안정화.

### 🟢 3-2. 인라인 배열/함수로 memo 깨지는 나머지 — 소 / 쉬움
- `ProjectDetailPageClient.tsx:438-455` — DownloadMenuButton `items={[...]}` 인라인 배열
- `ProjectsPageClient.tsx:252-253` — ProjectCard `onClick={() => ...}`, `onEdit={() => ...}` 인라인
- `ProjectCard.tsx:57-60` — onClickEditButton useCallback 미적용

### 🟢 3-3. AppHeader가 네비게이션마다 usage 3쿼리 — 소 / 보통
`AppHeader.tsx:22-38` — 헤더가 페이지별 리마운트 → 페이지 이동마다
`/api/user/[userId]`(getUserByUserId + sumGrantedAllTime + countImagesAllTime = 3쿼리).
**수정안**: AuthContext에 usage 올리거나 isolate 캐시로 흡수.

---

## 4. 이미지/에셋 런타임

### 🔴 4-1. 전 변형(list·thumb·full)이 전부 원본 바이트 — 대 / 큰 작업
`src/lib/projectImageUrl.ts:6-8` + `src/app/projects/[projectId]/image/route.ts:12-19` —
`VARIANT_TRANSFORM` 전부 null ("쿼터 고갈로 변환 폐지"). 결과: FormatTile이 **288px 높이 타일에
1080~1920px 원본 PNG**(process 라우트가 Replicate 출력 원본을 무변환 저장, `process/base/route.ts:162-190`) 수신.
50에셋 프로젝트 첫 로드 = 수십~수백 MB 다운로드 + 디코드 램. 업로드 원본은 클라 downscale로 작지만
**생성 출력물은 대형 PNG 그대로**.

**수정안**: (1) process 시점에 썸네일 파생본을 함께 저장하는 파이프라인 추가
(Cloudflare Image Transformations binding 또는 wasm webp 인코더 — 큰 작업),
(2) 단기 완화: FormatTile/ProjectCard의 `sizes`+`loading` 재점검, 라이트박스 프리페치 방지.
Supabase 시절 쿼터 문제는 R2+Transformations로 부활 검토 가치 있음.

### 🟢 4-2. HeroWall 숨은 컨테이너의 priority 이미지 — 소 / 쉬움
`HeroWall.tsx:72` — 데스크톱 wall 컨테이너 첫 3장 `priority`(eager). 모바일에서 이 컨테이너는
`hidden md:block`으로 숨어있어도 eager라 로드됨 → 모바일 3장 낭비 다운로드 (lazy 분은 display:none에서 안 로드됨 ✓).

### ⚪ 4-3. 에디터 Remotion Player의 'full' 원본 — 의도된 설계 (프리뷰·다운로드 픽셀 동일성 보장), 조치 불필요. 4-1이 해결되면 자연 완화.

---

## 진행 방침 (사장님 승인 시)

1. **"5분 고침"부터**: 1-2 (import 삭제) → 1-1 (동적 로드) → 1-3·3-1·3-2 (memo 복구 묶음)
2. **보통 묶음**: 2-4 (목록 프로젝션) → 2-3 (presign lazy) → 2-1 (게이트웨이 스트림) → 2-2 (이미지 프록시 캐시)
3. **큰 작업은 별도**: 4-1 (썸네일 파이프라인) — 실제 사용자 붙기 전에 착수 검토
4. 각 작업 설명 → 컨펌 → develop 작업 → 릴리즈 머지 절차 준수
