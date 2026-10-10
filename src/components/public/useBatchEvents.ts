'use client';

import { useEffect, useRef } from 'react';
import type { BatchEventMessage } from "@/lib/batchEvents";

interface UseBatchEventsOptions {
    userId: string | null | undefined;
    batchIds?: string[];
    /** false면 미구독 (상세·에디터의 status==='ready' 게이트용) */
    enabled?: boolean;
    onEvent: (event: BatchEventMessage) => void;
}

/**
 * Upstash SSE 구독 훅 — Supabase Realtime channel() 대체.
 * EventSource 자동 재연결은 URL이 고정이라 커서가 갱신 안 돼서,
 * 에러 시 직접 재생성 (최신 커서 포함). 클라 공용이라 components/public에 둠.
 */
export function useBatchEvents({ userId, batchIds = [], enabled = true, onEvent }: UseBatchEventsOptions): void {
    const onEventRef = useRef(onEvent);
    useEffect(() => {
        onEventRef.current = onEvent;
    });
    const cursorsRef = useRef(new Map<string, string>());
    const batchKey = [...batchIds].sort().join(',');

    useEffect(() => {
        if (!enabled || !userId) return;
        let closed = false;
        let es: EventSource | null = null;
        let retry: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            if (closed) return;
            const params = new URLSearchParams({ userId });
            for (const id of batchIds) params.append('batchId', id);
            cursorsRef.current.forEach((entryId, stream) => params.append('c', `${stream}|${entryId}`));
            es = new EventSource(`/api/events?${params.toString()}`);
            es.onmessage = (ev: MessageEvent) => {
                const lastId = ev.lastEventId;
                if (lastId) {
                    const sep = lastId.indexOf('|');
                    if (sep > 0) cursorsRef.current.set(lastId.slice(0, sep), lastId.slice(sep + 1));
                }
                try {
                    onEventRef.current(JSON.parse(ev.data) as BatchEventMessage);
                } catch {
                    /* 파싱 실패 무시 */
                }
            };
            es.onerror = () => {
                es?.close();
                es = null;
                if (!closed) retry = setTimeout(connect, 2000);
            };
        };
        connect();
        return () => {
            closed = true;
            if (retry) clearTimeout(retry);
            es?.close();
        };
        // batchIds는 batchKey 문자열로 구독 (배열 identity 무시)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, batchKey, enabled]);
}
