import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adImageServerAPI, AD_IMAGE_STORAGE_BUCKET } from "@/lib/api/server/ad/imageServerAPI";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";

/**
 * GET /api/profile/logo — 공식 로고 조회 (Create 프리필용 읽기 전용).
 * {user_id}/profile/brand_logo.{ext} 가 있으면 signed URL을, 없으면 profileLogo: null을
 * HTTP 200 + success:true로 내려준다 (없음은 정상 상태라 404를 쓰지 않음).
 */
export async function GET(request: NextRequest) {
    if (!(await getIsValidRequestS2S(request))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId.",
        });
    }

    try {
        const supabase = await createSupabaseServiceRoleClient();
        const { data: files, error: listError } = await supabase.storage
            .from(AD_IMAGE_STORAGE_BUCKET)
            .list(`${userId}/profile`, { limit: 10 });

        if (listError) {
            throw new Error(`Failed to list profile folder: ${listError.message}`);
        }

        const logoFile = (files ?? []).find((f) => f.name.startsWith('brand_logo.'));
        if (!logoFile) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { profileLogo: null },
            });
        }

        const imageFileExtension = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
        const signedUrl = await adImageServerAPI.getProfileBrandLogoSignedUrl(userId, imageFileExtension);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                profileLogo: {
                    signedUrl,
                    fileName: logoFile.name,
                    imageFileExtension,
                },
            },
        });
    } catch (error) {
        console.error("Error in GET /api/profile/logo:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get profile logo",
        });
    }
}
