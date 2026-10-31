import { useEffect, useState } from "react";

/**
 * 스캐폴드 확인용 화면.
 *  - 클라(React)와 워커(Hono)가 **같은 오리진**으로 붙는지 확인한다.
 *  - 실제 화면(랜딩·Projects·Editor)은 포팅 단계에서 옮긴다.
 */
export default function App() {
    const [health, setHealth] = useState<string>("확인 중…");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/health")
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled) setHealth(JSON.stringify(json));
            })
            .catch((error) => {
                if (!cancelled) setHealth(`실패: ${String(error)}`);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main style={{ fontFamily: "system-ui, sans-serif", padding: 32, lineHeight: 1.6 }}>
            <h1 style={{ marginBottom: 8 }}>TailoredAd — Vite + Hono 스캐폴드</h1>
            <p style={{ color: "#666", marginTop: 0 }}>
                워커가 로컬 workerd에서 돌고, 클라가 같은 오리진으로 붙는지 확인하는 화면입니다.
            </p>
            <section style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 16 }}>GET /api/health</h2>
                <pre
                    style={{
                        background: "#f5f5f5",
                        border: "1px solid #e5e5e5",
                        borderRadius: 8,
                        padding: 12,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                    }}
                >
                    {health}
                </pre>
            </section>
        </main>
    );
}
