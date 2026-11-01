import { Route, Routes } from "react-router";
import StatusPage from "./components/page/status/StatusPage";
import NotFoundPage from "./components/page/not-found/NotFoundPage";

/**
 * 라우트 표.
 *
 * 지금은 확인용 두 개뿐이다 (`/`, 404). 실제 화면(랜딩·sign-in·create·projects·editor)은
 * 화면 이전 단계에서 이 표에 추가된다.
 *
 * ## 앞으로 지킬 것
 * - 보호된 화면(`/create`, `/projects`, `/profile`)은 **서버 가드**를 우선 고려한다.
 *   주소창 요청은 `Sec-Fetch-Mode: navigate`라 워커를 거치지 않고 assets로 가므로,
 *   서버에서 리다이렉트하려면 `wrangler.jsonc`의 `run_worker_first`에 그 경로를 넣어야 한다.
 *   (클라 가드만 두면 HTML이 먼저 보였다가 튕기는 깜빡임이 생긴다)
 */
export default function App() {
    return (
        <Routes>
            <Route path="/" element={<StatusPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
