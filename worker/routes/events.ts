import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getNeonDb } from "@server/db/neon";
import { adGenerationBatches } from "@server/db/schema";
import {
    batchStreamKey,
    latestStreamId,
    readStream,
    userStreamKey,
} from "@server/batchEvents";
import type { AppEnv } from "../env";
import type { AuthVariables } from "../middleware/auth";

/**
 * 배치 이벤트 SSE — `GET /api/events`
 *
 * 화면이 "생성 중…" 진행 상황을 실시간으로 받는 통로다.
 * Upstash REST는 SUBSCRIBE가 안 되므로 **Streams를 5초마다 폴링해서 SSE로 중계**한다.
 *
 * ## 동작
 * 1. 유저 스트림 + 소유권이 확인된 배치 스트림만 구독한다
 * 2. 20틱(≈100초) 후 스트림을 닫는다 → 클라 훅이 **커서를 붙여 재연결**한다
 * 3. 커서(`c={stream}|{id}`)가 있으면 이어서, 없으면 최신부터
 *
 * 5초인 이유: 1.5초는 Upstash 호출만 3배가 되고(배치 자체가 수십 초~분) 체감 차이가 없다.
 * 10초는 결제 직후 적립 반영이 늦어 사람이 새로고침을 두 번 하는 구간이라 기각.
 *
 * ⚠️ 구독 대상은 **본인 배치만** — batchId는 DB로 소유권을 확인한 뒤에만 스트림 키로 쓴다.
 */
const eventsRoutes = new Hono<{ Bindings: AppEnv; Variables: AuthVariables }>();

const TICK_MS = 5000;
const MAX_TICKS = 20;
const TAKE = 20;

eventsRoutes.get("/events", async (context) => {
    const userId = context.get("user").id;
    const rawBatchIds = context.req.queries("batchId") ?? [];

    const db = await getNeonDb();
    const batchIds: string[] = [];
    for (const batchId of rawBatchIds) {
        const rows = await db
            .select({ user_id: adGenerationBatches.user_id })
            .from(adGenerationBatches)
            .where(eq(adGenerationBatches.id, batchId))
            .limit(1);
        if (rows[0]?.user_id === userId) batchIds.push(batchId);
    }

    const streams = [userStreamKey(userId), ...batchIds.map(batchStreamKey)];

    const cursors = new Map<string, string>();
    for (const cursor of context.req.queries("c") ?? []) {
        const separator = cursor.indexOf("|");
        if (separator > 0) cursors.set(cursor.slice(0, separator), cursor.slice(separator + 1));
    }
    for (const key of streams) {
        if (!cursors.has(key)) {
            cursors.set(key, (await latestStreamId(key)) ?? "0-0");
        }
    }

    const abortSignal = context.req.raw.signal;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for (let tick = 0; tick < MAX_TICKS; tick++) {
                    if (abortSignal.aborted) break;

                    for (const key of streams) {
                        // XRANGE 시작 커서는 inclusive라 커서 자신을 제외한다 (아니면 매 틱 중복 배달)
                        const cursor = cursors.get(key) ?? "0-0";
                        const entries = (await readStream(key, cursor, TAKE)).filter(
                            (entry) => entry.id !== cursor,
                        );
                        for (const entry of entries) {
                            cursors.set(key, entry.id);
                            controller.enqueue(
                                encoder.encode(`id: ${key}|${entry.id}\ndata: ${JSON.stringify(entry.message)}\n\n`),
                            );
                        }
                    }

                    controller.enqueue(encoder.encode(`: ping\n\n`));
                    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
                }
            } catch (error) {
                console.error("[api/events] stream error:", error);
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
});

export default eventsRoutes;
