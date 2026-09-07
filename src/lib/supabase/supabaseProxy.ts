import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieMethodsServer } from '@supabase/ssr/dist/main/types'

export async function createSupabaseProxyClient(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const cookieMethods: CookieMethodsServer = {
        getAll() {
            return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
                request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
            )
        },
    }

    const supabase = createServerClient(
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: cookieMethods,
        }
    )

    return { supabase, supabaseResponse }
}
