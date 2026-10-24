'use client'

import Link from 'next/link';
import AdFooter from "@/components/page/ad/public/AdFooter";
import ThemeToggle from "@/components/page/ad/public/ThemeToggle";
import Reveal from "@/components/page/ad/Reveal";
import BrandMark from "@/components/public/BrandMark";
import { formatBlogDate } from "@/lib/content/blog/formatBlogDate";
import type { BlogPostContent, BlogPostKind } from "@/lib/content/blog/types";

/**
 * /blog 목록 — 블로그 대문. 우산 경로의 리스트 페이지.
 * 카드 묶음은 kind로 고정 순서 섹션을 나눈다 (URL 중간 폴더 없이 섹션으로 구분).
 */

const KIND_ORDER: BlogPostKind[] = ['comparison', 'industry', 'list'];

const KIND_LABELS: Record<BlogPostKind, string> = {
    comparison: 'Alternatives & comparisons',
    industry: 'By industry',
    list: 'Guides & lists',
};

function BlogHeader() {
    return (
        <header className="border-b border-hairline px-4 py-4">
            <nav className="mx-auto flex max-w-6xl items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                    <BrandMark size={24} />
                    <span className="text-[16px] font-bold tracking-tight text-text1">TailoredAd</span>
                </Link>
                <Link
                    href="/create"
                    className="rounded-full bg-text1 px-4 py-2 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    Start creating
                </Link>
            </nav>
        </header>
    );
}

export default function BlogIndexPageClient({ posts }: { posts: BlogPostContent[] }) {
    const groups = groupPostsByKind(posts);

    return (
        <>
            <BlogHeader />
            <main className="px-4 pb-24 pt-14 md:pt-20">
                <div className="mx-auto max-w-3xl">
                    <Reveal>
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">TailoredAd Blog</p>
                        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                            Comparisons &amp; guides for AI ad creative.
                        </h1>
                        <p className="mt-5 text-[17px] leading-relaxed text-text2">
                            Side-by-side comparisons of AI ad tools, with prices checked on the date each post was published. Some tools win. Some do not.
                        </p>
                    </Reveal>

                    {groups.map((group, groupIndex) => (
                        <section key={group.kind} className="mt-14">
                            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">{KIND_LABELS[group.kind]}</h2>
                            <div className="mt-5 space-y-4">
                                {group.posts.map((post, index) => (
                                    <Reveal key={post.slug} delay={0.04 * (groupIndex + index)}>
                                        <Link
                                            href={`/blog/${post.slug}`}
                                            className="block rounded-[1.25rem] border border-hairline bg-surface p-7 transition-colors duration-200 hover:border-accent/50"
                                        >
                                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{post.eyebrow}</p>
                                            <p className="mt-2 text-xl font-semibold leading-snug tracking-tight text-text1">{post.headline}</p>
                                            <p className="mt-2 text-[14px] leading-relaxed text-text2">{post.metaDescription}</p>
                                            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                                                {formatBlogDate(post.publishedAt)}
                                            </p>
                                        </Link>
                                    </Reveal>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>
            <AdFooter />
            <ThemeToggle />
        </>
    );
}

/** kind별 그룹핑 — 고정 순서 유지. 비어 있는 섹션은 렌더하지 않음 */
function groupPostsByKind(posts: BlogPostContent[]): Array<{ kind: BlogPostKind; posts: BlogPostContent[] }> {
    return KIND_ORDER
        .map((kind) => ({ kind, posts: posts.filter((post) => post.kind === kind) }))
        .filter((group) => group.posts.length > 0);
}
