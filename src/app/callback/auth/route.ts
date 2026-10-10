import {NextRequest, NextResponse} from 'next/server'
import {usersServerAPI} from '@/lib/api/server/usersServerAPI'
import { getAuth } from "@/lib/auth/server";
import {User} from "@/lib/api/types/supabase/Users";

/**
 * OAuth 귀환 처리 — Managed Auth가 소셜 교환을 끝낸 뒤 여기로 보낸다.
 * 세션 email 기준 find-or-create (Better Auth ID는 UUID가 아니라 users.id로 못 씀).
 * 기존 행 재사용이라 잔액·이력·trial 상태가 그대로 이어진다.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const redirectTo = searchParams.get('redirectTo');

        const auth = await getAuth();
        const { data: session } = await auth.getSession();

        const authUser = session?.user ?? null;
        const email = authUser?.email ?? null;
        if (!authUser || !email) {
            throw Error("Session is not available");
        }

        let user: User | null = await usersServerAPI.getUserByEmail(email);
        if (user === null) {
            const userName = authUser.name ?? "";
            user = await usersServerAPI.postUsers({
                email,
                name: userName,
                avatar_url: authUser.image ?? '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        if (!user) {
            throw Error("User is invalid");
        }

        // TailoredAd에는 /profile, /workspace가 없음.
        // redirectTo는 / 로 시작하는 내부 경로만 허용 (open-redirect 방지).
        // 지정 없으면 플랜 없음(신규) → /create, 그 외 → /projects.
        const userPlan = (user as unknown as { plan?: string | null } | null)?.plan;
        const defaultPath = !userPlan || userPlan === 'none' ? '/create' : '/projects';
        const redirectPath = redirectTo && redirectTo.startsWith("/")
            ? redirectTo
            : defaultPath

        return NextResponse.redirect(new URL(redirectPath, process.env.NODE_ENV === 'production' ? request.url : "http://localhost:3000"))
    } catch (error) {
        console.error('Unexpected auth callback error:', error)
        return NextResponse.redirect(new URL('/sign-in?error=oauth_failed', request.url))
    }
}
