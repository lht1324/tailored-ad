import {jsonrepair} from "jsonrepair";

/**
 * LLM이 키 앞에 붙이는 콜론/공백 제거 — `":headline"` → `"headline"`.
 *
 * 왜 필요한가: `response_format: json_object`는 **문법만** 보장하고 키 이름은 보장하지 않는다.
 * `{":headline": "..."}`는 완벽히 유효한 JSON이라 파서가 통과시키고, 우리 코드는 그대로 저장한다.
 * GLM 계열이 스키마 블록을 `라벨: 값`으로 해석해 콜론을 붙이는 습성이 있어 방어가 필요하다.
 */
function normalizeJsonKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(normalizeJsonKeys);
    }
    if (value && typeof value === 'object') {
        const normalized: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            normalized[key.replace(/^[\s:：]+/, '')] = normalizeJsonKeys(entry);
        }
        return normalized;
    }
    return value;
}

// 반환은 호출부에서 타입을 선언해 좁힌다 (파서 유틸이라 any 유지)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanAndParseJSON(text: string): any {
    // 1. 마크다운 코드 블록 추출 시도
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
        text = jsonBlockMatch[1]; // [수정됨] 올바른 배열 접근
    } else {
        // 코드 블록이 없으면 백틱만이라도 제거
        text = text.replace(/```json/g, '').replace(/```/g, '');
    }

    text = text.trim();

    // 2. 1차 시도: 그냥 파싱해본다 (가장 빠름)
    try {
        return normalizeJsonKeys(JSON.parse(text));
    } catch (e) {
        // 실패하면 다음 단계로
    }

    // 3. 2차 시도: jsonrepair를 믿어본다
    try {
        const repaired = jsonrepair(text);
        return normalizeJsonKeys(JSON.parse(repaired));
    } catch (e) {
        // 실패 시 다음 단계로
    }

    // 4. 3차 시도: "가장 마지막" JSON 블록 추출 로직
    let end = text.lastIndexOf('}');
    while (end !== -1) {
        let start = text.lastIndexOf('{', end);
        while (start !== -1) {
            const potentialJSON = text.substring(start, end + 1);
            try {
                const repaired = jsonrepair(potentialJSON);
                return normalizeJsonKeys(JSON.parse(repaired));
            } catch (e) {
                // 더 넓은 범위 탐색
                start = text.lastIndexOf('{', start - 1);
            }
        }
        // 더 앞쪽의 닫는 괄호 탐색
        end = text.lastIndexOf('}', end - 1);
    }

    throw new Error("Failed to extract valid JSON even with jsonrepair");
}