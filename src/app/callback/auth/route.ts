import {NextRequest, NextResponse} from 'next/server'
import {usersServerAPI} from '@/lib/api/server/usersServerAPI'
import {createSupabaseServer} from "@/lib/supabase/supabaseServer";
import {User} from "@/lib/api/types/supabase/Users";

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
                // 레이스 폴백: 콜백 중복 호출(flow_state_already_used) 시 첫 호출이 세션을 잡았을 수 있음.
                // 세션이 살아있으면 에러 페이지 대신 앱으로 보낸다.
                const { data: { session: racedSession } } = await supabase.auth.getSession()
                if (racedSession?.user) {
                    const redirectPath = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/projects"
                    return NextResponse.redirect(new URL(redirectPath, process.env.NODE_ENV === 'production' ? request.url : "http://localhost:3000"))
                }
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