import { Polar } from "@polar-sh/sdk";
import { getPolarEnvironment } from "@/lib/polar";
import { getServerEnv } from "@/lib/serverEnv";

/** 서버 전용 — 라우트 핸들러에서만 import (클라 번들에 POLAR_API_KEY 노출 금지) */
let client: Polar | null = null;

export async function getPolarClient(): Promise<Polar> {
    if (!client) {
        const accessToken = await getServerEnv('POLAR_API_KEY');
        if (!accessToken) {
            throw new Error("POLAR_API_KEY is not configured.");
        }
        client = new Polar({ server: getPolarEnvironment(), accessToken });
    }
    return client;
}
