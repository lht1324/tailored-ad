import { Redis } from "@upstash/redis/cloudflare";
import { getServerEnv } from "@/lib/serverEnv";

/**
 * 배치 이벤트 버스 — Supabase Realtime 대체 (Upstash Streams).
 * REST는 SUBSCRIBE가 안 돼서 Streams + `/api/events`(SSE) 조합으로 간다.
 * 쓰는 쪽(서버 API)이 기록 후 발행, 보는 쪽(클라 훅)이 SSE로 수신.
 * 발행 실패는 fail-soft (이벤트 유실이지 데이터 유실이 아님 — 폴백 재조회로 복구).
 * 서버 전용 (클라에서 import 금지 — 훅은 type만 import).
 */

/** SSE 이벤트 종류 */
export type BatchEventType = 'grants' | 'batches' | 'batch' | 'user';

export interface BatchEventMessage {
    type: BatchEventType;
    batchId?: string;
}

const STREAM_MAXLEN = 100;

let redis: Redis | null = null;
let warnedMissingKeys = false;

async function getRedis(): Promise<Redis | null> {
    if (redis) return redis;
    try {
        const url = await getServerEnv('UPSTASH_REDIS_REST_URL');
        const token = await getServerEnv('UPSTASH_REDIS_REST_TOKEN');
        if (!url || !token) {
            if (!warnedMissingKeys) {
                warnedMissingKeys = true;
                console.error("[batch-events] UPSTASH keys missing — events disabled (fail-soft).");
            }
            return null;
        }
        redis = new Redis({ url, token });
        return redis;
    } catch (error) {
        console.error("[batch-events] redis init failed (fail-soft):", error);
        return null;
    }
}

/** 유저 스트림 키 — grants·batches·user 이벤트 */
export function userStreamKey(userId: string): string {
    return `tailored-ad:user:${userId}`;
}

/** 배치 스트림 키 — batch 이벤트 (상세·에디터) */
export function batchStreamKey(batchId: string): string {
    return `tailored-ad:batch:${batchId}`;
}

async function add(key: string, message: BatchEventMessage): Promise<void> {
    const client = await getRedis();
    if (!client) return;
    await client.xadd(key, "*", { data: JSON.stringify(message) });
    await client.xtrim(key, { strategy: "MAXLEN", threshold: STREAM_MAXLEN });
}

/** 배치 쓰기 알림 — user 스트림(batches) + batch 스트림(batch) */
export async function publishBatchWrite(batchId: string, userId: string): Promise<void> {
    try {
        await add(batchStreamKey(batchId), { type: 'batch', batchId });
        await add(userStreamKey(userId), { type: 'batches', batchId });
    } catch (error) {
        console.error("[batch-events] publish failed (fail-soft):", error);
    }
}

/** 유저 스코프 알림 — grants(결제 적립) · batches(목록 갱신) · user(프로필 동기화) */
export async function publishUserEvent(
    userId: string,
    type: 'grants' | 'batches' | 'user',
    batchId?: string,
): Promise<void> {
    try {
        await add(userStreamKey(userId), batchId ? { type, batchId } : { type });
    } catch (error) {
        console.error("[batch-events] publish failed (fail-soft):", error);
    }
}

export interface StreamEntry {
    id: string;
    message: BatchEventMessage;
}

/** 스트림 읽기 — cursor exclusive (xrange는 '$'를 모르니 호출자가 최신 ID를 넘긴다) */
export async function readStream(key: string, cursor: string, take: number): Promise<StreamEntry[]> {
    const client = await getRedis();
    if (!client) return [];
    const raw: unknown = await client.xrange(key, cursor, '+', take);
    // Upstash는 Record(entryId → 필드)로 반환. 구버전 튜플 형태도 흡수.
    const pairs: Array<[string, unknown]> = Array.isArray(raw)
        ? raw.map((item) => [entryIdOf(item) ?? '', fieldsOf(item)])
        : Object.entries((raw ?? {}) as Record<string, unknown>);
    const entries: StreamEntry[] = [];
    for (const [id, fields] of pairs) {
        if (!id) continue;
        // Upstash REST는 필드값을 이미 객체로 파싱해서 줄 수 있다 (문자열·객체 양쪽 흡수)
        const rawData = (fields as Record<string, unknown> | null)?.data;
        try {
            const message = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) as BatchEventMessage;
            if (!message || typeof message.type !== 'string') continue;
            entries.push({ id, message });
        } catch {
            /* 깨진 엔트리 스킵 */
        }
    }
    return entries;
}

function entryIdOf(item: unknown): string | null {
    if (Array.isArray(item)) return String(item[0]);
    const id = (item as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
}

function fieldsOf(item: unknown): unknown {
    if (Array.isArray(item)) return item[1] ?? null;
    return (item as { message?: unknown }).message ?? null;
}

/** 스트림 최신 ID — 첫 연결 커서용 (없으면 null) */
export async function latestStreamId(key: string): Promise<string | null> {
    const client = await getRedis();
    if (!client) return null;
    const raw: unknown = await client.xrevrange(key, '+', '-', 1);
    if (Array.isArray(raw)) {
        const first = raw[0];
        if (Array.isArray(first)) return String(first[0]);
        const id = (first as { id?: unknown } | undefined)?.id;
        if (typeof id === 'string') return id;
        return null;
    }
    const ids = Object.keys((raw ?? {}) as Record<string, unknown>);
    return ids[0] ?? null;
}
