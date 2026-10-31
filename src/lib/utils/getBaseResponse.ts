import { BaseResponse } from "@/lib/api/types/api/BaseResponse";

/**
 * 응답 봉투 헬퍼 — 모든 API 응답을 `{ success, status, message?, error?, data? }` 로 통일한다.
 *
 * 10-31 이관:
 *  - `NextResponse.json` → 표준 `Response.json` (Next 의존 제거)
 *  - 이름 `getNextBaseResponse` → `getBaseResponse` (Next 흔적 제거)
 *
 * Hono 핸들러에서 그대로 `return getBaseResponse({...})` 하면 된다.
 * 404/500 같은 프레임워크 기본 응답도 이 봉투로 맞추려면 `app.notFound()` / `app.onError()`에서 같은 함수를 쓴다.
 */

interface CustomResponse extends BaseResponse {
    data?: unknown;
}

export function getBaseResponse(baseResponse: CustomResponse): Response {
    if (baseResponse.error) {
        console.log(baseResponse.error);
    }

    return Response.json(
        { ...baseResponse },
        { status: baseResponse.status },
    );
}
