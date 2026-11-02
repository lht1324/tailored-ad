import BlogPostPageClient from "./BlogPostPageClient";
import {
    buildArticleJsonLd,
    buildBreadcrumbJsonLd,
    buildFaqPageJsonLd,
} from "@shared/lib/content/blog/blogJsonLd";
import { blogContentServerAPI } from "@shared/lib/content/blog/blogContentServerAPI";
import type { BlogPostContent } from "@shared/lib/content/blog/types";

/**
 * 블로그 글 본문 — 화면 + 구조화 데이터(JSON-LD).
 *
 * 구 Next의 `app/blog/[slug]/page.tsx`가 하던 일(본문 + Article/Breadcrumb/FAQ JSON-LD)을
 * 한 컴포넌트로 합쳤다. 라우트 표(`publicRoutes`)가 슬러그별로 이걸 프리렌더한다.
 */
export default function BlogPostPage({ post }: { post: BlogPostContent }) {
    // 관련 글 — 레지스트리의 relatedSlugs를 실제 글로 해석 (없는 슬러그는 버린다)
    const relatedPosts = post.relatedSlugs
        .map((slug) => blogContentServerAPI.getBlogPostBySlug(slug))
        .filter((related): related is BlogPostContent => related !== null);

    return (
        <>
            <BlogPostPageClient post={post} relatedPosts={relatedPosts} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(post)) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(post)) }}
            />
            {post.faq.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqPageJsonLd(post.faq)) }}
                />
            )}
        </>
    );
}
