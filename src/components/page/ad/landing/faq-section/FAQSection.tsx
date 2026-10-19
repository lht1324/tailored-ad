'use client'

import { Plus } from 'lucide-react';
import Reveal from "@/components/page/ad/Reveal";

const FAQ_ITEMS: { question: string; answer: string[] }[] = [
    {
        question: 'How is billing calculated?',
        answer: ['You pay for the images you generate, not downloads. Every batch is quality-gated. Failures are on us.'],
    },
    {
        question: 'Does editing cost images?',
        answer: ['No. Editor tweaks and re-exports are free and unlimited. Only AI generation uses your balance.'],
    },
    {
        question: 'Do unused images expire?',
        answer: ['No. Images you paid for never expire. Not at the end of the billing period. Not after cancellation.'],
    },
    {
        question: 'Can I use my own product photos and logo?',
        answer: [
            'Yes. Upload a product photo and your logo. Both are composited into the generated scene with consistent lighting and shadows. Your logo stays pixel-exact.',
        ],
    },
    {
        question: 'Which ad sizes do you support?',
        answer: ['Every layout renders into the formats your ad platforms need: 1:1, 4:5, 9:16, 16:9, Story, and display banner variants. All from the same design.'],
    },
    {
        question: 'What does "doesn\'t look like AI stock" mean?',
        answer: [
            'We generate candidate batches and quality-gate them before you ever see them. Then we composite headline and logo deterministically instead of asking the model to paint them.',
            'The result is a controlled, brand-consistent look. Not a generic AI rendering.',
        ],
    },
    {
        question: 'Can I cancel anytime?',
        answer: ['Yes. Cancel anytime. Your remaining images stay usable.'],
    },
];

/**
 * FAQ 아코디언 — 네이티브 `<details>/<summary>`.
 * 이전엔 useState + AnimatePresence라 닫힌 항목의 답변이 DOM에 아예 없었고,
 * 크롤러·AI 추출기는 질문을 읽되 답변 본문을 못 읽었다 (닫힌 항목 6개 전부 누락 실측).
 * details는 닫혀 있어도 답변이 HTML에 남아 있어 검색·AI 인용에 그대로 먹히고,
 * JS 없이 동작 + 스크린리더 접근성도 네이티브로 얻는다. (open: 변수로 아이콘 회전)
 */
function FAQItem({ question, answer, defaultOpen }: { question: string; answer: string[]; defaultOpen?: boolean }) {
    return (
        <details open={defaultOpen} className="group border-b border-hairline">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left">
                <span className="text-[17px] font-semibold tracking-tight text-text1">
                    {question}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-text2 transition-transform duration-300 group-open:rotate-45 group-open:text-accent">
                    <Plus size={14} strokeWidth={2} />
                </span>
            </summary>
            <div className="max-w-2xl space-y-3 pb-6 text-[15px] leading-relaxed text-text2">
                {answer.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </div>
        </details>
    );
}

export default function FAQSection() {
    return (
        <section id="faq" className="scroll-mt-24 px-4 py-24 md:py-32">
            <div className="mx-auto max-w-3xl">
                <Reveal>
                    <div className="text-center">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                            Questions, answered.
                        </h2>
                    </div>
                </Reveal>
                <Reveal delay={0.08}>
                    <div className="mt-14 border-t border-hairline">
                        {FAQ_ITEMS.map((item, index) => (
                            <FAQItem
                                key={item.question}
                                question={item.question}
                                answer={item.answer}
                                defaultOpen={index === 0}
                            />
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}