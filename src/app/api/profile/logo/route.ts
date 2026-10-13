import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";

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

/** 기존 공식 로고 키(brand_logo.*) 목록 — 확장자 변경 시 구파일 잔류 방지용 */
async function listExistingLogoKeys(userId: string): Promise<string[]> {
    const names = await adImageServerAPI.listKeys(`${userId}/profile/`);
    return names
        .filter((name) => name.startsWith('brand_logo.'))
        .map((name) => `${userId}/profile/${name}`);
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
        const existing = await listExistingLogoKeys(userId);
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

        const existing = await listExistingLogoKeys(userId);
        if (existing.length > 0) {
            await adImageServerAPI.deleteKeys(existing);
        }

        const fileName = `brand_logo.${imageFileExtension}`;
        const filePath = `${userId}/profile/${fileName}`;
        try {
            await adImageServerAPI.uploadObject(filePath, await file.arrayBuffer(), file.type);
        } catch (uploadError) {
            throw new Error(`Failed to upload logo: ${uploadError instanceof Error ? uploadError.message : 'unknown'}`);
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
        const existing = await listExistingLogoKeys(userId);
        if (existing.length > 0) {
            await adImageServerAPI.deleteKeys(existing);
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
