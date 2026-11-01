/**
 * 프리렌더 — `dist/client/index.html`(Vite 산출물)을 **셸로 재사용**해
 * 공개 경로마다 실제 HTML 파일을 굽는다.
 *
 * ## 왜 이렇게 하나
 * Vite가 만든 index.html에는 해시가 붙은 JS/CSS 태그가 이미 들어 있다. 그걸 템플릿으로 쓰면
 * 자산 경로를 우리가 계산할 필요가 없다. 여기에 ①본문 HTML ②페이지별 meta만 끼워 넣는다.
 *
 * ## 파일 위치가 중요하다 (`html_handling: auto-trailing-slash`, Cloudflare 기본)
 * - `foo.html`       → `/foo` 로 서빙 (슬래시 없음)
 * - `foo/index.html` → `/foo/` 로 서빙 (슬래시 있음)
 * 우리 라우트는 슬래시 없는 형태(`/legal/terms`)이므로 **`<path>.html`** 로 쓴다.
 * `/` 는 index.html 자체를 덮어쓴다.
 *
 * ## 순서
 * 1) `vite build`                              → dist/client (셸 + 자산)
 * 2) `vite build -c vite.prerender.config.ts`   → dist-prerender/entry.js (renderToString 준비물)
 * 3) 이 스크립트                                → HTML 파일 생성
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_DIR = join(ROOT, "dist", "client");
const SHELL_PATH = join(CLIENT_DIR, "index.html");
const ENTRY_PATH = join(ROOT, "dist-prerender", "entry.js");

const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

/** PageMeta → `<head>` 태그들 */
function buildHeadTags(meta) {
    const tags = [`<title>${escapeHtml(meta.title)}</title>`];

    if (meta.description) {
        tags.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
    }
    if (meta.canonical) {
        tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
    }
    if (meta.robots) {
        const content = `${meta.robots.index ? "index" : "noindex"}, ${meta.robots.follow ? "follow" : "nofollow"}`;
        tags.push(`<meta name="robots" content="${content}" />`);
    }

    const og = meta.openGraph;
    if (og) {
        tags.push(`<meta property="og:type" content="${escapeHtml(og.type ?? "website")}" />`);
        tags.push(`<meta property="og:url" content="${escapeHtml(og.url)}" />`);
        tags.push(`<meta property="og:title" content="${escapeHtml(og.title)}" />`);
        tags.push(`<meta property="og:description" content="${escapeHtml(og.description)}" />`);
        if (og.siteName) {
            tags.push(`<meta property="og:site_name" content="${escapeHtml(og.siteName)}" />`);
        }
        if (og.image) {
            tags.push(`<meta property="og:image" content="${escapeHtml(og.image.url)}" />`);
            tags.push(`<meta property="og:image:width" content="${og.image.width}" />`);
            tags.push(`<meta property="og:image:height" content="${og.image.height}" />`);
            tags.push(`<meta property="og:image:alt" content="${escapeHtml(og.image.alt)}" />`);
        }
    }

    const twitter = meta.twitter;
    if (twitter) {
        tags.push(`<meta name="twitter:card" content="${escapeHtml(twitter.card)}" />`);
        tags.push(`<meta name="twitter:title" content="${escapeHtml(twitter.title)}" />`);
        tags.push(`<meta name="twitter:description" content="${escapeHtml(twitter.description)}" />`);
        if (twitter.image) {
            tags.push(`<meta name="twitter:image" content="${escapeHtml(twitter.image)}" />`);
        }
    }

    return tags.join("\n        ");
}

/** `/legal/terms` → `legal/terms.html` / `/` → `index.html` */
function outputPathFor(routePath) {
    const trimmed = routePath.replace(/^\/+|\/+$/g, "");
    return trimmed.length === 0 ? join(CLIENT_DIR, "index.html") : join(CLIENT_DIR, `${trimmed}.html`);
}

async function main() {
    const shell = await readFile(SHELL_PATH, "utf-8");
    const entry = await import(pathToFileURL(ENTRY_PATH).href);

    const paths = entry.PRERENDER_PATHS;
    if (!Array.isArray(paths) || paths.length === 0) {
        throw new Error("프리렌더할 경로가 없습니다 (PUBLIC_ROUTES 확인)");
    }

    // 셸이 가진 기본 title을 페이지별 title로 교체할 수 있게 원본을 잡아둔다
    const defaultTitle = /<title>[^<]*<\/title>/.exec(shell)?.[0];
    if (!defaultTitle) {
        throw new Error("셸 HTML에서 <title>을 찾지 못했습니다");
    }

    for (const routePath of paths) {
        const result = entry.renderPage(routePath);
        if (!result) {
            console.warn(`[prerender] 건너뜀 (라우트 없음): ${routePath}`);
            continue;
        }

        let html = shell
            .replace(defaultTitle, buildHeadTags(result.meta))
            .replace('<div id="root"></div>', `<div id="root">${result.html}</div>`);

        const target = outputPathFor(routePath);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, html, "utf-8");

        const kb = (Buffer.byteLength(html, "utf-8") / 1024).toFixed(1);
        console.log(`[prerender] ${routePath} → ${target.replace(ROOT + "/", "")} (${kb} KB)`);
    }

    console.log(`[prerender] 완료: ${paths.length}개 경로`);
}

main().catch((error) => {
    console.error("[prerender] 실패:", error);
    process.exit(1);
});
