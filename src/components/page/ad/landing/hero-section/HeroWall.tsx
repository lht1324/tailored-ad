'use client'

import Image from 'next/image';

import { motion, useReducedMotion } from 'framer-motion';

interface WallImageItem {
    src: string;
    pos: string;
    rot: string;
}

// 좌표 설계 (max-w-[1440px] 캔버스): 좌 4장(left 기반) / 우 4장(right 기반) 사이에 카드(max-w-2xl, 가운데) 배치.
// 룸 있게: 전 이미지 1.25배 확대 + x 분산 + 잘림 제거(right-[-3%] 폐기).
// 좌측: dusk left-[0%] top, midnight left-[10%], locker left-[8%] bottom, dusk2 left-[0%] bottom.
// 우측: coast right-[2%] top, sneaker right-[0%], bottled right-[7%], bench right-[4%] bottom.
// 카드와 최소 90px 이격, 겹침은 상하 엇갈림으로만.
// const WALL_IMAGES: WallImageItem[] = [
//     { src: '/preview/hero-coast-sunset.webp', pos: 'right-[0%] top-[0%] w-[17rem] xl:w-[18.5rem]', rot: '-rotate-2' },
//     { src: '/preview/hero-perfume-dusk.webp', pos: 'left-[0%] top-[0%] w-[10.5rem] xl:w-[11.5rem]', rot: 'rotate-[2.6deg]' },
//     { src: '/preview/hero-gym-sneaker.webp', pos: 'right-[15%] top-[34%] w-[9.5rem] xl:w-[10.25rem]', rot: 'rotate-[1.8deg]' },
//     { src: '/preview/hero-tumbler-locker.webp', pos: 'left-[2%] bottom-[4%] w-[13rem] xl:w-[14.25rem]', rot: 'rotate-[2deg]' },
//     { src: '/preview/hero-perfume-bottled.webp', pos: 'right-[3%] bottom-[26%] w-[9rem] xl:w-[9.75rem]', rot: 'rotate-[2.8deg]' },
//     { src: '/preview/hero-perfume-gown.webp', pos: 'right-[13%] bottom-[0%] w-[13rem] xl:w-[14.25rem]', rot: '-rotate-[1.6deg]' },
//     { src: '/preview/portfolio-tumbler-sunset-4_5.webp', pos: 'left-[18%] bottom-[2%] w-[9rem] xl:w-[9.75rem]', rot: '-rotate-[2.6deg]' },
//     { src: '/preview/hero-perfume-midnight.webp', pos: 'left-[14%] top-[30%] w-[9.5rem] xl:w-[10.25rem]', rot: '-rotate-[2.2deg]' },
// ];

const WALL_IMAGES: WallImageItem[] = [
    { src: '/preview/hero-perfume-dusk.webp', pos: 'left-[0%] top-[0%] w-[17rem] xl:w-[18.5rem]', rot: 'rotate-[2.6deg]' },
    { src: '/preview/hero-gym-sneaker.webp', pos: 'left-[15%] top-[7%] w-[17rem] xl:w-[18.25rem]', rot: 'rotate-[1.8deg]' },
    { src: '/preview/hero-tumbler-locker.webp', pos: 'left-[0.5%] top-[52%] w-[17rem] xl:w-[18.25rem]', rot: 'rotate-[2deg]' },
    { src: '/preview/hero-perfume-midnight.webp', pos: 'left-[16%] top-[61%] w-[17.5rem] xl:w-[18.75rem]', rot: '-rotate-[2.2deg]' },
    { src: '/preview/hero-suit-reading.webp', pos: 'right-[15%] top-[7%] w-[17rem] xl:w-[18.25rem]', rot: '-rotate-[2.6deg]' },
    { src: '/preview/hero-perfume-bottled.webp', pos: 'right-[0%] top-[0%] w-[17rem] xl:w-[18.5rem]', rot: 'rotate-[2.8deg]' },
    { src: '/preview/hero-perfume-gown.webp', pos: 'right-[15.5%] top-[57%] w-[17rem] xl:w-[18.25rem]', rot: '-rotate-[1.6deg]' },
    { src: '/preview/hero-coast-sunset.webp', pos: 'right-[0.2%] top-[54%] w-[17.5rem] xl:w-[18.75rem]', rot: '-rotate-2' },
];

function WallFrame({
    item,
    index,
    variant,
    prefersReducedMotion,
}: {
    item: WallImageItem;
    index: number;
    variant: 'wall' | 'grid';
    prefersReducedMotion: boolean | null;
}) {
    const frameClass = variant === 'wall' ? `absolute ${item.pos} ${item.rot}` : 'relative w-full';
    const aspectClass = variant === 'wall' ? 'aspect-[4/5]' : index % 2 === 0 ? 'aspect-[4/5]' : 'aspect-[3/4]';

    return (
        <motion.div
            aria-hidden="true"
            className={`pointer-events-none ${frameClass}`}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 36, filter: 'blur(4px)' }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="border border-hairline bg-surface p-[6px] shadow-[0_30px_80px_-28px_rgba(239,43,112,0.22)]">
                <div className={`relative w-full overflow-hidden ${aspectClass}`}>
                    <Image
                        src={item.src}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, 260px"
                        quality={100}
                        unoptimized
                        className="object-cover"
                        priority={variant === 'wall' && index < 3}
                    />
                </div>
            </div>
        </motion.div>
    );
}

export default function HeroWall() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <>
            <div className="pointer-events-none absolute inset-0 hidden md:block">
                {WALL_IMAGES.map((item, index) => (
                    <WallFrame
                        key={item.src}
                        item={item}
                        index={index}
                        variant="wall"
                        prefersReducedMotion={prefersReducedMotion}
                    />
                ))}
            </div>
            <div className="pointer-events-none mt-14 grid w-full grid-cols-2 gap-3 md:hidden">
                {WALL_IMAGES.map((item, index) => (
                    <WallFrame
                        key={item.src}
                        item={item}
                        index={index}
                        variant="grid"
                        prefersReducedMotion={prefersReducedMotion}
                    />
                ))}
            </div>
        </>
    );
}