import type { CSSProperties } from "react";

/**
 * 이미지 컴포넌트 — Next `next/image` 대체.
 *
 * ## 왜 만들었나
 * Next의 이미지 최적화(리사이즈·포맷 변환·lazy)는 Vite에 없다. 그렇다고 `<Image>` 호출부를
 * 전부 `<img>`로 고치면 props가 흩어져 실수가 난다. 그래서 **얇은 래퍼** 하나로 받는다.
 *
 * ## Next와 달라진 점
 * - 최적화 없음: 원본 파일을 그대로 내려준다 → **원본을 적당한 크기로 미리 준비**해야 한다
 * - `fill`: Next는 부모에 `position: relative`를 요구했다. 여기서는 `absolute inset-0`을 깔아
 *   같은 효과를 낸다 (부모는 `relative`여야 한다).
 * - `sizes`·`quality`·`unoptimized`는 **받기만 하고 무시**한다 (호출부 수정을 줄이려고).
 *
 * ## 성능 기본값
 * - `loading="lazy"`, `decoding="async"`
 * - 첫 화면(LCP)에 걸리는 이미지는 `priority`로 eager 처리
 */
interface AppImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    /** 부모를 가득 채운다 (부모는 `relative`여야 함) */
    fill?: boolean;
    className?: string;
    style?: CSSProperties;
    /** LCP 후보 — 즉시 로드 */
    priority?: boolean;
    /** Next 호환용. 무시된다(브라우저 힌트로만 쓰임) */
    sizes?: string;
    /** Next 호환용. 무시된다 */
    quality?: number;
    /** Next 호환용. 무시된다 (항상 원본 사용) */
    unoptimized?: boolean;
}

export default function AppImage({
    src,
    alt,
    width,
    height,
    fill = false,
    className,
    style,
    priority = false,
}: AppImageProps) {
    const resolvedClassName = fill
        ? `absolute inset-0 h-full w-full ${className ?? ""}`.trim()
        : className;

    return (
        <img
            src={src}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={resolvedClassName}
            style={style}
        />
    );
}
