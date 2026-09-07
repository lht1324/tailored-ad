import {NextRequest} from "next/server";
import {createSupabaseServer} from "@/lib/supabase/supabaseServer";

export async function getIsValidRequestC2S() {
    const supabase = await createSupabaseServer();
    const {data: {user: authUser}, error: authError} = await supabase.auth.getUser();

    return {
        user: authUser,
        isValidRequest: !(authError || !authUser)
    }
}

export function getIsValidRequestS2S(request: NextRequest) {
    const secret = request.headers.get('x-internal-secret');

    return secret === process.env.INTERNAL_FIRE_AND_FORGET_API_SECRET;
}