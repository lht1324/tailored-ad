import LandingPageClient from "./LandingPageClient";
import {
    FAQ_ITEMS_JSON_LD,
    ORGANIZATION_JSON_LD,
    SOFTWARE_JSON_LD,
} from "@shared/lib/landingJsonLd";

/**
 * 랜딩(`/`) — 화면 + 구조화 데이터(JSON-LD).
 *
 * 구 `app/page.tsx`(서버 컴포넌트)가 하던 일을 그대로 옮겼다.
 * JSON-LD는 프리렌더 때 HTML에 그대로 남아야 검색·AI 추출기가 읽는다.
 * (프리렌더 단계에서 이 컴포넌트를 renderToString으로 굽는다)
 */
export default function LandingPage() {
    return (
        <>
            <LandingPageClient />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_ITEMS_JSON_LD) }}
            />
        </>
    );
}
