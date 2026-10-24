import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * 증분 캐시 = Workers 정적 에셋 (10-25).
 *
 * 기본 더미 캐시에서는 ●(SSG) 라우트를 서빙 못 해 /blog/[slug]가 404가 됐다
 * (/blog 같은 ○ 정적은 에셋이라 멀쩡 — 그래서 목록만 열리고 본문이 404였음).
 *
 * static-assets 오버라이드: 빌드가 .open-next/cache → assets/cdn-cgi/_next_cache로 복사하고
 * 워커가 ASSETS 바인딩으로 읽는다. R2·KV 버킷 불필요.
 * 제약: 읽기 전용 — revalidate/ISR을 쓰지 않는 앱 전용. 우리 코드에 revalidate 0건 확인됨.
 */
export default defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
});
