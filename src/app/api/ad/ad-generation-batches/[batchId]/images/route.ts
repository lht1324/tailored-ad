import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { AD_IMAGE_STORAGE_BUCKET } from "@/lib/api/server/ad/imageServerAPI";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getExtensionFromFile(file: File): string {
    const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpeg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const fromMime = mimeToExt[file.type];
    if (fromMime) return fromMime;
    const fromName = file.name.split(".").pop()?.toLowerCase();
    if (fromName === "jpg") return "jpeg";
    if (fromName && ["jpeg", "png", "webp"].includes(fromName)) return fromName;
    return "png";
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ batchId: string }> },
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized internal request",
        });
    }

    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId.",
        });
    }

    const { batchId } = await context.params;
    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing batchId.",
        });
    }

    try {
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchByIdForUser(batchId, userId);
        if (!batch) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Batch not found.",
            });
        }

        const formData = await request.formData();
        const productFile = formData.get("product") as File | null;
        const personFile = formData.get("person") as File | null;
        const brandLogoFile = formData.get("brand_logo") as File | null;

        if (!productFile && !personFile) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "At least one of product or person file is required.",
            });
        }

        const supabase = createSupabaseServiceRoleClient();
        const uploaded: Record<string, string> = {};

        for (const [key, file] of [
            ["product", productFile],
            ["person", personFile],
            ["brand_logo", brandLogoFile],
        ] as const) {
            if (!file || !(file instanceof File) || file.size === 0) continue;

            if (!ALLOWED_TYPES.has(file.type)) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `${key} must be JPG, PNG, or WebP.`,
                });
            }
            if (file.size > MAX_FILE_SIZE) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `${key} must be under 10 MB.`,
                });
            }

            const ext = getExtensionFromFile(file);
            const filePath = `${userId}/${batchId}/${key}_image.${ext}`;
            const arrayBuffer = await file.arrayBuffer();

            const { error: uploadError } = await supabase.storage
                .from(AD_IMAGE_STORAGE_BUCKET)
                .upload(filePath, arrayBuffer, {
                    contentType: file.type,
                    upsert: true,
                });

            if (uploadError) {
                throw new Error(`Failed to upload ${key} image: ${uploadError.message}`);
            }

            uploaded[key] = filePath;
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { uploaded },
            message: "Original images uploaded.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/ad-generation-batches/[batchId]/images (batch=${batchId}):`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to upload images",
        });
    }
}
