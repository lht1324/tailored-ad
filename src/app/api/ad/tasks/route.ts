import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adServerAPI } from "@/lib/api/server/ad/adServerAPI";
import { AdGenerateRequest } from "@/lib/api/client/ad/adClientAPI";
import { AD_ASPECT_RATIOS, AD_CONCEPT_OPTIONS } from "@/lib/api/client/ad/adClientAPI";

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const body: AdGenerateRequest = await request.json();

        // 필수 필드 검증
        const hasBackground = Boolean(body.backgroundPrompt?.trim() || body.backgroundImage);
        const hasSubject = Boolean(body.product || body.person);

        if (!hasBackground) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "background (prompt or image) is required"
            });
        }

        if (!hasSubject) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "At least one subject (product or person) is required"
            });
        }

        const hasValidRatios = Array.isArray(body.aspectRatios) && body.aspectRatios.length > 0
            && body.aspectRatios.every((ratio) => AD_ASPECT_RATIOS.includes(ratio));

        if (!hasValidRatios) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "At least one valid aspect ratio is required"
            });
        }

        if (!AD_CONCEPT_OPTIONS.includes(body.conceptCount as (typeof AD_CONCEPT_OPTIONS)[number])) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Invalid concept count"
            });
        }

        // 생성 태스크 생성 (mock)
        const task = await adServerAPI.postAdTask(body);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                task,
            },
            message: "Ad generation task created",
        });
    } catch (error) {
        console.error("Error in POST /api/ad/tasks:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create task",
        });
    }
}
