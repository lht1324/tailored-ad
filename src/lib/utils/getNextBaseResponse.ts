import {NextResponse} from "next/server";
import {BaseResponse} from "@/lib/api/types/api/BaseResponse";

interface CustomResponse extends BaseResponse {
    data?: unknown;
}

export function getNextBaseResponse(
    baseResponse: CustomResponse,
): NextResponse<BaseResponse> {
    if (baseResponse.error) {
        console.log(baseResponse.error);
    }

    return NextResponse.json({
        ...baseResponse,
    }, { status: baseResponse.status });
}