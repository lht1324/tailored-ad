/**
 * 파이프라인 단계(step) 공통 타입.
 *
 * 설계 원칙 (`PIPELINE_ARCHITECTURE.md` §2 R4):
 * - step 함수는 HTTP를 모른다. `NextRequest`·`Response`·`cookies`를 import하지 않는다.
 * - 입력·출력은 plain object.
 * - 실패는 `StepError`를 throw 한다. **HTTP 상태코드는 여기 담지 않는다** —
 *   상태 매핑은 문(route)의 책임이고, 오케스트레이터는 code만 기록한다.
 */

/** 단계 실패 코드 — 로그·DB(last_error)·재시도 판단의 기준 */
export type StepCode =
    | 'BATCH_NOT_FOUND'
    | 'SPEC_NOT_FOUND'
    | 'PROMPT_LLM_FAILED'
    | 'STEP_INTERNAL_ERROR';

export class StepError extends Error {
    readonly code: StepCode;

    constructor(code: StepCode, message: string) {
        super(message);
        this.name = 'StepError';
        this.code = code;
    }
}
