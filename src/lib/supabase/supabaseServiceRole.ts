// lib/supabase/supabaseServiceRole.ts
import { createClient } from '@supabase/supabase-js'

// 이 클라이언트는 오직 서버의 백그라운드 작업 및 웹훅 용도로만 사용됩니다.
// 쿠키나 사용자 세션을 전혀 고려하지 않고, 서비스 키로만 인증합니다.
export function createSupabaseServiceRoleClient() {
    if (
        !process.env.SUPABASE_URL ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
        throw new Error('Supabase URL or Service Role Key is not set.')
    }

    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}