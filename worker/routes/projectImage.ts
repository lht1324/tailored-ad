import { Hono } from "hono";
import { adGenerationBatchServerAPI } from "@worker/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@worker/lib/api/server/ad/imageServerAPI";
import { loadSessionUser } from "../middleware/auth";
import { getBaseResponse } from "@worker/lib/utils/getBaseResponse";
import type { AdRatioKey } from "@shared/types/supabase/ad/AdGenerationBatch";
import type { AppEnv } from "../env";

/**
 * 프로젝트 이미지 프록시 — `GET /projects/:projectId/image?c=&r=&v=`
 *
 * ## 왜 프록시하나
 * R2 서명 URL은 **토큰이 들어간 주소**다. 그대로 `<img src>`에 쓰면 화면·캐시·스크린샷에
 * 토큰이 노출된다. 그래서 클라는 예쁜 동일 출처 경로만 쓰고, 실바이트는 여기서 중계한다.
 * (권한은 쿠키 세션 + 배치 소유 확인으로 판단 — 서명 URL bearer와 동등 이상)
 *
 * ## 왜 `/api`가 아닌가
 * 구 Next에서도 페이지 경로 아래 라우트 핸들러였다(`app/projects/[id]/image/route.ts`).
 * 클라의 `buildProjectImageUrl`이 이 경로를 만든다 — 바꾸면 캐시·북마크가 깨진다.
 *
 * ⚠️ **`pageGuard`보다 먼저 마운트해야 한다.** 페이지 가드가 `/projects/*`를 잡아
 *    index.html로 돌려버리면 이미지가 깨진다(실제로 그렇게 깨졌다).
 */
const projectImageRoutes = new Hono<{ Bindings: AppEnv }>();

const VALID_RATIOS = ["1_1", "4_5", "9_16", "16_9", "2_3"] as const;

/** 표시용 변형 — 변환 쿼터 문제로 전부 원본 바이트 + CSS 사이징. v는 URL 안정용. */
const VALID_VARIANTS = new Set(["list", "thumb", "full"]);

projectImageRoutes.get("/projects/:projectId/image", async (context) => {
    const { user } = await loadSessionUser(context.req.raw);
    if (!user) {
        return getBaseResponse({ success: false, status: 401, error: "Unauthorized: Sign-in required." });
    }

    const projectId = context.req.param("projectId");
    const creativeIndex = Number.parseInt(context.req.query("c") ?? "", 10);
    const ratioKey = context.req.query("r") ?? "";
    const variant = context.req.query("v") ?? "";

    if (
        !projectId ||
        !Number.isInteger(creativeIndex) ||
        creativeIndex < 0 ||
        !(VALID_RATIOS as readonly string[]).includes(ratioKey) ||
        !VALID_VARIANTS.has(variant)
    ) {
        return getBaseResponse({ success: false, status: 400, error: "Invalid image params." });
    }

    try {
        // 소유 확인 — 남의 배치는 404 (존재 여부도 숨긴다)
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchByIdForUser(projectId, user.id);
        if (!batch) {
            return getBaseResponse({ success: false, status: 404, error: "Batch not found." });
        }

        const creativeResult = batch.ad_creative_results?.find((result) => result.creativeIndex === creativeIndex);
        const imageResult = creativeResult?.imageResults?.[ratioKey as AdRatioKey] as
            | { imageFileExtension?: string | null }
            | undefined;
        const extension = imageResult?.imageFileExtension;
        if (!extension) {
            return getBaseResponse({ success: false, status: 404, error: "Image not ready." });
        }

        const signedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
            batch.user_id,
            batch.id,
            creativeIndex,
            ratioKey as AdRatioKey,
            extension,
        );

        const upstream = await fetch(signedUrl);
        if (!upstream.ok || !upstream.body) {
            return getBaseResponse({ success: false, status: 502, error: "Failed to fetch image." });
        }

        return new Response(upstream.body, {
            status: 200,
            headers: {
                "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
                // private: 사용자별 자산이라 공유 캐시 금지. 1시간은 브라우저만.
                "Cache-Control": "private, max-age=3600",
                "Content-Disposition": "inline",
            },
        });
    } catch (error) {
        console.error(`Error in GET /projects/${projectId}/image:`, error);
        return getBaseResponse({ success: false, status: 500, error: "Failed to load image." });
    }
});

export default projectImageRoutes;
