'use client'

import Image from 'next/image';

import { motion, useReducedMotion } from 'framer-motion';

interface WallImageItem {
    src: string;
    pos: string;
    rot: string;
}

// 좌표 설계 (max-w-[1440px] 캔버스): 좌 4장(left 기반) / 우 4장(right 기반) 사이에 카드(max-w-2xl, 가운데) 배치.
// 전 이미지 1.1배 확대(195→215, 90→100 등) 후 y·크기·회전 유지, 커진 만큼 x 분산해 간격 확보.
// 좌측: physics left-[0%], good_example left-[2%], atmosphere left-[10%], framing left-[11%] top-[30%].
// 우측: main_left right-[4%], main_right right-[-3%], camera right-[7%] bottom-[35%], main_center right-[6%] bottom-[3%].
// 카드와 최소 45px 이격, 겹침은 24px 이하 미세 레이어만.
const WALL_IMAGES: WallImageItem[] = [
    { src: '/preview/demo_main_left.webp', pos: 'right-[4%] top-[0%] w-[13.4375rem] xl:w-[14.6875rem]', rot: '-rotate-2' },
    { src: '/preview/demo_good_example.webp', pos: 'left-[2%] top-[6%] w-[7.1875rem] xl:w-[7.8125rem]', rot: 'rotate-[2.6deg]' },
    { src: '/preview/demo_main_right.webp', pos: 'right-[-3%] top-[32%] w-[7.8125rem] xl:w-[8.4375rem]', rot: 'rotate-[1.8deg]' },
    { src: '/preview/demo_atmosphere.webp', pos: 'left-[10%] bottom-[10%] w-[12.1875rem] xl:w-[13.4375rem]', rot: 'rotate-[2deg]' },
    { src: '/preview/demo_camera.webp', pos: 'right-[7%] bottom-[35%] w-[7.5rem] xl:w-[8.125rem]', rot: 'rotate-[2.8deg]' },
    { src: '/preview/demo_main_center.webp', pos: 'right-[6%] bottom-[3%] w-[10rem] xl:w-[10.9375rem]', rot: '-rotate-[1.6deg]' },
    { src: '/preview/demo_physics.webp', pos: 'left-[0%] bottom-[3%] w-[6.25rem] xl:w-[6.875rem]', rot: '-rotate-[2.6deg]' },
    { src: '/preview/demo_framing.webp', pos: 'left-[11%] top-[30%] w-[6.5625rem] xl:w-[7.1875rem]', rot: '-rotate-[2.2deg]' },
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