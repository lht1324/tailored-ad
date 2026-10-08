import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adImageServerAPI, AD_IMAGE_STORAGE_BUCKET } from "@/lib/api/server/ad/imageServerAPI";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_LOGO_BYTES = 10 * 1024 * 1024; // 10 MB

function mimeToExtension(mime: string): string | null {
    if (mime === 'image/jpeg') return 'jpeg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return null;
}

async function requireUserId(request: NextRequest): Promise<string | null> {
    if (!(await getIsValidRequestS2S(request))) return null;
    return request.nextUrl.searchParams.get('userId');
}

/** 기존 공식 로고 파일명(brand_logo.*) 목록 — 확장자 변경 시 구파일 잔류 방지용 */
async function listExistingLogoNames(userId: string): Promise<string[]> {
    const supabase = await createSupabaseServiceRoleClient();
    const { data: files, error } = await supabase.storage
        .from(AD_IMAGE_STORAGE_BUCKET)
        .list(`${userId}/profile`, { limit: 10 });
    if (error) {
        throw new Error(`Failed to list profile folder: ${error.message}`);
    }
    return (files ?? [])
        .filter((f) => f.name.startsWith('brand_logo.'))
        .map((f) => `${userId}/profile/${f.name}`);
}

/**
 * GET /api/profile/logo — 공식 로고 조회 (Create 프리필용 읽기 전용).
 * {user_id}/profile/brand_logo.{ext} 가 있으면 signed URL을, 없으면 profileLogo: null을
 * HTTP 200 + success:true로 내려준다 (없음은 정상 상태라 404를 쓰지 않음).
 */
export async function GET(request: NextRequest) {
    const userId = await requireUserId(request);
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const existing = await listExistingLogoNames(userId);
        const logoFile = existing[0]?.split('/').pop();
        if (!logoFile) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { profileLogo: null },
            });
        }

        const imageFileExtension = logoFile.split('.').pop()?.toLowerCase() ?? 'png';
        const signedUrl = await adImageServerAPI.getProfileBrandLogoSignedUrl(userId, imageFileExtension);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                profileLogo: {
                    signedUrl,
                    fileName: logoFile,
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

/**
 * POST /api/profile/logo — 공식 로고 업로드 (multipart, 필드명 "logo").
 * 기존 brand_logo.*를 먼저 지우고 새로 upsert — 확장자 변경 시 구파일 잔류 방지.
 */
export async function POST(request: NextRequest) {
    const userId = await requireUserId(request);
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('logo');
        if (!(file instanceof File)) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Missing logo file.',
            });
        }
        if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Please upload a JPG, PNG, or WebP image.',
            });
        }
        if (file.size > MAX_LOGO_BYTES) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'File is too large. Keep it under 10 MB.',
            });
        }
        const imageFileExtension = mimeToExtension(file.type);
        if (!imageFileExtension) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Unsupported image type.',
            });
        }

        const supabase = await createSupabaseServiceRoleClient();
        const existing = await listExistingLogoNames(userId);
        if (existing.length > 0) {
            const { error: removeError } = await supabase.storage
                .from(AD_IMAGE_STORAGE_BUCKET)
                .remove(existing);
            if (removeError) {
                throw new Error(`Failed to remove previous logo: ${removeError.message}`);
            }
        }

        const fileName = `brand_logo.${imageFileExtension}`;
        const filePath = `${userId}/profile/${fileName}`;
        const { error: uploadError } = await supabase.storage
            .from(AD_IMAGE_STORAGE_BUCKET)
            .upload(filePath, await file.arrayBuffer(), {
                contentType: file.type,
                upsert: true,
            });
        if (uploadError) {
            throw new Error(`Failed to upload logo: ${uploadError.message}`);
        }

        const signedUrl = await adImageServerAPI.getProfileBrandLogoSignedUrl(userId, imageFileExtension);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                profileLogo: {
                    signedUrl,
                    fileName,
                    imageFileExtension,
                },
            },
        });
    } catch (error) {
        console.error("Error in POST /api/profile/logo:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to upload profile logo",
        });
    }
}

/** DELETE /api/profile/logo — 공식 로고 삭제 */
export async function DELETE(request: NextRequest) {
    const userId = await requireUserId(request);
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const supabase = await createSupabaseServiceRoleClient();
        const existing = await listExistingLogoNames(userId);
        if (existing.length > 0) {
            const { error: removeError } = await supabase.storage
                .from(AD_IMAGE_STORAGE_BUCKET)
                .remove(existing);
            if (removeError) {
                throw new Error(`Failed to remove logo: ${removeError.message}`);
            }
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { profileLogo: null },
        });
    } catch (error) {
        console.error("Error in DELETE /api/profile/logo:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to delete profile logo",
        });
    }
}
