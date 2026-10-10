import {NextRequest} from "next/server";
import { getAuth } from "@/lib/auth/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getServerEnv } from "@/lib/serverEnv";

export async function getIsValidRequestC2S() {
    // 세션 → email → 우리 users 행. 게이트웨이에 주입되는 userId는 우리 UUID라
    // 하류(IDOR 대조·DB 조회)가 그대로 동작한다. 행 없으면(신규·탈퇴) 무효.
    const auth = await getAuth();
    const { data: session } = await auth.getSession();
    const email = session?.user?.email ?? null;
    if (!email) {
        return { user: null, isValidRequest: false };
    }
    const user = await usersServerAPI.getUserByEmail(email);

    return {
        user: user,
        isValidRequest: user !== null
    }
}

export async function getIsValidRequestS2S(request: NextRequest) {
    const secret = request.headers.get('x-internal-secret');

    return secret === await getServerEnv('INTERNAL_FIRE_AND_FORGET_API_SECRET');
}