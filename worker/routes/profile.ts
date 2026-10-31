import { Hono } from "hono";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { getBaseResponse } from "@/lib/utils/getBaseResponse";
import type { AppEnv } from "../env";
import type { AuthVariables } from "../middleware/auth";

/**
 * 공식 로고 — `/api/profile/logo` (GET / POST / DELETE)
 *
 * 예전에는 라우트마다 `x-internal-secret`을 검사하고 `?userId=` 쿼리를 읽었다.
 * 지금은 세션에서 사용자 id를 가져온다 (`context.get("user")`).
 */
const profileRoutes = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_LOGO_BYTES = 10 * 1024 * 1024; // 10 MB

function mimeToExtension(mime: string): string | null {
    if (mime === "image/jpeg") return "jpeg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return null;
}

/** 기존 로고 키(`brand_logo.*`) 목록 — 확장자가 바뀔 때 옛 파일이 남지 않게 지우는 용도 */
async function listExistingLogoKeys(userId: string): Promise<string[]> {
    const names = await adImageServerAPI.listKeys(`${userId}/profile/`);
    return names
        .filter((name) => name.startsWith("brand_logo."))
        .map((name) => `${userId}/profile/${name}`);
}

/**
 * 로고 조회 (Create 화면 프리필용).
 * 파일이 없으면 404가 아니라 **200 + `profileLogo: null`** — 없음도 정상 상태다.
 */
profileRoutes.get("/profile/logo", async (context) => {
    const userId = context.get("user").id;

    try {
        const existing = await listExistingLogoKeys(userId);
        const logoFile = existing[0]?.split("/").pop();
        if (!logoFile) {
            return getBaseResponse({ success: true, status: 200, data: { profileLogo: null } });
        }

        const imageFileExtension = logoFile.split(".").pop()?.toLowerCase() ?? "png";
        const signedUrl = await adImageServerAPI.getProfileBrandLogoSignedUrl(userId, imageFileExtension);

        return getBaseResponse({
            success: true,
            status: 200,
            data: { profileLogo: { signedUrl, fileName: logoFile, imageFileExtension } },
        });
    } catch (error) {
        console.error("Error in GET /api/profile/logo:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get profile logo",
        });
    }
});

/** 로고 업로드 (multipart, 필드명 `logo`) — 기존 `brand_logo.*`를 지우고 새로 올린다. */
profileRoutes.post("/profile/logo", async (context) => {
    const userId = context.get("user").id;

    try {
        const formData = await context.req.formData();
        const file = formData.get("logo");
        if (!(file instanceof File)) {
            return getBaseResponse({ success: false, status: 400, error: "Missing logo file." });
        }
        if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
            return getBaseResponse({ success: false, status: 400, error: "Please upload a JPG, PNG, or WebP image." });
        }
        if (file.size > MAX_LOGO_BYTES) {
            return getBaseResponse({ success: false, status: 400, error: "File is too large. Keep it under 10 MB." });
        }
        const imageFileExtension = mimeToExtension(file.type);
        if (!imageFileExtension) {
            return getBaseResponse({ success: false, status: 400, error: "Unsupported image type." });
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
            throw new Error(
                `Failed to upload logo: ${uploadError instanceof Error ? uploadError.message : "unknown"}`,
            );
        }

        const signedUrl = await adImageServerAPI.getProfileBrandLogoSignedUrl(userId, imageFileExtension);

        return getBaseResponse({
            success: true,
            status: 200,
            data: { profileLogo: { signedUrl, fileName, imageFileExtension } },
        });
    } catch (error) {
        console.error("Error in POST /api/profile/logo:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to upload profile logo",
        });
    }
});

/** 로고 삭제 */
profileRoutes.delete("/profile/logo", async (context) => {
    const userId = context.get("user").id;

    try {
        const existing = await listExistingLogoKeys(userId);
        if (existing.length > 0) {
            await adImageServerAPI.deleteKeys(existing);
        }

        return getBaseResponse({ success: true, status: 200, data: { profileLogo: null } });
    } catch (error) {
        console.error("Error in DELETE /api/profile/logo:", error);
        return getBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to delete profile logo",
        });
    }
});

export default profileRoutes;
