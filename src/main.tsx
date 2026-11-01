import { BrowserRouter } from "react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * 클라 진입점.
 *
 * Vite + Hono 구조에서는 **페이지 요청도 결국 이 파일**로 온다:
 *   1) 주소창 요청 → Cloudflare assets가 index.html 반환 (`not_found_handling: single-page-application`)
 *   2) index.html이 이 스크립트를 로드
 *   3) BrowserRouter가 URL을 읽어 화면을 고른다
 *
 * ⚠️ 그래서 **서버가 HTML을 만들지 않는다.** SEO가 필요한 페이지(블로그·약관)는
 *    별도 정적 프리렌더로 처리해야 한다 (계획: 빌드 타임 프리렌더).
 */
createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
);
