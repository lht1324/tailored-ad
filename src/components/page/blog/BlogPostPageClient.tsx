'use client'

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import AdFooter from "@/components/page/ad/public/AdFooter";
import ThemeToggle from "@/components/page/ad/public/ThemeToggle";
import Reveal from "@/components/page/ad/Reveal";
import BrandMark from "@/components/public/BrandMark";
import { formatBlogDate } from "@/lib/content/blog/formatBlogDate";
import type { BlogPostContent, BlogPostCompetitor } from "@/lib/content/blog/types";

/**
 * 블로그 본문 템플릿 — BlogPostContent 규격이면 무엇이든 같은 구조로 렌더한다.
 * 새 글을 추가해도 이 파일은 수정하지 않는다 (규격 확장 시에만 옵셔널 블록 추가).
 *
 * 레이아웃 순서는 adroast류 비교 페이지 실측 구조를 따른다:
 * 요약 박스(★ AI 인용 표적) → 핵심 요약 → 비교표 → 도구 카드 → 본문 섹션 → FAQ → CTA → 관련 글.
 */

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

function QuickAnswer({ paragraphs }: { paragraphs: string[] }) {
    return (
        <div className="rounded-[1.25rem] border-2 border-accent/50 bg-accent/5 p-7 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Quick answer</p>
            <div className="mt-4 space-y-3.5 text-[15px] leading-relaxed text-text1">
                {paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
            </div>
        </div>
    );
}

function KeyTakeaways({ takeaways }: { takeaways: string[] }) {
    return (
        <div className="rounded-[1.25rem] border border-hairline bg-surface p-7 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">Key takeaways</p>
            <ul className="mt-4 space-y-3">
                {takeaways.map((takeaway) => (
                    <li key={takeaway.slice(0, 32)} className="flex items-start gap-3 text-[15px] leading-relaxed text-text2">
                        <Check size={15} strokeWidth={2} className="mt-1 shrink-0 text-accent" />
                        {takeaway}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ComparisonTable({ post }: { post: BlogPostContent }) {
    if (!post.table) return null;
    const { caption, columns, rows } = post.table;
    return (
        <figure className="mt-12">
            <div className="overflow-x-auto rounded-[1.25rem] border border-hairline bg-surface">
                <table className="w-full min-w-[36rem] border-collapse text-left text-[14px]">
                    <thead>
                        <tr className="border-b border-hairline">
                            {columns.map((column, index) => (
                                <th
                                    key={`${column}-${index}`}
                                    className={`px-5 py-4 font-mono text-[11px] uppercase tracking-[0.18em] ${index === 0 ? 'text-text2' : 'text-text1'}`}
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row[0]} className="border-b border-hairline last:border-b-0">
                                {row.map((cell, index) => (
                                    <td
                                        key={`${row[0]}-${index}`}
                                        className={`px-5 py-4 align-top leading-snug ${index === 0 ? 'font-semibold text-text1' : 'text-text2'}`}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {caption && (
                <figcaption className="mt-3 text-[12px] leading-relaxed text-text2">{caption}</figcaption>
            )}
        </figure>
    );
}

function CompetitorCard({ competitor }: { competitor: BlogPostCompetitor }) {
    return (
        <div className="flex h-full flex-col rounded-[1.25rem] border border-hairline bg-surface p-7 md:p-8">
            <h3 className="text-xl font-semibold tracking-tight text-text1">{competitor.name}</h3>
            <dl className="mt-4 space-y-2 text-[13px] leading-relaxed">
                <div className="flex gap-2">
                    <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">Best for</dt>
                    <dd className="text-text1">{competitor.bestFor}</dd>
                </div>
                <div className="flex gap-2">
                    <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">Pricing from</dt>
                    <dd className="text-text1">{competitor.pricingFrom}</dd>
                </div>
            </dl>
            <ul className="mt-5 space-y-2.5">
                {competitor.pros.map((pro) => (
                    <li key={pro.slice(0, 32)} className="flex items-start gap-2.5 text-[14px] leading-snug text-text2">
                        <Check size={14} strokeWidth={2.2} className="mt-0.5 shrink-0 text-accent" />
                        {pro}
                    </li>
                ))}
                {competitor.cons.map((con) => (
                    <li key={con.slice(0, 32)} className="flex items-start gap-2.5 text-[14px] leading-snug text-text2">
                        <X size={14} strokeWidth={2.2} className="mt-0.5 shrink-0 text-text2/70" />
                        {con}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function CtaBand({ post }: { post: BlogPostContent }) {
    return (
        <Reveal>
            <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-[1.5rem] bg-text1 p-8 md:flex-row md:items-center md:p-10">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-canvas">Test it on your own product first.</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-canvas/70">
                        10 free images, no card required. See how your product looks before you pay anything.
                    </p>
                </div>
                <Link
                    href="/create"
                    className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-canvas px-6 py-3 text-[14px] font-semibold text-text1 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    {post.ctaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
                </Link>
            </div>
        </Reveal>
    );
}

function RelatedPosts({ relatedPosts }: { relatedPosts: BlogPostContent[] }) {
    if (relatedPosts.length === 0) return null;
    return (
        <section className="mt-16">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">Keep reading</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                {relatedPosts.map((related) => (
                    <Link
                        key={related.slug}
                        href={`/blog/${related.slug}`}
                        className="rounded-[1.25rem] border border-hairline bg-surface p-6 transition-colors duration-200 hover:border-accent/50"
                    >
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{related.eyebrow}</p>
                        <p className="mt-2 text-[16px] font-semibold leading-snug text-text1">{related.headline}</p>
                        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-text2">{related.metaDescription}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}

export default function BlogPostPageClient({ post, relatedPosts }: { post: BlogPostContent; relatedPosts: BlogPostContent[] }) {
    const dateLabel = useMemo(() => {
        const published = formatBlogDate(post.publishedAt);
        return post.updatedAt === post.publishedAt
            ? `Published ${published}`
            : `Published ${published} · Updated ${formatBlogDate(post.updatedAt)}`;
    }, [post.publishedAt, post.updatedAt]);

    return (
        <>
            <BlogHeader />
            <main className="px-4 pb-24 pt-12 md:pt-16">
                <article className="mx-auto max-w-3xl">
                    <Reveal>
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">{post.eyebrow}</p>
                        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                            {post.headline}
                        </h1>
                        <p className="mt-5 text-[17px] leading-relaxed text-text2">{post.subheadline}</p>
                        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">{dateLabel}</p>
                    </Reveal>

                    <div className="mt-10 space-y-6">
                        <Reveal delay={0.05}><QuickAnswer paragraphs={post.quickAnswer} /></Reveal>
                        <Reveal delay={0.08}><KeyTakeaways takeaways={post.keyTakeaways} /></Reveal>
                    </div>

                    <ComparisonTable post={post} />

                    {post.competitors && post.competitors.length > 0 && (
                        <div className="mt-12 grid gap-5 md:grid-cols-2">
                            {post.competitors.map((competitor) => (
                                <CompetitorCard key={competitor.name} competitor={competitor} />
                            ))}
                        </div>
                    )}

                    <div className="mt-16 space-y-12">
                        {post.sections.map((section) => (
                            <section key={section.heading}>
                                <h2 className="text-2xl font-bold tracking-tight text-text1 md:text-3xl">{section.heading}</h2>
                                <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-text2">
                                    {section.paragraphs.map((paragraph) => (
                                        <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                                    ))}
                                </div>
                                {section.bullets && (
                                    <ul className="mt-5 space-y-3">
                                        {section.bullets.map((bullet) => (
                                            <li key={bullet.slice(0, 32)} className="flex items-start gap-3 text-[15px] leading-relaxed text-text2">
                                                <Check size={15} strokeWidth={2} className="mt-1 shrink-0 text-accent" />
                                                {bullet}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        ))}
                    </div>

                    {post.faq.length > 0 && (
                        <section className="mt-16">
                            <h2 className="text-2xl font-bold tracking-tight text-text1 md:text-3xl">Frequently asked questions</h2>
                            <div className="mt-6 border-t border-hairline">
                                {post.faq.map((item) => (
                                    <details key={item.question} className="group border-b border-hairline">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left">
                                            <span className="text-[16px] font-semibold tracking-tight text-text1">{item.question}</span>
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline text-text2 transition-transform duration-300 group-open:rotate-45 group-open:text-accent">
                                                <span className="-mt-px text-[16px] leading-none">+</span>
                                            </span>
                                        </summary>
                                        <div className="space-y-3 pb-5 text-[15px] leading-relaxed text-text2">
                                            {item.answer.map((paragraph) => (
                                                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </section>
                    )}

                    <CtaBand post={post} />
                    <RelatedPosts relatedPosts={relatedPosts} />
                </article>
            </main>
            <AdFooter />
            <ThemeToggle />
        </>
    );
}
