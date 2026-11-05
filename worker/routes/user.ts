import { Hono } from "hono";
import { userServerAPI } from "@server/api/userServerAPI";
import { usageServerAPI } from "@server/api/usageServerAPI";
import { getBaseResponse } from "@server/utils/getBaseResponse";
import type { User } from "@shared/types/supabase/Users";
import type { AppEnv } from "../env";
import type { AuthVariables } from "../middleware/auth";

/**
 * 사용자 — `/api/user/*`
 *
 * ## 예전과 달라진 점
 * - `x-internal-secret`(S2S) 검사 **삭제** — 세션은 미들웨어가 이미 검증했다.
 * - 게이트웨이가 주입하던 `?userId=` 쿼리 **삭제** — 세션에서 `context.get("user")`로 꺼낸다.
 * - 경로 파라미터와 세션 사용자가 다르면 403 (조용히 무시하지 않는다).
 *
 * ⚠️ `/user/by-email`을 `/user/:userId`보다 **먼저** 등록해야 한다 (고정 경로가 우선).
 */
const userRoutes = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

/** API 키는 값이 아니라 존재 여부만 노출한다. */
function maskKey(key: string | null | undefined): string | null {
    if (!key) return null;
    return "************";
}

/**
 * 세션 본인 행 조회 — `GET /api/user/by-email?email=`
 *
 * 미들웨어가 이미 행을 확보했으므로 **DB를 다시 조회하지 않는다.**
 * 다만 요청 email이 세션 email과 다르면 타인 조회이므로 존재 여부도 숨기고 null을 준다.
 */
userRoutes.get("/user/by-email", async (context) => {
    const sessionUser = context.get("user");
    const email = context.req.query("email") ?? "";

    if (email && email !== sessionUser.email) {
        return getBaseResponse({ success: true, status: 200, data: { user: null } });
    }

    return getBaseResponse({ success: true, status: 200, data: { user: sessionUser } });
});

/** 프로필 조회 — `GET /api/user/:userId` */
userRoutes.get("/user/:userId", async (context) => {
    const sessionUser = context.get("user");
    const pathUserId = context.req.param("userId");

    if (pathUserId !== sessionUser.id) {
        return getBaseResponse({ success: false, status: 403, error: "Forbidden. User mismatch." });
    }

    try {
        const user = await userServerAPI.getUserByUserId(pathUserId);
        if (!user) {
            return getBaseResponse({ success: false, status: 404, error: "User not found" });
        }

        const maskedUser: User = {
            ...user,
            fal_ai_api_key: maskKey(user.fal_ai_api_key),
            replicate_api_key: maskKey(user.replicate_api_key),
        };

        const usage = await usageServerAPI.getUsageStatus(user);

        return getBaseResponse({
            success: true,
            status: 200,
            data: {
                user: maskedUser,
                usage: {
                    ...usage,
                    plan: user.plan ?? null,
                },
            },
            message: "Fetched user data successfully.",
        });
    } catch (error) {
        console.error("[route/user] get failed:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get user data.",
        });
    }
});

/** 프로필 수정 — `PATCH /api/user/:userId` */
userRoutes.patch("/user/:userId", async (context) => {
    const sessionUser = context.get("user");
    const pathUserId = context.req.param("userId");

    if (pathUserId !== sessionUser.id) {
        return getBaseResponse({ success: false, status: 403, error: "Forbidden. User mismatch." });
    }

    try {
        const body = (await context.req.json()) as Partial<User>;

        // 요금제·구독·쿼터는 결제사/DB가 전담 — 클라이언트가 바꿀 수 없다.
        const updatable: Partial<User> = { ...body };
        delete updatable.id;
        delete updatable.plan;
        delete updatable.subscription_id;
        delete updatable.image_limit;

        const updatedUser = await userServerAPI.patchUserByUserId(pathUserId, updatable);
        if (!updatedUser) {
            return getBaseResponse({ success: false, status: 404, error: "User not found or update failed" });
        }

        return getBaseResponse({
            success: true,
            status: 200,
            data: { user: updatedUser },
            message: "User updated successfully.",
        });
    } catch (error) {
        console.error("[route/user] update failed:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update user data.",
        });
    }
});

export default userRoutes;
