/**
 * 창작 프롬프트 LLM의 **strict 출력 스키마**.
 *
 * 왜 필요한가: `response_format: json_object`는 "유효한 JSON"만 보장하고 **키 이름은 보장하지 않는다.**
 * 실제로 `{":headline": "..."}`가 3배치 중 2~3배치 나와 `copy.headline`이 유실됐다.
 * `json_schema` + `strict`는 제공자가 지원하면 키·타입까지 강제한다.
 *
 * strict 제약 (OpenAI/OpenRouter 공통):
 *  - 모든 프로퍼티가 `required`에 있어야 한다 (optional은 `["string","null"]`로 표현)
 *  - `additionalProperties: false` 필수
 *  - 동적 키(예: `{"<aspect_ratio>": "..."}`)는 쓸 수 없다 → `ratio_reasoning` 문자열로 단일화
 *
 * 프롬프트(`POST_AD_CREATIVE_PROMPT.ts`)의 `<output_schema>`와 반드시 일치해야 한다.
 */
export const CREATIVE_OUTPUT_SCHEMA = {
    name: 'creative_output',
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            reasoning: {
                type: 'string',
                description: 'Why this creative concept was chosen and which headline framework was used. 25-45 words.',
            },
            ratio_reasoning: {
                type: 'string',
                description: 'One sentence: why this composition works for the requested canvas. 15-25 words.',
            },
            relationship: {
                type: 'string',
                enum: ['worn', 'held', 'using', 'placed', 'none'],
                description: 'How the product is used. worn = on the body; held = in hand; using = in action; placed = no person; none = no product.',
            },
            creative_prompt: {
                type: 'string',
                description: 'One single-sentence I2I prompt with the ratio token, negative space, materials and light physics.',
            },
            copy: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    headline: {
                        type: 'string',
                        description: '3-8 word English headline, no trailing period.',
                    },
                    cta: {
                        type: ['string', 'null'],
                        description: 'One of the whitelist CTAs, or null when cta_enabled is false.',
                    },
                    fontFamily: {
                        type: 'string',
                        description: 'One font from available_fonts, verbatim.',
                    },
                    fontWeight: {
                        type: 'integer',
                        description: 'A weight supported by the chosen font.',
                    },
                    headlineColor: {
                        type: 'string',
                        enum: ['white', 'black'],
                        description: 'Contrast choice against the reserved negative space.',
                    },
                },
                required: ['headline', 'cta', 'fontFamily', 'fontWeight', 'headlineColor'],
            },
        },
        required: ['reasoning', 'ratio_reasoning', 'relationship', 'creative_prompt', 'copy'],
    },
} as const;
