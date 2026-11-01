import DodoPayments from "dodopayments";
import { getServerEnv } from "@worker/lib/serverEnv";

/** 서버 전용 — 라우트 핸들러에서만 import (클라 번들에 DODO_PAYMENTS_API_KEY 노출 금지) */
let client: DodoPayments | null = null;

/**
 * Dodo 클라이언트.
 *
 * **10-31 변경**: `DODO_ENV`(Dodo 전용 변수) 폐기 → `ENVIRONMENT`(wrangler.jsonc vars).
 * 왜: SDK가 요구하는 건 결국 "dev냐 prod냐" 하나뿐이었다(`environment`는 base URL만 고른다).
 *     Dodo 전용 이름을 둘 이유가 없어 일반 이름으로 바꿨다.
 *     로컬은 `.dev.vars`의 `ENVIRONMENT=development`가 `wrangler.jsonc` 값을 덮어쓴다.
 *
 * ⚠️ 미설정 시 **test_mode로 떨어진다** (live로 새지 않는 방향).
 */
export async function getDodoClient(): Promise<DodoPayments> {
    const environment = (await getServerEnv("ENVIRONMENT")) === "production"
        ? "live_mode"
        : "test_mode";

    if (!client) {
        const apiKey = await getServerEnv("DODO_PAYMENTS_API_KEY");
        if (!apiKey) {
            throw new Error("DODO_PAYMENTS_API_KEY is not configured.");
        }
        client = new DodoPayments({ bearerToken: apiKey, environment });
    }
    return client;
}
