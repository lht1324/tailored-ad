import {jsonrepair} from "jsonrepair";

export function cleanAndParseJSON(text: string) {
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
        return JSON.parse(text);
    } catch (e) {
        // 실패하면 다음 단계로
    }

    // 3. 2차 시도: jsonrepair를 믿어본다
    try {
        const repaired = jsonrepair(text);
        return JSON.parse(repaired);
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
                return JSON.parse(repaired);
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