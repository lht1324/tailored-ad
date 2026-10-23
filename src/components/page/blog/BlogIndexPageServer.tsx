import BlogIndexPageClient from "@/components/page/blog/BlogIndexPageClient";
import { blogContentServerAPI } from "@/lib/content/blog/blogContentServerAPI";

/**
 * /blog 서버 래퍼 — 레지스트리에서 글 목록을 읽어 클라이언트 템플릿으로 전달한다.
 * (기존 legal/LegalPageServer와 같은 ~PageServer 관례를 따른다.)
 */
export default function BlogIndexPageServer() {
    const posts = blogContentServerAPI.listBlogPosts();
    return <BlogIndexPageClient posts={posts} />;
}
