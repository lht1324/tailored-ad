import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostPageServer from "@/components/page/blog/BlogPostPageServer";
import { blogContentServerAPI } from "@/lib/content/blog/blogContentServerAPI";
import {
    buildArticleJsonLd,
    buildBreadcrumbJsonLd,
    buildFaqPageJsonLd,
} from "@/lib/content/blog/blogJsonLd";

/**
 * /blog/[slug] 본문 틀 — 콘텐츠 레지스트리에서 슬러그를 읽어 빌드 타임에 전부 SSG한다.
 * 새 글은 src/lib/content/blog/posts/ 파일 1개로 추가되고, 이 파일은 수정되지 않는다.
 *
 * dynamicParams=false — 레지스트리에 없는 슬러그는 런타임 생성 없이 즉시 404.
 * (글 추가는 레지스트리 수정으로만 — URL이 통제 밖에서 생기는 걸 막는다.)
 */
export const dynamicParams = false;

export function generateStaticParams() {
    return blogContentServerAPI.listBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const post = blogContentServerAPI.getBlogPostBySlug(slug);
    if (!post) {
        return {};
    }

    const url = `https://tailoredad.com/blog/${post.slug}`;
    return {
        title: post.metaTitle,
        description: post.metaDescription,
        alternates: {
            canonical: url,
        },
        openGraph: {
            type: "article",
            url,
            title: post.metaTitle,
            description: post.metaDescription,
            siteName: "TailoredAd",
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt,
        },
        twitter: {
            card: "summary_large_image",
            title: post.metaTitle,
            description: post.metaDescription,
        },
    };
}

export default async function BlogPostPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const post = blogContentServerAPI.getBlogPostBySlug(slug);
    if (!post) {
        notFound();
    }

    return (
        <>
            <BlogPostPageServer post={post} />
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
