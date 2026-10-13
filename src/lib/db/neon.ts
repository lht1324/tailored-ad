import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { requireServerEnv } from "@/lib/serverEnv";
import * as schema from "@/lib/db/schema";

/**
 * Neon 서버 전용 싱글톤 — neon-http(fetch 기반)라 Workers·Node(dev/docker) 양쪽 동작.
 * 읽는 값은 NEON_DATABASE_URL (development pooled). UNPOOLED는 drizzle-kit용이라 코드에서 안 씀.
 * 클라 번들에서는 호출 금지 (서버 전용).
 */
let cachedDb: NeonHttpDatabase<typeof schema> | null = null;

export async function getNeonDb(): Promise<NeonHttpDatabase<typeof schema>> {
    if (!cachedDb) {
        cachedDb = drizzle(neon(await requireServerEnv("NEON_DATABASE_URL")), { schema });
    }
    return cachedDb;
}

/** 유니크 위반(23505) 판정 — 웹훅 재시도 흡수용 (record* 계열이 'duplicate'로 반환) */
export function isNeonUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: unknown }).code === "23505"
    );
}

/** 에러 메시지 추출 (throw 메시지 조립용) */
export function neonErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
