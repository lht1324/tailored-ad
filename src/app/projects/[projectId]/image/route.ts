import { NextRequest } from "next/server";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import type { AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";

export const dynamic = 'force-dynamic';

const VALID_RATIOS = ['1_1', '4_5', '9_16', '16_9', '2_3'] as const;

/** 표시용 변형 — 쿼터 고갈(월 원본 100개)로 변환 폐지, 전 변형 원본 중계 + CSS 사이징.
 *  full뿐 아니라 list·thumb도 원본 바이트 (브라우저 캐시가帯域을 흡수).
 *  v 파라미터는 URL 안정용으로 유지 (캐시 무효화 방지). */
const VARIANT_TRANSFORM: Record<string, { width?: number; height?: number; resize: 'contain' } | null> = {
    list: null,
    thumb: null,
    full: null,
};

/**
 * 프로젝트 이미지 프록시 — Supabase 서명 URL을 감추고 동일 출처로 중계한다.
 * GET /projects/[projectId]/image?c={creativeIndex}&r={ratioKey}&v={list|thumb|full}
 * 쿠키 세션 + 본인 소유 확인 (서명 URL bearer와 동등 이상). 다운로드는 기존 서명 URL 유지.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> },
) {
    const { user, isValidRequest } = await getIsValidRequestC2S();
    if (!isValidRequest || !user) {
        return getNextBaseResponse({ success: false, status: 401, error: 'Unauthorized: Sign-in required.' });
    }

    const { projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const creativeIndex = Number.parseInt(searchParams.get('c') ?? '', 10);
    const ratioKey = searchParams.get('r') ?? '';
    const variant = searchParams.get('v') ?? '';

    if (!projectId || !Number.isInteger(creativeIndex) || creativeIndex < 0
        || !(VALID_RATIOS as readonly string[]).includes(ratioKey)
        || !(variant in VARIANT_TRANSFORM)) {
        return getNextBaseResponse({ success: false, status: 400, error: 'Invalid image params.' });
    }

    try {
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchByIdForUser(projectId, user.id);
        if (!batch) {
            return getNextBaseResponse({ success: false, status: 404, error: 'Batch not found.' });
        }

        const creativeResult = batch.ad_creative_results?.find((r) => r.creativeIndex === creativeIndex);
        const imageResult = creativeResult?.imageResults?.[ratioKey as AdRatioKey] as { imageFileExtension?: string | null } | undefined;
        const ext = imageResult?.imageFileExtension;
        if (!ext) {
            return getNextBaseResponse({ success: false, status: 404, error: 'Image not ready.' });
        }

        const transform = VARIANT_TRANSFORM[variant];
        const signedUrl = await adImageServerAPI.getAdResultImageSignedUrl(
            batch.user_id,
            batch.id,
            creativeIndex,
            ratioKey as AdRatioKey,
            ext,
            transform ?? undefined,
        );

        const upstream = await fetch(signedUrl);
        if (!upstream.ok || !upstream.body) {
            return getNextBaseResponse({ success: false, status: 502, error: 'Failed to fetch image.' });
        }

        return new Response(upstream.body, {
            status: 200,
            headers: {
                'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': 'inline',
            },
        });
    } catch (error) {
        console.error(`Error in GET /projects/${projectId}/image:`, error);
        return getNextBaseResponse({ success: false, status: 500, error: 'Failed to load image.' });
    }
}
