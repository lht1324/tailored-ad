import type { MetadataRoute } from "next";
import { blogContentServerAPI } from "@/lib/content/blog/blogContentServerAPI";

/**
 * sitemap 자동 생성 — 정적 라우트 + 블로그 레지스트리.
 * 기존 public/sitemap.xml(수동 파일)을 대체한다. 글 추가 시 이 파일도 수정 불필요.
 */
const SITE_URL = "https://tailoredad.com";

export default function sitemap(): MetadataRoute.Sitemap {
    const staticEntries: MetadataRoute.Sitemap = [
        { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
        { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
        { url: `${SITE_URL}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/legal/refunds`, changeFrequency: "yearly", priority: 0.3 },
    ];

    const blogEntries: MetadataRoute.Sitemap = blogContentServerAPI.listBlogPosts().map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: "monthly",
        priority: 0.8,
    }));

    return [...staticEntries, ...blogEntries];
}
