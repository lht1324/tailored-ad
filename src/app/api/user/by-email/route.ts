import { NextRequest } from "next/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

// 세션 본인의 프로필 행 조회 — GET /api/user/by-email?email=
// 게이트웨이 경유만 (세션 검증 + userId 주입). email은 세션 것과 일치해야 함 (타인 조회 차단).
export async function GET(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const email = request.nextUrl.searchParams.get('email') ?? '';
        const sessionUserId = request.nextUrl.searchParams.get('userId') ?? '';
        if (!email || !sessionUserId) {
            return getNextBaseResponse({ success: false, status: 400, error: 'Missing email.' });
        }

        const user = await usersServerAPI.getUserByEmail(email);
        // 세션 주인의 행이 아니면 타인 정보 — 존재 여부도 숨기고 null
        if (!user || user.id !== sessionUserId) {
            return getNextBaseResponse({ success: true, status: 200, data: { user: null } });
        }

        return getNextBaseResponse({ success: true, status: 200, data: { user } });
    } catch (error) {
        console.error('[api/user/by-email] failed:', error);
        return getNextBaseResponse({ success: false, status: 500, error: 'Failed to load profile.' });
    }
}
