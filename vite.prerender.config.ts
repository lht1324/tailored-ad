import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * 프리렌더 전용 빌드 설정 — **SSR 번들**을 만든다.
 *
 * 왜 따로 두나:
 * - 메인 `vite.config.ts`는 Cloudflare 플러그인(workerd·assets)을 켠다. 그 환경에서
 *   `src/routes/publicRoutes.tsx`를 Node로 불러올 수 없다.
 * - 그래서 "Node에서 돌릴 수 있는 최소 설정"으로 한 번 더 빌드해 `dist/prerender/entry.js`를 만든다.
 *   그 파일을 `scripts/prerender.mjs`가 import 해 HTML을 굽는다.
 *
 * 산출물은 배포에 포함되지 않는다(`dist/prerender`는 dist 밖 경로로 둔다 → 아래 outDir).
 */
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@client": fileURLToPath(new URL("./lib/client", import.meta.url)),
            "@server": fileURLToPath(new URL("./lib/server", import.meta.url)),
            "@shared": fileURLToPath(new URL("./lib/shared", import.meta.url)),
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    build: {
        ssr: "src/prerender/entry.tsx",
        // dist/client 를 건드리지 않도록 밖에 만든다
        outDir: "dist-prerender",
        emptyOutDir: true,
        rollupOptions: {
            output: { entryFileNames: "entry.js" },
        },
    },
    // 컴포넌트가 process.env.NODE_ENV를 참조할 수 있다 (React 등)
    define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
});
