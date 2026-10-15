import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getServerEnv } from "@/lib/serverEnv";

/**
 * GET /api/dodo/env — Dodo 환경 조회 (클라 SDK 초기화용).
 * NEXT_PUBLIC_*은 빌드타임이라 브라우저가 런타임 값을 볼 수 없어서 서버가 알려준다.
 * dev=test, prod=live 로 자동 분리. 값이 없거나 이상하면 success:false (클라는 envError 표시).
 */
export async function GET(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const env = await getServerEnv('NEXT_PUBLIC_DODO_ENV');
    if (env !== 'test' && env !== 'live') {
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Dodo environment is not configured (NEXT_PUBLIC_DODO_ENV).',
        });
    }

    return getNextBaseResponse({
        success: true,
        status: 200,
        data: { env },
    });
}
