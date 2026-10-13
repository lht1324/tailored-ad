import { memo } from "react";
import Image from "next/image";

interface BrandMarkProps {
    /** 표시 크기(px). SVG라 임의 크기에서 선명 */
    size?: number;
    className?: string;
}

// 브랜드 마크 (핑크 타일 + 흰 glyph, 투명 배경이라 라이트·다크 공용)
// SVG 직접 사용 — next/image 옵티마이저 리샘플(q75)을 피해야 작은 크기에서 선명함.
// 파비콘·애플터치용 PNG는 별도 유지.
function BrandMark({ size = 24, className = "" }: BrandMarkProps) {
    return (
        <Image
            src="/logo/logo.svg"
            alt="TailoredAd logo"
            width={size}
            height={size}
            className={className}
        />
    );
}

export default memo(BrandMark);
