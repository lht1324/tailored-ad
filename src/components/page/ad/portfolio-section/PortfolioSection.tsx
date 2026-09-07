'use client'

import Image from 'next/image';
import { useRef } from 'react';
import { motion, MotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Reveal from "@/components/page/ad/Reveal";

interface PlacedImage {
    id: string;
    src: string;
    alt: string;
    left: number;
    top: number;
    width: number;
    aspect: string;
    parallax: [number, number];
    mobileHidden?: boolean;
}

// 디자이너가 수작업으로 흩뿌린 좌표 (캔버스 4:5 기준)
// 실무 점유율 기반 종횡비 세팅: 1:1(4장), 9:16(3장), 4:5(3장), 16:9(앵커 1장)
// 간격 및 불규칙성 미세 조정 완료
const PLACED_IMAGES: PlacedImage[] = [
    // --- 상단 구역 ---
    { id: 'demo-atmosphere', src: '/preview/demo_atmosphere.webp', alt: 'Atmospheric ad', left: 3.0, top: 2.0, width: 19.0, aspect: '4/5', parallax: [-15, 25] },
    { id: 'demo-camera', src: '/preview/demo_camera.webp', alt: 'Camera product ad', left: 38.0, top: 4.0, width: 17.0, aspect: '9/16', parallax: [-25, 15] },
    { id: 'demo-bad-example', src: '/preview/demo_bad_example.webp', alt: 'Off-rule ad', left: 73.0, top: 3.0, width: 22.0, aspect: '1/1', parallax: [10, -20] },

    // --- 중단 구역 ---
    { id: 'demo-framing-tilt', src: '/preview/demo_framing.webp', alt: 'Framing tilt', left: 6.0, top: 29.0, width: 18.0, aspect: '1/1', parallax: [-30, 20], mobileHidden: true },
    { id: 'demo-good-tilt', src: '/preview/demo_good_example.webp', alt: 'On-rule ad', left: 32.0, top: 36.0, width: 20.0, aspect: '4/5', parallax: [15, -25], mobileHidden: true },
    { id: 'demo-atmosphere-tilt', src: '/preview/demo_atmosphere.webp', alt: 'Tighter crop', left: 75.0, top: 26.0, width: 16.0, aspect: '9/16', parallax: [20, -10], mobileHidden: true },

    // --- 하단 구역 ---
    { id: 'demo-good-example', src: '/preview/demo_good_example.webp', alt: 'Good example', left: 4.0, top: 50.0, width: 21.0, aspect: '1/1', parallax: [30, -20] },
    { id: 'demo-main-left', src: '/preview/demo_main_left.webp', alt: 'Subject on left', left: 30.0, top: 61.0, width: 19.0, aspect: '4/5', parallax: [-10, 20] },
    { id: 'demo-physics', src: '/preview/demo_physics.webp', alt: 'Physics-driven ad', left: 57.0, top: 48.0, width: 16.0, aspect: '9/16', parallax: [25, -15] },
    { id: 'demo-framing', src: '/preview/demo_framing.webp', alt: 'Close-up framing', left: 79.0, top: 54.0, width: 18.0, aspect: '1/1', parallax: [-20, 30] },

    // --- Anchor (중앙 하단 고정 배너, 여백 확보를 위해 top을 85로 하향) ---
    { id: 'demo-main-center', src: '/preview/demo_main_center.webp', alt: 'Product ad creative centered', left: 26.0, top: 85.0, width: 48.0, aspect: '16/9', parallax: [0, 0] },
];

interface PortfolioTileProps {
    item: PlacedImage;
    y: MotionValue<number>;
}

function PortfolioTile({ item, y }: PortfolioTileProps) {
    return (
        <motion.div
            style={{
                y,
                left: `${item.left}%`,
                top: `${item.top}%`,
                width: `${item.width}%`,
            }}
            className={`absolute will-change-transform ${item.mobileHidden ? 'hidden md:block' : ''}`}
        >
            <div className="bg-white p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]">
                <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: item.aspect }}>
                    <Image
                        src={item.src}
                        alt={item.alt}
                        fill
                        sizes="(max-width: 768px) 30vw, 18vw"
                        className="object-cover"
                    />
                </div>
            </div>
        </motion.div>
    );
}

export default function PortfolioSection() {
    const ref = useRef<HTMLElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const ys = PLACED_IMAGES.map((item) =>
        useTransform(scrollYProgress, [0, 1], item.parallax)
    );
    const yStatic = useTransform(scrollYProgress, [0, 1], [0, 0]);

    return (
        <section ref={ref} id="portfolio" className="relative scroll-mt-24 overflow-hidden px-4 py-24 md:py-32">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse 60% 45% at 50% 40%, color-mix(in srgb, var(--ad-surface) 55%, transparent) 0%, transparent 100%)',
                }}
            />
            <div className="relative mx-auto max-w-[90rem]">
                <Reveal>
                    <div className="flex flex-wrap items-end justify-between gap-6">
                        <div className="max-w-2xl">
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                                Portfolio
                            </p>
                            <h2 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-text1 md:text-5xl">
                                Ads you'd scroll past twice.
                            </h2>
                            <p className="mt-5 text-[17px] leading-relaxed text-text2">
                                No generic stock vibes. Every creative is sampled from a batch, quality-gated, then finished with pixel-exact type and logo.
                            </p>
                        </div>
                    </div>
                </Reveal>

                <Reveal>
                    {/* 이미지 띄우는 부분을 감싸는 래퍼 (하단 완충 지대 역할) */}
                    <div className="w-full pb-24 md:pb-32">
                        <div className="relative mt-16 aspect-[3/4] w-full md:aspect-[4/5]">
                            {PLACED_IMAGES.map((item, index) => (
                                <PortfolioTile
                                    key={item.id}
                                    item={item}
                                    y={prefersReducedMotion ? yStatic : ys[index]}
                                />
                            ))}
                        </div>
                    </div>
                </Reveal>

                {/* p 태그는 래퍼 밖으로 깔끔하게 분리 */}
                <div className="mt-8 text-right">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                        Demo imagery — your product replaces these
                    </p>
                </div>
            </div>
        </section>
    );
}