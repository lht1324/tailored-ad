import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { getServerEnv } from "@/lib/serverEnv";

/** 서버 전용 — 라우트 핸들러에서만 import (클라 번들에 PADDLE_API_KEY 노출 금지) */
let client: Paddle | null = null;

export type PaddleEnvironment = 'sandbox' | 'production';

/** 조용히 기본값 추론 금지 — 미설정이면 throw (잘못된 계정 과금 방지) */
export async function getPaddleEnvironment(): Promise<PaddleEnvironment> {
    const raw = (await getServerEnv('PADDLE_ENV'))
        ?? process.env.PADDLE_ENV
        ?? process.env.NEXT_PUBLIC_PADDLE_ENV;
    if (raw !== 'sandbox' && raw !== 'production') {
        throw new Error("PADDLE_ENV is not set (expected 'sandbox' or 'production').");
    }
    return raw;
}

export async function getPaddleClient(): Promise<Paddle> {
    if (!client) {
        const apiKey = await getServerEnv('PADDLE_API_KEY');
        if (!apiKey) {
            throw new Error("PADDLE_API_KEY is not configured.");
        }
        const environment = await getPaddleEnvironment();
        client = new Paddle(apiKey, {
            environment: environment === 'sandbox' ? Environment.sandbox : Environment.production,
        });
    }
    return client;
}
