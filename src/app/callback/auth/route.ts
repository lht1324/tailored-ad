import {NextRequest, NextResponse} from 'next/server'
import {usersServerAPI} from '@/lib/api/server/usersServerAPI'
import {createSupabaseServer} from "@/lib/supabase/supabaseServer";
import {SubscriptionPlan, User} from "@/lib/api/types/supabase/Users";

export async function GET(request: NextRequest) {
    const supabase = await createSupabaseServer("mutate");

    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const redirectTo = searchParams.get('redirectTo');
        let user: User | null;

        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('Auth callback error:', error)
                throw error;
            }

            // 세션 정보 가져오기
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                const userId = session.user.id

                // users 테이블에 사용자 존재 여부 확인
                const existingUser = await usersServerAPI.getUserByUserId(userId)

                if (existingUser === null) {
                    // 사용자가 없으면 새로 생성
                    const fullName = session.user.user_metadata?.full_name as (string | undefined);
                    const name = session.user.user_metadata?.name as (string | undefined);
                    const userName = (fullName || name) ?? "";

                    user = await usersServerAPI.postUsers({
                        id: userId,
                        email: session.user.email || '',
                        name: userName,
                        avatar_url: session.user.user_metadata?.avatar_url || '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                } else {
                    user = existingUser;
                }
            } else {
                throw Error("Session is not available");
            }
        } else {
            throw Error("Auth callback code is invalid");
        }

        if (!user) {
            throw Error("User is invalid");
        }

        const redirectPath = redirectTo
            ? redirectTo === "pricing"
                ? "/#pricing"
                : "/profile"
            : user.plan === SubscriptionPlan.NONE
                ? "/profile"
                : "/workspace/dashboard"

        return NextResponse.redirect(new URL(redirectPath, process.env.NODE_ENV === 'production' ? request.url : "http://localhost:3000"))
    } catch (error) {
        console.error('Unexpected auth callback error:', error)
        return NextResponse.redirect(new URL('/sign-in?error=oauth_failed', request.url))
    }
}