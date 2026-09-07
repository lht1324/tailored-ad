import { cookies } from 'next/headers'
import {CookieOptions, createServerClient} from '@supabase/ssr'
import type {CookieMethodsServer} from "@supabase/ssr/dist/main/types";

type Mode = "readOnly" | "mutate";

export async function createSupabaseServer(mode: Mode = "readOnly") {
    const cookieStore = await cookies(); // Next.js 15 비동기 대응
    const cookieMethods: CookieMethodsServer = {
        // 수동 매핑 없이 그대로 반환 (가장 중요)
        getAll() {
            return cookieStore.getAll();
        },
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
            if (mode === "mutate") {
                try {
                    cookies.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch (error) {
                    // Route Handler에서 리다이렉트 중 쿠키 설정 시 에러 방어
                }
            }
        },
    }

    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!, // 1번에서 수정한 ANON_KEY
        {
            cookies: cookieMethods,
        },
    )
}