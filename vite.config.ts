import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

/**
 * Vite + Cloudflare Workers (10-31 신규 스택).
 *
 * `vite dev` 하나로:
 *  - 클라(React SPA) → Vite dev server
 *  - 서버(워커, Hono) → **로컬 workerd** (prod와 같은 런타임·같은 제약)
 *
 * 그래서 Next에서 필요했던 것들이 전부 사라진다:
 *  - dev 서버 2개 (클라 3002 / 서버 3003)
 *  - distDir 분리 (.next / .next-dev / .next-docker) — 출력 폴더 충돌
 *  - CORS 설정 (같은 오리진)
 *  - "로컬은 되는데 prod만 죽는" 버그 (workerd가 로컬에서도 same-zone fetch를 막음)
 */
export default defineConfig({
    plugins: [
        react(),
        // Tailwind v4 — Vite 플러그인이 CSS를 처리한다 (postcss.config 불필요).
        // CSS 첫 줄의 `@import "tailwindcss";` 가 진입점이다.
        tailwindcss(),
        cloudflare({ viteEnvironment: { name: "worker" } }),
    ],
    environments: {
        worker: { build: { sourcemap: true } },
    },
    // 포트 고정 — TailoredAd = 3002 (ShortReal 3000/3001, LocalAgentsLink 3004/3005, jaeholee 3006/3007)
    // strictPort: 점유 시 조용히 다른 포트로 넘어가지 않고 **실패**한다(포트 착각 방지).
    server: {
        port: 3002,
        strictPort: true,
        // Cloudflare Tunnel로 접속할 때 Vite가 Host 헤더를 막지 않게 한다 (dev 전용 설정).
        allowedHosts: ["dev.tailoredad.com"],
    },
    preview: { port: 3002, strictPort: true },
    resolve: {
        alias: {
            // ⚠️ tsconfig.base.json의 `paths`와 **반드시 같아야 한다**. Vite는 tsconfig를 읽지 않으므로
            //    한쪽만 바꾸면 타입은 통과하고 런타임에서 모듈을 못 찾는다.
            // 첫 글자가 진영: @/ 클라 · @worker/ 서버 · @shared/ 공용
            "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
            "@worker": fileURLToPath(new URL("./worker", import.meta.url)),
            // 기존 코드가 쓰던 "@/..." 경로를 그대로 유지 (포팅 비용 절감).
            // fileURLToPath: `new URL(...).pathname`은 Windows에서 "/C:/..."가 되어 깨진다.
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
