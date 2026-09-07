/**
 * ad_generation_batches 테이블 타입 정의 — ⚠️ 임시 (스키마 미확정).
 * ad_creative_specs[] 형식 합의됨. results 저장 방식 확정 (2026-08-24):
 * - copy(creative 단위) → LLM 생성 단계에서 일괄 UPDATE (RPC 불필요 — 이미지 없음, 단일 시점 기록)
 * - design/score(비율 단위) → RPC `update_creative_image_by_ratio_generation_completed`로 원자적 부분 갱신
 *   (이미지 웹훅 도착마다 원자적 체크·기록 + 마지막 조각 완료 판정 — ad_variation_study.md §5,7)
 *
 * 플랫폼: 이미지 생성은 Replicate (prediction + webhook) — fal의 계정 concurrency 캡이 없고,
 * 모델 단위 오토스케일이라 동시 폭이 수요에 따라 결정됨. (2026-08-24 확정)
 */

import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";

export type AdAspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '2:3';

/**
 * JSON 키/경로에 콜론이 포함되면 여러 곳에서 곤란 → 언더스코어 정규화.
 * creativeIndex의 각 이미지(비율 파생) 대응 키.
 */
export type AdRatioKey = '1_1' | '4_5' | '9_16' | '16_9' | '2_3';

export type AdBatchStatus = 'queued' | 'generating' | 'designing' | 'rendering' | 'completed' | 'failed';

export interface AdUploadedComponentRecord {
    /**
     * Supabase Storage 규칙 경로의 확장자 — 영단어 그대로 (예: "jpeg", "png", "webp").
     * 경로는 규칙으로 조립: {user_id}/{batch_id}/{product|person}_image.{imageFileExtension}
     * (함수명은 절대 약어 금지 — 이 필드만으로 signed URL 재생성 가능해야 함)
     */
    imageFileExtension: string;
    /** 사용자가 이미지에 덧붙인 선택적 설명 */
    note?: string;
}

/**
 * 파이프라인 진입(POST /api/ad/image) 요청 body — 클라이언트가 보내는 camelCase 계약.
 * 배경 입력 없음 (2026-08-24 확정: 배경은 creative마다 AI가 생성).
 * aspectRatios는 사용자 노출 표기('1:1') 그대로 받고, 진입 라우트가 AdRatioKey('1_1')로 정규화한다.
 */
export interface AdPipelineStartRequest {
    productImage?: AdUploadedComponentRecord | null;
    personImage?: AdUploadedComponentRecord | null;
    brandLogo?: AdUploadedComponentRecord | null;
    aspectRatios: string[];
    conceptCount: number;
    ctaEnabled?: boolean;
    /** 브랜드 팔레트 3-5 hex — nullable, 조건부 입력. 비어 있으면 7종 랜덤 분배 유지 */
    brandPalette?: string[] | null;
}

export interface AdCreativeSpec {
    /** 배치 내 몇 번째 크리에이티브인지 (0-based) — results[]가 this를 참조 */
    creativeIndex: number;
    /** 크리에이티브 특성 = 이 크리에이티브의 "다름"을 정의하는 축 (코드가 배정) */
    camera: string;
    lighting: string;
    palette: string;
    framing: string;
    layout_tone: string;
    /** 이미지(비율)별 최종 I2I 캡션 레코드. 같은 creative의 비율 파생마다 다른 캡션. */
    imagePromptRecord: Partial<Record<AdRatioKey, string>>;
    /** creative 공통 시드 — 비율 파생들이 같은 seed를 공유해 "같은 개념"을 맞추는 신호 */
    seed: number;
}

/**
 * ★ 2026-08-24 확정 — results 산출물 구조 (specs 미러: 배열의 i = 같은 creative, 비율은 Record)
 */

/** 판매 카피(텍스트) + 폰트 — CD가 Specs 생성 단계에 작성. 이미지 생성과 무관한 creative당 1회 산출물 */
export interface AdCopySpec {
    headline: string | null;
    /** cta_enabled=false면 null */
    cta: string | null;
    /** 헤드라인용 폰트 — available_fonts 중 하나, verbatim (예: "Barlow Condensed") */
    fontFamily?: string | null;
    /** 헤드라인용 웨이트 — 해당 fontFamily의 weightList 중 하나, 미지원 시 400으로 교정 */
    fontWeight?: number | null;
    /** 헤드라인 색 — white/black 2택, 대비 안전값. 브랜드 hex는 highlight에만 사용 */
    headlineColor?: 'white' | 'black' | null;
}

/** 비율(이미지) 1장의 산출물 — 이미지 생성 후 Qwen Vision이 확정. fail-soft: error가 있으면 해당 비율만 실패로 격리 */
export interface AdImageResult {
    /** 오버레이 지오메트리(헤드라인/CTA/로고 위치 + scrim) — 실제 이미지를 보고 결정 */
    design: AdDesignLayout;
    /** 0.0~10.0 실수, 평가 전 null */
    score: number | null;
    /** Storage 규칙 경로의 확장자 — process가 다운로드 시 확정해 RPC 마커로 기록 */
    imageFileExtension: string | null;
    /** fail-soft — 해당 비율 생성/저장 실패 시에만 존재. 성공 시 null */
    error?: { code: string; message: string } | null;
}

/** creative 1개의 결과 — ad_creative_specs[i]와 creativeIndex로 1:1 대응 */
export interface AdCreativeResult {
    creativeIndex: number;
    /** creative당 1회 — copy는 이미지 무관, RPC가 아닌 일괄 UPDATE로 기록 */
    copy: AdCopySpec;
    /** 선택 비율만 존재 — 생성 완료된 비율부터 채워짐 */
    imageResults: Partial<Record<AdRatioKey, AdImageResult>>;
}

export interface AdGenerationBatch {
    id: string;
    user_id: string;
    status: AdBatchStatus;
    product_image: AdUploadedComponentRecord | null;
    person_image: AdUploadedComponentRecord | null;
    brand_logo: AdUploadedComponentRecord | null;
    aspect_ratios: AdRatioKey[];
    concept_count: number;
    cta_enabled: boolean;
    /** 브랜드 팔레트 3-5 hex — nullable, 조건부. 비어 있으면 7종 랜덤 분배 */
    brand_palette: string[] | null;
    /** ★ 변주 스펙 벡터(지시문) — creative별 (5축+이미지 캡션 레코드+seed) */
    ad_creative_specs: AdCreativeSpec[];
    /**
     * ★ 2026-08-24 확정 — 결과 저장은 RPC(jsonb 부분 갱신):
     * copy는 creative 단위 1회 UPDATE, design/score는 RPC
     * `update_creative_image_by_ratio_generation_completed`로 비율 단위 원자적 기록.
     * 함수명은 절대 약어 금지 — 이름이 곧 생성 완료 판정자임.
     */
    ad_creative_results: AdCreativeResult[];
    created_at: string;
    updated_at: string | null;
}