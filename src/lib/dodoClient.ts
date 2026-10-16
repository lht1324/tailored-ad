import DodoPayments from "dodopayments";
import { getServerEnv } from "@/lib/serverEnv";

/** 서버 전용 — 라우트 핸들러에서만 import (클라 번들에 DODO_PAYMENTS_API_KEY 노출 금지) */
let client: DodoPayments | null = null;

/** 조용히 기본값 추론 금지 — 미설정이면 throw (잘못된 계정 과금 방지) */
export async function getDodoClient(): Promise<DodoPayments> {
    const rawEnv = await getServerEnv("DODO_ENV");
    if (rawEnv !== 'test' && rawEnv !== 'live') {
        throw new Error("DODO_ENV is not set (expected 'test' or 'live').");
    }
    const isLive = rawEnv === 'live';
    const environment = isLive ? 'live_mode' : 'test_mode'

    if (!client) {
        const apiKey = await getServerEnv('DODO_PAYMENTS_API_KEY');
        if (!apiKey) {
            throw new Error("DODO_PAYMENTS_API_KEY is not configured.");
        }
        client = new DodoPayments({ bearerToken: apiKey, environment: environment });
    }
    return client;
}
