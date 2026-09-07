// ad 하위 기준
//
// 1. image/route.ts (app/api/video/route.ts 처럼 넘겨주는 역할)
// 2. creative/specs/route.ts (전체 Creative 조합 뽑아서 한 번에 ad_creative_specs 저장)
// 3. creative/[creative-index]/prompt/route.ts (POST, OpenRouter로 LLM 호출), 비율이 하나면 4-2-1, 비율이 두 개 이상이면 4-1-1.
// 4-1-1. image/generation/base/route.ts (POST, I2I 호출)
// 4-1-2. app/webhook/ad/replicate/image/base/route.ts (받고 바로 image/process/base/route.ts로 넘기기)
// 4-1-3. image/process/base/route.ts (POST, payload 검사, 이미지 Supabase 저장 및 RPC 처리), 성공 시 4-2-1로 이동
// 4-2-1. image/generation/ratios/route.ts (POST, I2I 호출, AdGenerationBatch의 aspect_ratios length 보고 3과 4-1 중 어디서 온 건지 판별)
// 4-2-2. app/webhook/ad/replicate/image/ratios/route.ts (받고 바로 image/process/ratios/route.ts로 넘기기)
// 4-2-3. image/process/ratios/route.ts (POST, payload 검사, 이미지 Supabase 저장 및 RPC 처리), isLastCreative=true일 때 5로 이동
// 5. RPC 검사 후 특정 Creative 완료 시 creative/[creative-index]/analysis/route.ts 호출, 개별 Creative 데이터 DB 업데이트 (RPC 필요한가?)

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import {
    AdPipelineStartRequest,
    AdRatioKey,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/** 클라이언트 표기('1:1') → 저장 키('1_1') 정규화 맵 */
const CLIENT_RATIO_TO_KEY: Record<string, AdRatioKey> = {
    '1:1': '1_1',
    '4:5': '4_5',
    '9:16': '9_16',
    '16:9': '16_9',
    '2:3': '2_3',
};

export async function POST(request: NextRequest) {
    // client-gateway가 주입한 userId만 통과시킨다 (C2S 진입은 gateway 경유가 원칙)
    const userId = request.nextUrl.searchParams.get('userId');

    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId."
        });
    }

    try {
        const body: AdPipelineStartRequest = await request.json();

        // 비율 검증 + 정규화
        const rawAspectRatios = body.aspectRatios;
        if (!Array.isArray(rawAspectRatios) || rawAspectRatios.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "aspectRatios must be a non-empty array."
            });
        }

        const aspectRatioKeys: AdRatioKey[] = [];
        for (const rawRatio of rawAspectRatios) {
            const ratioKey = CLIENT_RATIO_TO_KEY[rawRatio];
            if (!ratioKey) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: `Unsupported aspect ratio: ${rawRatio}`
                });
            }
            if (!aspectRatioKeys.includes(ratioKey)) {
                aspectRatioKeys.push(ratioKey);
            }
        }

        // conceptCount 검증
        const conceptCount = body.conceptCount;
        if (!Number.isInteger(conceptCount) || conceptCount < 1 || conceptCount > 10) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "conceptCount must be an integer between 1 and 10."
            });
        }

        // 업로드 컴포넌트 검증 — 존재하면 확장자 필수
        for (const component of [body.productImage, body.personImage, body.brandLogo]) {
            if (component && !component.imageFileExtension) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "Uploaded component requires imageFileExtension."
                });
            }
        }

        // brandPalette 검증 — nullable, 3-5 hex
        let brandPalette: string[] | null = null;
        if (body.brandPalette != null) {
            if (!Array.isArray(body.brandPalette) || body.brandPalette.length < 3 || body.brandPalette.length > 5) {
                return getNextBaseResponse({
                    success: false,
                    status: 400,
                    error: "brandPalette must be null or an array of 3-5 hex colors."
                });
            }
            const hexRegex = /^#([0-9A-Fa-f]{6})$/;
            for (const hex of body.brandPalette) {
                if (typeof hex !== 'string' || !hexRegex.test(hex)) {
                    return getNextBaseResponse({
                        success: false,
                        status: 400,
                        error: `Invalid brandPalette hex: ${hex}`
                    });
                }
            }
            brandPalette = body.brandPalette.map((h) => h.toUpperCase());
        }

        // 배치 생성 — specs·results는 각 단계가 채운다
        const createdBatch = await adGenerationBatchServerAPI.postAdGenerationBatch({
            user_id: userId,
            status: 'queued',
            product_image: body.productImage ?? null,
            person_image: body.personImage ?? null,
            brand_logo: body.brandLogo ?? null,
            aspect_ratios: aspectRatioKeys,
            concept_count: conceptCount,
            cta_enabled: body.ctaEnabled ?? false,
            brand_palette: brandPalette,
            ad_creative_specs: [],
            ad_creative_results: [],
        });

        // 조합 배분 단계로 fire-and-forget 체이닝
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/ad/creative/specs?batchId=${createdBatch.id}`,
            { method: "POST" },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                batchId: createdBatch.id,
            },
            message: "Ad generation batch created and pipeline started.",
        });
    } catch (error) {
        console.error("Error in POST /api/ad/image:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to start ad generation pipeline"
        });
    }
}
