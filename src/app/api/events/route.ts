import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { getNeonDb } from "@/lib/db/neon";
import { adGenerationBatches } from "@/lib/db/schema";
import {
    batchStreamKey,
    latestStreamId,
    readStream,
    userStreamKey,
} from "@/lib/batchEvents";

/**
 * 배치 이벤트 SSE — GET /api/events?userId=&batchId=..&c={stream}|{id}
 * Upstash Streams를 1.5초 간격으로 읽어 중계 (REST는 SUBSCRIBE 불가).
 * ~30초 후 종료 → 클라 훅이 커서 포함 URL로 재연결. 인증은 쿠키 세션 + userId 일치.
 * batchId는 소유 검증 통과분만 구독 (타인 배치 엿보기 차단).
 */

const TICK_MS = 1500;
const MAX_TICKS = 20;
const TAKE = 20;

export async function GET(request: NextRequest) {
    const { user, isValidRequest } = await getIsValidRequestC2S();
    const params = request.nextUrl.searchParams;
    const userId = params.get('userId') ?? '';
    if (!isValidRequest || !user || user.id !== userId) {
        return new Response('Unauthorized', { status: 401 });
    }

    const db = await getNeonDb();
    const batchIds: string[] = [];
    for (const id of params.getAll('batchId')) {
        const rows = await db
            .select({ user_id: adGenerationBatches.user_id })
            .from(adGenerationBatches)
            .where(eq(adGenerationBatches.id, id))
            .limit(1);
        if (rows[0]?.user_id === userId) batchIds.push(id);
    }

    const streams = [userStreamKey(userId), ...batchIds.map(batchStreamKey)];
    const cursors = new Map<string, string>();
    for (const c of params.getAll('c')) {
        const sep = c.indexOf('|');
        if (sep > 0) cursors.set(c.slice(0, sep), c.slice(sep + 1));
    }
    for (const key of streams) {
        if (!cursors.has(key)) {
            cursors.set(key, (await latestStreamId(key)) ?? '0-0');
        }
    }

    const stream = new ReadableStream({
        async start(controller) {
            const enc = new TextEncoder();
            try {
                for (let tick = 0; tick < MAX_TICKS; tick++) {
                    if (request.signal.aborted) break;
                    for (const key of streams) {
                        // XRANGE 시작 커서는 inclusive라 커서 자신을 제외 (아니면 매 틱 중복 배달)
                        const cursor = cursors.get(key) ?? '0-0';
                        const entries = (await readStream(key, cursor, TAKE)).filter(
                            (entry) => entry.id !== cursor,
                        );
                        for (const entry of entries) {
                            cursors.set(key, entry.id);
                            controller.enqueue(
                                enc.encode(`id: ${key}|${entry.id}\ndata: ${JSON.stringify(entry.message)}\n\n`),
                            );
                        }
                    }
                    controller.enqueue(enc.encode(`: ping\n\n`));
                    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
                }
            } catch (error) {
                console.error('[api/events] stream error:', error);
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
