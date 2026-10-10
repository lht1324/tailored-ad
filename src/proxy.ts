import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';

/**
 * 로그인 가드 — Neon Auth 세션으로 판정 (Supabase에서 이관).
 * getSession이 edge/proxy에서 깨지면 auth.middleware로 폴백할 것.
 */
export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    const auth = await getAuth();
    const { data: session } = await auth.getSession();
    const user = session?.user ?? null;

    // 로그인 상태에서 /sign-in 접근 → /projects로
    if (path.startsWith('/sign-in')) {
        if (user) {
            return NextResponse.redirect(new URL('/projects', request.url));
        }
        return NextResponse.next();
    }

    // /projects, /create, /profile은 로그인 필수 — 비로그인이면 원래 경로를 들고 /sign-in으로
    if (path.startsWith('/projects') || path.startsWith('/create') || path.startsWith('/profile')) {
        if (!user) {
            const signInUrl = new URL('/sign-in', request.url);
            signInUrl.searchParams.set('redirectTo', path);
            return NextResponse.redirect(signInUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/sign-in',
        '/projects/:path*',
        '/create/:path*',
        '/profile/:path*',
    ],
};
