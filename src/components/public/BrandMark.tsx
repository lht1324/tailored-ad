import { memo } from "react";
import Image from "next/image";

interface BrandMarkProps {
    /** 표시 크기(px). 32 이하는 32px 파일, 그 이상은 64px 파일 사용 */
    size?: number;
    className?: string;
}

// 브랜드 마크 (핑크 타일 + 흰 glyph, 투명 배경이라 라이트·다크 공용)
function BrandMark({ size = 24, className = "" }: BrandMarkProps) {
    return (
        <Image
            src="/logo/logo-180.png"
            alt="TailoredAd logo"
            width={size}
            height={size}
            className={className}
        />
    );
}

export default memo(BrandMark);
