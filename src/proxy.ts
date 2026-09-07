import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseProxyClient } from '@/lib/supabase/supabaseProxy';

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 1. /admin 하위 경로 보호
    if (path.startsWith('/admin')) {
        const secretParam = request.nextUrl.searchParams.get('secret');
        const adminSecretKey = process.env.ADMIN_SECRET_KEY;

        // secret 파라미터가 없거나, 환경 변수 값과 다르면 메인으로 리다이렉트
        if (!secretParam || secretParam !== adminSecretKey) {
            // 404를 반환하거나 메인으로 보낼 수 있습니다. 여기서는 메인으로 보냅니다.
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // 2. 세션 검사 및 라우팅 보호
    const { supabase, supabaseResponse } = await createSupabaseProxyClient(request);

    if (path.startsWith('/sign-in')) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            return NextResponse.redirect(new URL('/workspace/dashboard', request.url));
        }
    }

    // 3. /workspace 하위 경로 보호 (구독 플랜 확인)
    if (path.startsWith('/workspace')) {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL('/sign-in', request.url));
        }

        const { data: userData } = await supabase
            .from('users')
            .select('plan')
            .eq('id', user.id)
            .single();

        if (!userData?.plan || userData.plan === 'none') {
            return NextResponse.redirect(new URL('/profile', request.url));
        }
    }

    return supabaseResponse;
}

export const config = {
    // 미들웨어가 실행될 경로 지정
    matcher: [
        '/admin/:path*',    // /admin 및 그 하위 모든 경로
        '/sign-in',         // 로그인 페이지
        '/workspace/:path*', // /workspace 및 그 하위 모든 경로
    ],
};