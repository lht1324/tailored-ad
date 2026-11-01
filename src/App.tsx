import { Navigate, Route, Routes, useParams } from "react-router";
import { PUBLIC_ROUTES } from "./routes/publicRoutes";
import StatusPage from "./components/page/status/StatusPage";
import NotFoundPage from "./components/page/not-found/NotFoundPage";
import ProjectsPageClient from "./components/page/ad/projects/ProjectsPageClient";
import CreatePageClient from "./components/page/ad/create/CreatePageClient";
import ProjectDetailPageClient from "./components/page/ad/projects/[projectId]/ProjectDetailPageClient";
import SignInPageClient from "./components/page/sign-in/SignInPageClient";

/**
 * 라우트 표.
 *
 * ## 공개 페이지 (`src/routes/publicRoutes.tsx`)
 * 화면과 메타데이터를 한 표에 묶어 둔다. 그 표를 `<Routes>`로 펼치는 게 여기고,
 * **프리렌더 스크립트도 같은 표를 읽어** HTML을 굽는다 (둘이 어긋나지 않게).
 *
 * ## 보호 화면
 * `/create`·`/projects`·`/profile`·`/checkout/success`는 **서버(워커)가 먼저 막는다**
 * (`worker/pageGuard.ts` + `wrangler.jsonc`의 `run_worker_first`). 클라 가드를 겹쳐 두지 않는다.
 *
 * ## 경로 파라미터
 * 구 Next는 서버 컴포넌트가 `params`를 컴포넌트 prop으로 넘겼다. 여기서는 라우터가 준
 * `useParams()`를 **얇은 래퍼**에서 꺼내 prop으로 넘긴다 (컴포넌트는 Next 시절 그대로 유지).
 */

/** `/projects/:projectId` → `ProjectDetailPageClient projectId=...` */
function ProjectDetailRoute() {
    const { projectId } = useParams();
    if (!projectId) return <NotFoundPage />;
    return <ProjectDetailPageClient projectId={projectId} />;
}

export default function App() {
    return (
        <Routes>
            {PUBLIC_ROUTES.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
            ))}

            {/* /legal 은 /legal/terms 로 (구 Next 페이지와 동일 동작) */}
            <Route path="/legal" element={<Navigate to="/legal/terms" replace />} />

            {/* 이관 확인용 — 로그인·세션·배치 목록 호출 */}
            <Route path="/dev/status" element={<StatusPage />} />

            {/* 로그인 — 세션 이후 목적지는 `?redirectTo=`로 넘긴다.
                OAuth 귀환은 워커(`/api/auth/callback`)가 처리하고, 끝나면 redirectTo로 돌려보낸다. */}
            <Route path="/sign-in" element={<SignInPageClient />} />

            {/* 보호 화면 — 서버(워커)가 비로그인을 먼저 막는다. */}
            <Route path="/projects" element={<ProjectsPageClient />} />
            <Route path="/projects/:projectId" element={<ProjectDetailRoute />} />
            <Route path="/create" element={<CreatePageClient />} />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
