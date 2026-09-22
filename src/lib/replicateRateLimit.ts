import { Redis } from "@upstash/redis/cloudflare";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Replicate prediction 제출 스로틀 — Replicate 429(분당 600건 생성 제한)를 맞기 전에
 * 우리 쪽에서 분당 500건으로 묶는다. Workers·로컬 Node 양쪽에서 동작 (HTTP 기반).
 *
 * - 체크는 요청 "전", 체크+차감은 원자 연산 (읽고-쓰기 레이스 없음).
 * - 용량 없으면 최대 HOLD_TIMEOUT_MS까지 붙잡고(서버리스 함수 자체가 대기),
 *   그래도 안 되면 에러를 내서 눈에 보이게 한다 (조용히 버리지 않음).
 * - Redis 키가 없거나 장애면 fail-open: 막지 않고 경고만 남긴다.
 *   (리미터 때문에 제품이 서면 안 됨)
 */

const WINDOW_LIMIT = 500;
const WINDOW = "60 s";
const HOLD_TIMEOUT_MS = 10_000;

let limiter: Ratelimit | null = null;
let warnedMissingKeys = false;

function getLimiter(): Ratelimit | null {
    try {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url || !token) {
            if (!warnedMissingKeys) {
                warnedMissingKeys = true;
                console.error("[replicate-ratelimit] UPSTASH_REDIS_REST_URL/TOKEN missing — throttle disabled (fail-open).");
            }
            return null;
        }
        if (!limiter) {
            limiter = new Ratelimit({
                redis: new Redis({ url, token }),
                limiter: Ratelimit.slidingWindow(WINDOW_LIMIT, WINDOW),
                prefix: "tailored-ad:replicate",
            });
        }
        return limiter;
    } catch (error) {
        console.error("[replicate-ratelimit] limiter init failed — fail-open:", error);
        return null;
    }
}

/**
 * prediction 1건당 슬롯 1개 확보. 용량이 날 때까지 최대 10초 대기한다.
 * @throws 용량이 안 나면 에러 (호출자가 타일 error 마킹 등 가시화 처리)
 */
export async function acquireReplicateSlot(): Promise<void> {
    const rateLimiter = getLimiter();
    if (!rateLimiter) return;

    let result: { success: boolean };
    try {
        result = await rateLimiter.blockUntilReady("predictions", HOLD_TIMEOUT_MS);
    } catch (error) {
        console.error("[replicate-ratelimit] limiter error — fail-open:", error);
        return;
    }

    if (!result.success) {
        throw new Error(`Replicate rate limit: no submission slot within ${HOLD_TIMEOUT_MS}ms.`);
    }
}
