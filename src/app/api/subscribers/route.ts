import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getNeonDb } from "@/lib/db/neon";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * 이메일 수집 (10-20) — 로그인 전 트래픽 확보. 공개 route.
 *
 * U만 세면 채널 성과가 안 보이므로 utm_source/utm_campaign 을 같이 저장한다.
 * 봇 방어: 허니팟(company) 필드가 채워지면 성공으로 응답하되 저장하지 않는다.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LEN = 200;

export async function POST(request: NextRequest) {
    let body: { email?: unknown; source?: unknown; company?: unknown; utm_source?: unknown; utm_campaign?: unknown };
    try {
        body = await request.json();
    } catch {
        return getNextBaseResponse({ success: false, status: 400, error: "Invalid request body." });
    }

    // 허니팟 — 사람이면 절대 안 채우는 필드. 채워졌으면 봇으로 간주하고 성공만 흉내냄.
    if (typeof body.company === 'string' && body.company.trim() !== '') {
        return getNextBaseResponse({ success: true, status: 200, message: "Subscribed." });
    }

    const email = typeof body.email === 'string' ? body.email.trim().slice(0, MAX_LEN).toLowerCase() : '';
    if (!EMAIL_RE.test(email)) {
        return getNextBaseResponse({ success: false, status: 400, error: "Invalid email address." });
    }

    const str = (v: unknown): string | null => {
        if (typeof v !== 'string') return null;
        const t = v.trim().slice(0, MAX_LEN);
        return t === '' ? null : t;
    };

    try {
        const db = await getNeonDb();
        const existing = await db.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.email, email)).limit(1);
        if (existing.length > 0) {
            // 이미 받음 — 중복 INSERT 막고 성공만 응답
            return getNextBaseResponse({ success: true, status: 200, message: "Already subscribed." });
        }
        await db.insert(subscribers).values({
            email,
            source: str(body.source) ?? 'landing',
            utm_source: str(body.utm_source),
            utm_campaign: str(body.utm_campaign),
        });
        return getNextBaseResponse({ success: true, status: 200, message: "Subscribed." });
    } catch (error) {
        console.error('[subscribers] insert failed:', error);
        return getNextBaseResponse({ success: false, status: 500, error: "Could not subscribe. Please try again." });
    }
}
