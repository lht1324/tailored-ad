import {
    AdCreativeSpec,
    AdRatioKey,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * Creative 조합 샘플러 — 변주("다름")의 1차 원천. LLM이 아니라 코드가 결정적으로 배분한다.
 *
 * - 5축 풀에서 conceptCount개 조합을 배치 내 중복 없이 추출
 * - 축별 최소 사용률(편향 방지): 한 값이 과도하게 반복되지 않도록 축별 예산(cap) 강제
 * - 어법 필터는 데이터(HARD_BANNED_AXIS_PAIRS)로 관리 — if/switch 조건문을 흩뿌리지 않는다.
 *   걸린 조합은 폐기하고 다시 뽑는 rejection 방식.
 * - 결정성: 같은 입력 재실행의 재현은 저장된 ad_creative_specs(DB)가 담당하므로,
 *   여기서 시드는 매 배치 새로 뽑아도 무방하다.
 */

export type CreativeAxisName = 'camera' | 'lighting' | 'palette' | 'framing' | 'layout_tone';

/** 카메라/구성 (8) — ad_variation_study.md §1 */
export const CREATIVE_CAMERA_POOL = [
    'hero_shot',
    'packshot',
    'lifestyle_shot',
    'detail_close',
    'flat_lay',
    'overhead_angle',
    'product_in_hand',
    'environment_shot',
] as const;

/** 조명/시간 (8) — 단일 조명 (복합광 제외) */
export const CREATIVE_LIGHTING_POOL = [
    'golden_hour',
    'blue_hour',
    'studio_soft',
    'studio_hard',
    'high_key',
    'low_key',
    'overcast',
    'night_low',
] as const;

/** 팔레트 (7) */
export const CREATIVE_PALETTE_POOL = [
    'neutral',
    'warm',
    'cool',
    'vivid',
    'muted',
    'mono',
    'earth_tones',
] as const;

/** 프레이밍 (5) */
export const CREATIVE_FRAMING_POOL = [
    'centered',
    'left_of_frame',
    'right_of_frame',
    'negative_space',
    'tight_crop',
] as const;

/** 레이아웃 톤 (5) — 광고 카피레이아웃의 기본 결정 */
export const CREATIVE_LAYOUT_TONE_POOL = [
    'classic_product',
    'lifestyle_narrative',
    'editorial_statement',
    'minimal_modern',
    'bold_impact',
] as const;

const AXIS_POOLS: Record<CreativeAxisName, readonly string[]> = {
    camera: CREATIVE_CAMERA_POOL,
    lighting: CREATIVE_LIGHTING_POOL,
    palette: CREATIVE_PALETTE_POOL,
    framing: CREATIVE_FRAMING_POOL,
    layout_tone: CREATIVE_LAYOUT_TONE_POOL,
};

const AXIS_NAMES = Object.keys(AXIS_POOLS) as CreativeAxisName[];

/**
 * 금지 쌍(hard ban) 목록 — [축A, 값A, 축B, 값B].
 * 이 쌍이 한 조합에 동시 출현하면 사진적으로 성립하지 않으므로 폐기한다.
 * Rejection 방식으로 걸리면 재추첨하므로, 추가만 하면 반영된다.
 */
const HARD_BANNED_AXIS_PAIRS: ReadonlyArray<readonly [CreativeAxisName, string, CreativeAxisName, string]> = [
    ['lighting', 'night_low', 'palette', 'vivid'],
    ['lighting', 'low_key', 'palette', 'vivid'],
    ['camera', 'packshot', 'lighting', 'golden_hour'],
    ['camera', 'packshot', 'lighting', 'blue_hour'],
    ['camera', 'detail_close', 'framing', 'negative_space'],
    ['camera', 'flat_lay', 'framing', 'tight_crop'],
    ['camera', 'environment_shot', 'framing', 'tight_crop'],
    ['framing', 'tight_crop', 'layout_tone', 'minimal_modern'],
];

/** 결과 화면 캐노니컬 매체 순서 — 기준 비율 선정 및 정렬의 단일 소스 */
export const CANONICAL_RATIO_ORDER: AdRatioKey[] = ['9_16', '2_3', '4_5', '1_1', '16_9'];

/**
 * 기준(base) 비율 선정 — 선택 비율 중 1:1 우선, 없으면 캐노니컬 순서 첫 번째.
 * generation/base · ratios 양쪽이 이 함수 하나로 기준을 특정한다 (판단 지식 단일화).
 */
export function selectBaseRatio(aspectRatios: AdRatioKey[]): AdRatioKey {
    if (aspectRatios.includes('1_1')) {
        return '1_1';
    }

    const sorted = [...aspectRatios].sort(
        (a, b) => CANONICAL_RATIO_ORDER.indexOf(a) - CANONICAL_RATIO_ORDER.indexOf(b),
    );

    return sorted[0];
}

// 시드 기반 의사난수 — 결정적 순회를 위해 mulberry32 사용 (기존 mock 유틸과 동일 구현)
function createRandomFromSeed(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t ^ (t >>> 14)) >>> 0;
        return t / 4294967296;
    };
}

function isPairBanned(combo: Record<CreativeAxisName, string>): boolean {
    return HARD_BANNED_AXIS_PAIRS.some(([axisA, valueA, axisB, valueB]) => {
        return combo[axisA] === valueA && combo[axisB] === valueB;
    });
}

function comboToKey(combo: Record<CreativeAxisName, string>): string {
    return AXIS_NAMES.map((axisName) => combo[axisName]).join('|');
}

/**
 * 배치 전체의 creative 조합 배정.
 * - 축별 예산(cap = ceil(conceptCount / 풀 크기))으로 편향 방지
 * - 금지 쌍 + 배치 내 중복은 rejection: 제약 위반 후보는 폐기하고 다시 뽑는다
 * - 병목 시 완화 단계(금지 해제 → 예산 완화)를 두어 배분 실패로 배치가 죽지 않게 한다
 *   (조합 공간이 11,200개라 현실적으로 도달하지 않는 경로다)
 */
export function assignCreativeCombinations(conceptCount: number, seed?: number): AdCreativeSpec[] {
    const resolvedSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
    const random = createRandomFromSeed(resolvedSeed);

    // 축별 값 사용 카운트 — 최소 사용률 강제의 기준
    const usageCounts: Record<CreativeAxisName, Map<string, number>> = {
        camera: new Map(),
        lighting: new Map(),
        palette: new Map(),
        framing: new Map(),
        layout_tone: new Map(),
    };

    const usedComboKeys = new Set<string>();

    const specs: AdCreativeSpec[] = [];

    for (let creativeIndex = 0; creativeIndex < conceptCount; creativeIndex++) {
        const combo = pickCombinationWithConstraints({
            creativeIndex,
            conceptCount,
            usageCounts,
            usedComboKeys,
            random,
        });

        AXIS_NAMES.forEach((axisName) => {
            const counter = usageCounts[axisName];
            counter.set(combo[axisName], (counter.get(combo[axisName]) ?? 0) + 1);
        });
        usedComboKeys.add(comboToKey(combo));

        specs.push({
            creativeIndex,
            camera: combo.camera,
            lighting: combo.lighting,
            palette: combo.palette,
            framing: combo.framing,
            layout_tone: combo.layout_tone,
            imagePromptRecord: {}, // 캡션 레코드는 프롬프트 단계(LLM)가 선택 비율만 채운다
            seed: Math.floor(random() * 0x7fffffff),
        });
    }

    return specs;
}

interface PickConstraintParams {
    creativeIndex: number;
    conceptCount: number;
    usageCounts: Record<CreativeAxisName, Map<string, number>>;
    usedComboKeys: Set<string>;
    random: () => number;
}

function pickCombinationWithConstraints(params: PickConstraintParams): Record<CreativeAxisName, string> {
    const { conceptCount, usageCounts, usedComboKeys, random } = params;

    // 축별 값별 허용 반복 상한 — 예: 10개 중 카메라 8종이면 종당 2회까지
    const budgetPerValue: Record<CreativeAxisName, number> = {
        camera: Math.ceil(conceptCount / AXIS_POOLS.camera.length),
        lighting: Math.ceil(conceptCount / AXIS_POOLS.lighting.length),
        palette: Math.ceil(conceptCount / AXIS_POOLS.palette.length),
        framing: Math.ceil(conceptCount / AXIS_POOLS.framing.length),
        layout_tone: Math.ceil(conceptCount / AXIS_POOLS.layout_tone.length),
    };

    // 완화 단계: 0=전체 제약, 1=금지 쌍 해제, 2=예산 해제 (중복만 최후에 유지)
    for (let relaxationLevel = 0; relaxationLevel <= 2; relaxationLevel++) {
        const maxAttempts = 200;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidate: Record<CreativeAxisName, string> = {
                camera: '',
                lighting: '',
                palette: '',
                framing: '',
                layout_tone: '',
            };

            let isValidCandidate = true;

            for (const axisName of AXIS_NAMES) {
                const pool = AXIS_POOLS[axisName];

                const eligibleValues = pool.filter((value) => {
                    if (relaxationLevel < 2) {
                        const used = usageCounts[axisName].get(value) ?? 0;
                        if (used >= budgetPerValue[axisName]) {
                            return false;
                        }
                    }
                    return true;
                });

                if (eligibleValues.length === 0) {
                    isValidCandidate = false;
                    break;
                }

                candidate[axisName] = eligibleValues[Math.floor(random() * eligibleValues.length)];
            }

            if (!isValidCandidate) {
                continue;
            }

            if (relaxationLevel === 0 && isPairBanned(candidate)) {
                continue;
            }

            if (usedComboKeys.has(comboToKey(candidate))) {
                continue; // 배치 내 중복은 최후의 제약 — 항상 유지
            }

            return candidate;
        }
    }

    throw new Error(`Failed to assign creative combination #${params.creativeIndex} after all relaxations.`);
}
