import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
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
 *
 * ⚠️ `AuthProvider`는 필수다. 랜딩 헤더·가격 섹션이 `useAuth()`를 부르는데,
 *    Provider가 없으면 그 훅이 throw해서 **화면 전체가 빈 채로 남는다**(에러 바운더리 없음).
 */
createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                {/* 구 layout.tsx의 래퍼를 그대로 옮긴 것.
                    `font-satoshi`가 없으면 body 규칙(Rajdhani 우선)이 적용돼 Next와 폰트가 달라진다. */}
                <div className="min-h-screen bg-canvas text-text1 font-satoshi">
                    <App />
                </div>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);
