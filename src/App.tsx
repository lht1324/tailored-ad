import { Route, Routes } from "react-router";
import LandingPage from "./components/page/ad/landing/LandingPage";
import StatusPage from "./components/page/status/StatusPage";
import NotFoundPage from "./components/page/not-found/NotFoundPage";

/**
 * 라우트 표.
 *
 * | 경로 | 화면 | SEO |
 * |---|---|---|
 * | `/` | 랜딩 | ✅ 프리렌더 대상 |
 * | `/dev/status` | 이관 확인용 (로그인·세션·배치) | — |
 *
 * 앞으로 추가될 것: `/legal/*`, `/blog`, `/blog/:slug`(프리렌더) · `/sign-in` · `/create` ·
 * `/projects` · `/projects/:id` · `/projects/:id/edit` · `/profile` · `/checkout/success`
 *
 * ## 보호 화면 가드
 * `/create`·`/projects`·`/profile`·`/checkout/success`는 **서버(워커)가 먼저 막는다**
 * (`worker/pageGuard.ts` + `wrangler.jsonc`의 `run_worker_first`). 클라 가드를 겹쳐 두지 않는다.
 */
export default function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dev/status" element={<StatusPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
