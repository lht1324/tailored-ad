import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adServerAPI } from "@/lib/api/server/ad/adServerAPI";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> },
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { taskId } = await context.params;

    try {
        const task = await adServerAPI.getAdTaskById(taskId);

        if (!task) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Task not found",
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                task,
            },
            message: "Fetched ad generation task successfully",
        });
    } catch (error) {
        console.error("Error in GET /api/ad/tasks/[taskId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get task",
        });
    }
}
