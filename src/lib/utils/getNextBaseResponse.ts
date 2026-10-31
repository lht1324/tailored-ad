import { BaseResponse } from "@/lib/api/types/api/BaseResponse";

/**
 * 응답 봉투 헬퍼 — `{ success, status, message?, error?, data? }` 규격을 강제한다.
 *
 * 10-31: NextResponse → 표준 `Response`로 교체 (Vite+Hono 이관).
 * 이름은 그대로 `getNextBaseResponse` — 호출부가 많아 개명 비용만 늘어난다.
 * (Hono 라우트에서도 `c.newResponse(...)` 없이 그대로 쓰거나 `c.json`으로 대체 가능)
 */

interface CustomResponse extends BaseResponse {
    data?: unknown;
}

export function getNextBaseResponse(baseResponse: CustomResponse): Response {
    if (baseResponse.error) {
        console.log(baseResponse.error);
    }

    return Response.json(
        { ...baseResponse },
        { status: baseResponse.status },
    );
}
