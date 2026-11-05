import { Link } from "react-router";

/**
 * 404 화면 — 라우터가 매칭하지 못한 경로.
 *
 * ⚠️ 서버는 이 화면을 모른다. Cloudflare assets가 `index.html`을 돌려주고
 *    브라우저에서 라우터가 이 컴포넌트를 고른다 (`not_found_handling: single-page-application`).
 */
export default function NotFoundPage() {
    return (
        <main style={{ fontFamily: "system-ui, sans-serif", padding: 32, lineHeight: 1.6 }}>
            <h1 style={{ marginBottom: 4 }}>Page not found</h1>
            <p style={{ color: "#888", marginTop: 0 }}>The page you are looking for does not exist.</p>
            <p style={{ marginTop: 24 }}>
                <Link to="/">Back to home</Link>
            </p>
        </main>
    );
}
