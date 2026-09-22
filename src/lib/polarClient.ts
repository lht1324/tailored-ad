import { Polar } from "@polar-sh/sdk";
import { getPolarEnvironment } from "@/lib/polar";

/** 서버 전용 — 라우트 핸들러에서만 import (클라 번들에 POLAR_API_KEY 노출 금지) */
let client: Polar | null = null;

export function getPolarClient(): Polar {
    if (!client) {
        const accessToken = process.env.POLAR_API_KEY;
        if (!accessToken) {
            throw new Error("POLAR_API_KEY is not configured.");
        }
        client = new Polar({ server: getPolarEnvironment(), accessToken });
    }
    return client;
}
