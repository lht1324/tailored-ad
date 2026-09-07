'use client';

import ReactMarkdown from 'react-markdown';
import {memo, useMemo} from "react";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/components/page/legal/LegalPageMarkdownData";
import Footer from "@/components/public/footer/Footer";
import { LegalDataType } from "@/components/page/legal/LegalDataType";

interface LegalPageClientProps {
    legalDataType: LegalDataType;
}

function LegalPageClient({ legalDataType }: LegalPageClientProps) {
    const { content, title } = useMemo(() => {
        switch (legalDataType) {
            case LegalDataType.PRIVACY: return {
                title: 'Privacy Policy',
                content: PRIVACY_POLICY
            }
            case LegalDataType.TERMS: return {
                title: 'Terms of Service',
                content: TERMS_OF_SERVICE
            }
        }
    }, [legalDataType]);

    const lastUpdated = 'February 6, 2026';

    // 1. 강제 줄바꿈 처리: 마크다운 표준에 맞게 엔터 두 번으로 변환 (데이터 수정 없이 해결)
    // 기존 데이터가 "\n" 하나로만 되어 있다면 이걸 "\n\n"으로 바꿔주면 확실하게 문단이 나뉩니다.
    const formattedContent = content.replace(/\n/g, '\n\n');

    return (
        <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-purple-500/30">
            {/* 상단 그라데이션 (은은하게) */}
            <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none z-0" />

            <main className="relative z-10 pt-24 pb-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                {/* 헤더 섹션: 진중한 스타일 */}
                <header className="mb-16 border-b border-white/10 pb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                        {title}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Last updated: {lastUpdated}
                    </p>
                    <p className="text-gray-500 text-sm">
                        Effective Date: {lastUpdated}
                    </p>
                </header>

                {/* 문서 본문: Typography 플러그인 활용 + 수동 스타일링 */}
                <article className="prose prose-invert prose-lg max-w-none
                    prose-headings:text-white prose-headings:font-bold prose-headings:mb-4 prose-headings:mt-12
                    prose-h2:text-xl prose-h2:border-l-4 prose-h2:border-purple-500 prose-h2:pl-4 prose-h2:leading-tight
                    prose-p:text-gray-300 prose-p:leading-7 prose-p:mb-6 prose-p:text-base
                    prose-strong:text-white prose-strong:font-semibold
                    prose-ul:list-disc prose-ul:pl-5 prose-ul:my-4
                    prose-li:text-gray-300 prose-li:my-1 prose-li:text-base
                    prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300
                ">
                    <ReactMarkdown
                        components={{
                            a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" />
                        }}
                    >
                        {formattedContent}
                    </ReactMarkdown>
                </article>

                {/* 하단 문의 */}
                <div className="mt-20 pt-8 border-t border-white/10 text-center sm:text-left">
                    <p className="text-gray-500 text-sm">
                        Questions about these terms?{' '}
                        <a href="mailto:support@shortreal.ai" className="text-white hover:text-purple-400 transition-colors font-medium">
                            support@shortreal.ai
                        </a>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default memo(LegalPageClient);