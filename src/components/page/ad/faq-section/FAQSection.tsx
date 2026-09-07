'use client'

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import Reveal from "@/components/page/ad/Reveal";

const FAQ_ITEMS = [
    {
        question: 'How is billing calculated?',
        answer: 'You pay for generation batches — one batch is one quality-gated set of candidates. Downloads, size variants, and re-renders are free and unlimited. We never charge you per candidate image.',
    },
    {
        question: 'Do unused images expire?',
        answer: 'No. Your monthly allowance rolls over for as long as your subscription is active. Allowance is only forfeited if you cancel your subscription.',
    },
    {
        question: 'Can I use my own product photos and logo?',
        answer: 'Yes. Upload product photos, your logo, and even a portrait. Your assets are composited into the generated scene with consistent lighting and shadows, and your logo stays pixel-exact.',
    },
    {
        question: 'Which ad sizes do you support?',
        answer: 'Every layout renders into the formats your ad platforms need: 1:1, 4:5, 9:16, 16:9, story, and display banner variants — all from the same design.',
    },
    {
        question: 'What does "doesn\'t look like AI stock" mean?',
        answer: 'We generate candidate batches and quality-gate them before you ever see them, then composite headline and logo deterministically instead of asking the model to paint them. The result is a controlled, brand-consistent look — not a generic AI rendering.',
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Yes. Your subscription can be cancelled at any time. Your allowance remains usable through the end of your billing period.',
    },
];

function FAQItem({ question, answer, isOpen, onToggle }: {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="border-b border-hairline">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-6 py-6 text-left"
            >
                <span className="text-[17px] font-semibold tracking-tight text-text1">
                    {question}
                </span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline transition-transform duration-300 ${isOpen ? 'rotate-45 text-accent' : 'text-text2'}`}>
                    <Plus size={14} strokeWidth={2} />
                </span>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-text2">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="scroll-mt-24 px-4 py-24 md:py-32">
            <div className="mx-auto max-w-3xl">
                <Reveal>
                    <div className="text-center">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                            Questions, answered.
                        </h2>
                        <span className="mt-6 inline-block -rotate-[3deg] rounded-[8px] border-2 border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                            Q&A — updated weekly
                        </span>
                    </div>
                </Reveal>
                <Reveal delay={0.08}>
                    <div className="mt-14 border-t border-hairline">
                        {FAQ_ITEMS.map((item, index) => (
                            <FAQItem
                                key={item.question}
                                question={item.question}
                                answer={item.answer}
                                isOpen={openIndex === index}
                                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                            />
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
