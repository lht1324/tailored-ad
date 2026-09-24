'use client';

import ReactMarkdown from 'react-markdown';
import { memo, useMemo } from "react";
import { PRIVACY_POLICY, REFUND_POLICY, TERMS_OF_SERVICE } from "@/components/page/legal/LegalPageMarkdownData";
import AdFooter from "@/components/page/ad/public/AdFooter";
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import { LegalDataType } from "@/components/page/legal/LegalDataType";

interface LegalPageClientProps {
    legalDataType: LegalDataType;
}

interface TocEntry {
    id: string;
    title: string;
}

function slugifyHeading(title: string): string {
    return title
        .toLowerCase()
        .replace(/^\d+\.\s*/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function LegalPageClient({ legalDataType }: LegalPageClientProps) {
    const { content, title, subtitle } = useMemo(() => {
        switch (legalDataType) {
            case LegalDataType.PRIVACY: return {
                title: 'Privacy Policy',
                subtitle: 'What we collect, why, and who processes it.',
                content: PRIVACY_POLICY
            }
            case LegalDataType.TERMS: return {
                title: 'Terms of Service',
                subtitle: 'The rules for using TailoredAd.',
                content: TERMS_OF_SERVICE
            }
            case LegalDataType.REFUNDS: return {
                title: 'Refund Policy',
                subtitle: 'Cancel anytime. Unused images refunded pro-rata.',
                content: REFUND_POLICY
            }
        }
    }, [legalDataType]);

    const toc: TocEntry[] = useMemo(() => {
        const entries: TocEntry[] = [];
        for (const line of content.split('\n')) {
            const match = /^##\s+(.+)$/.exec(line.trim());
            if (match) {
                const title = match[1].trim();
                entries.push({ id: slugifyHeading(title), title });
            }
        }
        return entries;
    }, [content]);

    const lastUpdated = 'September 24, 2026';

    // 1. 강제 줄바꿈 처리: 마크다운 표준에 맞게 엔터 두 번으로 변환 (데이터 수정 없이 해결)
    // 기존 데이터가 "\n" 하나로만 되어 있다면 이걸 "\n\n"으로 바꿔주면 확실하게 문단이 나뉩니다.
    const formattedContent = content.replace(/\n/g, '\n\n');

    return (
        <div className="min-h-screen bg-canvas text-text1">
            <AppHeader />

            <main className="mx-auto max-w-6xl px-8 pt-32 pb-24">
                <header className="mb-12 max-w-2xl">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                        {title}
                    </h1>
                    <p className="mt-3 text-base leading-relaxed text-text2">
                        {subtitle}
                    </p>
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                        Last updated: {lastUpdated}
                    </p>
                </header>

                <div className="grid gap-12 lg:grid-cols-[1fr_220px]">
                    <article className="prose max-w-none
                        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-text1
                        prose-h2:scroll-mt-32 prose-h2:border-t prose-h2:border-hairline prose-h2:pt-8 prose-h2:text-xl prose-h2:first:border-t-0 prose-h2:first:pt-0
                        prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-text2
                        prose-strong:font-semibold prose-strong:text-text1
                        prose-ul:my-4 prose-ul:list-disc prose-ul:pl-5
                        prose-li:my-1 prose-li:text-[15px] prose-li:text-text2
                        prose-a:font-medium prose-a:text-text1 prose-a:underline prose-a:underline-offset-4
                    ">
                        <ReactMarkdown
                            components={{
                                h2: ({ node, children, ...props }) => {
                                    const text = String(children);
                                    return <h2 id={slugifyHeading(text)} {...props}>{children}</h2>;
                                },
                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                            }}
                        >
                            {formattedContent}
                        </ReactMarkdown>
                    </article>

                    {toc.length > 1 && (
                        <aside className="hidden lg:block">
                            <nav aria-label="On this page" className="sticky top-32 border-l border-hairline pl-5">
                                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                    On this page
                                </p>
                                <ul className="space-y-2.5">
                                    {toc.map((entry) => (
                                        <li key={entry.id}>
                                            <a
                                                href={`#${entry.id}`}
                                                className="block text-[13px] leading-snug text-text2 transition-colors hover:text-text1"
                                            >
                                                {entry.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </aside>
                    )}
                </div>

                <div className="mt-16 border-t border-hairline pt-8">
                    <p className="text-sm text-text2">
                        Questions about these terms?{' '}
                        <a href="mailto:support@tailoredad.com" className="font-medium text-text1 underline underline-offset-4">
                            support@tailoredad.com
                        </a>
                    </p>
                </div>
            </main>

            <AdFooter />
        </div>
    );
}

export default memo(LegalPageClient);
