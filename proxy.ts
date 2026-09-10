import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseProxyClient } from '@/lib/supabase/supabaseProxy';

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    const { supabase, supabaseResponse } = await createSupabaseProxyClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    // 로그인 상태에서 /sign-in 접근 → /projects로
    if (path.startsWith('/sign-in')) {
        if (user) {
            return NextResponse.redirect(new URL('/projects', request.url));
        }
        return supabaseResponse;
    }

    // /projects, /create는 로그인 필수 — 비로그인이면 원래 경로를 들고 /sign-in으로
    if (path.startsWith('/projects') || path.startsWith('/create')) {
        if (!user) {
            const signInUrl = new URL('/sign-in', request.url);
            signInUrl.searchParams.set('redirectTo', path);
            return NextResponse.redirect(signInUrl);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/sign-in',
        '/projects/:path*',
        '/create/:path*',
    ],
};
