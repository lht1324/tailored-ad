import type { Metadata } from "next";
import OgCardPageClient from "@/components/page/dev/OgCardPageClient";

// 개발 전용 — OG 카드 프리뷰/캡처. prod에도 배포되지만 noindex + robots 차단으로 검색 노출 없음.
export const metadata: Metadata = {
    title: "OG card",
    robots: {
        index: false,
        follow: false,
    },
};

export default function OgCardPage() {
    return <OgCardPageClient />;
}
