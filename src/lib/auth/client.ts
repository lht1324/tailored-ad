'use client';

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Neon Auth 브라우저 클라이언트 — 인자 없음, 동일 오리진 `/api/auth` 프록시로 통신.
 * 세션 구독은 AuthContext가 `authClient.useSession()`으로 한다.
 */
export const authClient = createAuthClient();
