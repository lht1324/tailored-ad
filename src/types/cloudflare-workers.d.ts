/**
 * `cloudflare:workers` 런타임 타입 — **최소 선언** (수기).
 *
 * 왜 직접 선언하나:
 * - `wrangler types --include-runtime true`는 런타임 전역(Request/Response 등)을 덮어써
 *   기존 코드 84곳을 깨뜨린다(10-31 실측: `request.json()`이 unknown이 됨).
 * - 그래서 env 타입만 생성(`--include-runtime false`)하고, 워크플로에서 실제로 쓰는
 *   API만 여기서 선언한다.
 *
 * ⚠️ 여기 없는 API를 쓰려면 **이 파일에 추가**할 것 (임의 캐스팅 금지).
 * 공식 타입이 필요해지면 `@cloudflare/workers-types` 도입을 검토한다.
 */

declare module "cloudflare:workers" {
    /** 워크플로 인스턴스에 전달되는 이벤트 */
    export interface WorkflowEvent<T = unknown> {
        readonly payload: T;
        readonly instanceId: string;
        readonly timestamp: Date;
    }

    /** step.do 의 재시도/타임아웃 설정 */
    export interface WorkflowStepConfig {
        retries?: {
            limit: number;
            delay?: string | number;
            backoff?: "constant" | "linear" | "exponential";
        };
        /** 예: "30 seconds" | "15 minutes" */
        timeout?: string;
    }

    /** 단계 실행기 */
    export interface WorkflowStep {
        do<T>(
            name: string,
            callback: () => Promise<T> | T,
        ): Promise<T>;
        do<T>(
            name: string,
            config: WorkflowStepConfig,
            callback: () => Promise<T> | T,
        ): Promise<T>;
        sleep(name: string, duration: string | number): Promise<void>;
        sleepUntil(name: string, timestamp: Date | number): Promise<void>;
        waitForEvent<T = unknown>(
            name: string,
            options: { type: string; timeout?: string | number },
        ): Promise<WorkflowEvent<T>>;
    }

    /** 오케스트레이터가 상속하는 기반 클래스 */
    export abstract class WorkflowEntrypoint<Env = unknown, Params = unknown> {
        protected readonly env: Env;
        protected readonly ctx: unknown;
        abstract run(
            event: WorkflowEvent<Params>,
            step: WorkflowStep,
        ): Promise<unknown>;
    }
}
