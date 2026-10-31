import { useCallback, useEffect, useState } from "react";
import { authClient } from "./lib/auth/client";

/**
 * 스캐폴드 확인용 화면 (로그인 슬라이스).
 *
 * 목표: **로그인 → 세션 → 인증된 API 호출**이 한 줄로 이어지는지 눈으로 확인한다.
 *  - 세션이 없으면 Google 로그인 버튼만 보인다.
 *  - 세션이 생기면 이메일과 `GET /api/ad-generation-batches` 결과가 보인다.
 *    (이 호출이 성공하면 미들웨어 인증 + DB + 유저 행 생성까지 전부 통과한 것)
 *
 * ⚠️ 실제 화면(랜딩·Projects·Editor)은 포팅 단계에서 옮긴다. 여기 UI 문구는 영어.
 */

interface BatchesSummary {
    count: number;
    email: string;
    raw: string;
}

export default function App() {
    const [email, setEmail] = useState<string | null>(null);
    const [health, setHealth] = useState<string>("");
    const [batches, setBatches] = useState<BatchesSummary | null>(null);
    const [notice, setNotice] = useState<string>("Checking session…");
    const [busy, setBusy] = useState(false);

    const loadHealth = useCallback(async () => {
        try {
            const response = await fetch("/api/health");
            setHealth(JSON.stringify(await response.json()));
        } catch (error) {
            setHealth(`failed: ${String(error)}`);
        }
    }, []);

    const loadBatches = useCallback(async () => {
        try {
            const response = await fetch("/api/ad-generation-batches?limit=5");
            const json = (await response.json()) as {
                success: boolean;
                status: number;
                data?: { batches?: unknown[] };
                error?: string;
            };
            if (!response.ok || !json.success) {
                setBatches(null);
                setNotice(`API call failed: [${json.status}] ${json.error ?? response.statusText}`);
                return;
            }
            setBatches({
                count: json.data?.batches?.length ?? 0,
                email: email ?? "",
                raw: JSON.stringify(json, null, 2),
            });
            setNotice("Signed in. Authenticated API call succeeded.");
        } catch (error) {
            setBatches(null);
            setNotice(`API call failed: ${String(error)}`);
        }
    }, [email]);

    const refreshSession = useCallback(async () => {
        const { data } = await authClient.getSession();
        const sessionEmail = data?.user?.email ?? null;
        setEmail(sessionEmail);
        setNotice(sessionEmail ? "Signed in. Authenticated API call succeeded." : "Not signed in.");
    }, []);

    useEffect(() => {
        void loadHealth();
        void refreshSession();
    }, [loadHealth, refreshSession]);

    useEffect(() => {
        if (!email) {
            setBatches(null);
            return;
        }
        void loadBatches();
    }, [email, loadBatches]);

    const onSignIn = useCallback(async () => {
        setBusy(true);
        setNotice("Redirecting to Google…");
        // OAuth 귀환은 워커가 verifier를 세션 쿠키로 교환한 뒤 "/"로 되돌린다.
        // (페이지 요청은 워커에 도달하지 않으므로 콜백을 API 경로에 둔다 — `src/lib/auth/server.ts` 참고)
        const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: `${window.location.origin}/api/auth/callback`,
        });
        if (error) {
            setNotice(`Sign-in failed: ${error.message ?? String(error)}`);
            setBusy(false);
        }
        // 성공 시 브라우저가 리다이렉트되므로 아래 코드는 실행되지 않는다.
    }, []);

    const onSignOut = useCallback(async () => {
        setBusy(true);
        await authClient.signOut();
        setEmail(null);
        setBatches(null);
        setNotice("Signed out.");
        setBusy(false);
    }, []);

    return (
        <main style={{ fontFamily: "system-ui, sans-serif", padding: 32, lineHeight: 1.6, maxWidth: 880 }}>
            <h1 style={{ marginBottom: 4 }}>TailoredAd — Vite + Hono</h1>
            <p style={{ color: "#888", marginTop: 0 }}>Sign-in slice: session → authenticated API call.</p>

            <section style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 16 }}>Status</h2>
                <p style={{ margin: "4px 0", fontWeight: 600 }}>{notice}</p>
                <p style={{ margin: "4px 0", color: "#888" }}>
                    {email ? `Signed in as ${email}` : "No session"}
                </p>
                {email ? (
                    <button type="button" onClick={onSignOut} disabled={busy} style={{ marginTop: 8 }}>
                        Sign out
                    </button>
                ) : (
                    <button type="button" onClick={onSignIn} disabled={busy} style={{ marginTop: 8 }}>
                        Sign in with Google
                    </button>
                )}
            </section>

            <section style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 16 }}>GET /api/health</h2>
                <pre style={preStyle}>{health}</pre>
            </section>

            <section style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 16 }}>GET /api/ad-generation-batches</h2>
                {batches ? (
                    <>
                        <p style={{ margin: "4px 0" }}>{batches.count} batch(es) returned.</p>
                        <pre style={preStyle}>{batches.raw}</pre>
                    </>
                ) : (
                    <p style={{ color: "#888", margin: "4px 0" }}>Sign in to call this endpoint.</p>
                )}
            </section>
        </main>
    );
}

const preStyle = {
    background: "#f5f5f5",
    border: "1px solid #e5e5e5",
    borderRadius: 8,
    padding: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    fontSize: 12,
    maxHeight: 320,
    overflow: "auto",
} as const;
