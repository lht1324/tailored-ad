import BlogPostPageClient from "@/components/page/blog/BlogPostPageClient";
import { blogContentServerAPI } from "@/lib/content/blog/blogContentServerAPI";
import type { BlogPostContent } from "@/lib/content/blog/types";

/**
 * 블로그 본문 서버 래퍼 — page.tsx([slug])가 데이터를 받아 여기로 전달한다.
 * 지금은 전달만 하지만, 서버 전용 로직(캐시·재검증 등)이 필요해지면 이 층에서 처리한다.
 * (기존 legal/LegalPageServer와 같은 ~PageServer 관례를 따른다.)
 */
export default function BlogPostPageServer({ post }: { post: BlogPostContent }) {
    const relatedPosts = post.relatedSlugs
        .map((slug) => blogContentServerAPI.getBlogPostBySlug(slug))
        .filter((related): related is BlogPostContent => related !== null);

    return <BlogPostPageClient post={post} relatedPosts={relatedPosts} />;
}
