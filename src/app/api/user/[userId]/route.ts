import { NextRequest } from "next/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { User } from "@/lib/api/types/supabase/Users";

// 클라이언트는 baseFetch → client-gateway 경유로만 호출 (게이트웨이가 세션 검증 + userId 주입).
// 직접 호출 차단을 위해 ad 라우트와 동일한 S2S 시크릿 검사를 적용.
function denyIfNotInternal(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }
    return null;
}

// path의 userId(클라이언트 입력)와 query의 userId(게이트웨이가 세션에서 주입 — 신뢰)가
// 다르면 타인 프로필 접근(IDOR)이므로 차단.
function denyIfUserMismatch(request: NextRequest, pathUserId: string) {
    const sessionUserId = request.nextUrl.searchParams.get('userId');
    if (!sessionUserId || sessionUserId !== pathUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. User mismatch.",
        });
    }
    return null;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const denied = denyIfNotInternal(request);
    if (denied) return denied;

    try {
        const { userId } = await params;

        const mismatch = denyIfUserMismatch(request, userId);
        if (mismatch) return mismatch;

        const user = await usersServerAPI.getUserByUserId(userId);

        if (!user) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "User not found"
            });
        }

        // --- Security Masking ---
        // Mask API keys before sending to the client (e.g., '************' if key exists)
        const maskKey = (key: string | null | undefined) => {
            if (!key) return null;
            return "************";
        };

        const maskedUser: User = {
            ...user,
            fal_ai_api_key: maskKey(user.fal_ai_api_key),
            replicate_api_key: maskKey(user.replicate_api_key),
        };

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                user: maskedUser,
            },
            message: "Fetched user data successfully."
        });
    } catch (error) {
        console.error("Error in GET /api/user/[userId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get user data."
        });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const denied = denyIfNotInternal(request);
    if (denied) return denied;

    try {
        const { userId } = await params;

        const mismatch = denyIfUserMismatch(request, userId);
        if (mismatch) return mismatch;

        // Request body 파싱
        const body: Partial<User> = await request.json();

        // plan/subscription 계열은 Polar 웹훅 전담 — 클라이언트에서 변경 불가.
        const updatable: Partial<User> = { ...body };
        delete updatable.id;
        delete updatable.plan;
        delete updatable.subscription_id;

        // 사용자 업데이트
        const updatedUser = await usersServerAPI.patchUserByUserId(userId, updatable);

        if (!updatedUser) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "User not found or update failed"
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                user: updatedUser,
            },
            message: "User updated successfully."
        });
    } catch (error) {
        console.error("Error in PATCH /api/user/[userId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update user data."
        });
    }
}
