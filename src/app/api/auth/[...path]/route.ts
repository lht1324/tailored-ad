import { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

/**
 * Managed Auth 프록시 — `/api/auth/*`를 Neon Auth로 중계 (소셜 OAuth 포함).
 * 브라우저 클라이언트(authClient)는 이 동일 오리진 경로로만 통신한다.
 */
interface AuthRouteContext {
    params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, ctx: AuthRouteContext) {
    const { GET: handleGet } = (await getAuth()).handler();
    return handleGet(request, ctx);
}

export async function POST(request: NextRequest, ctx: AuthRouteContext) {
    const { POST: handlePost } = (await getAuth()).handler();
    return handlePost(request, ctx);
}
