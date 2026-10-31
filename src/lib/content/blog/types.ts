/**
 * 블로그 콘텐츠 규격 — 템플릿(BlogPostPageClient)과 데이터(posts/*)의 계약.
 *
 * 원칙:
 * - 데이터 파일은 이 타입만 만족하면 되고, 렌더링 코드를 몰라야 한다.
 * - 템플릿은 이 타입만 받고, 어느 글이 들어와도 같은 규격으로 렌더된다.
 * - 새 필드가 필요하면: 타입에 optional로 추가 → 템플릿에 옵셔널 렌더 추가 → 기존 글 무수정.
 *
 * URL = /blog/{slug}. 슬러그는 한 번 색인되면 바꾸면 안 된다 (링크·색인 끊김).
 */

/** 글 유형 — 목록 페이지의 섹션 분류와 JSON-LD에 사용 */
export type BlogPostKind = 'comparison' | 'industry' | 'list';

/** 비교표 — 첫 열은 행 라벨, 이후 열이 도구별 값 */
export interface BlogPostTable {
    /** 표 위 캡션 (출처·기준 시점 명시 권장) */
    caption?: string;
    columns: string[];
    rows: string[][];
}

/** 개별 도구 카드 (장단점 비교) */
export interface BlogPostCompetitor {
    name: string;
    /** "Best for" 한 줄 */
    bestFor: string;
    /** "Pricing from" 한 줄 — 검증된 가격만 기입할 것 */
    pricingFrom: string;
    pros: string[];
    cons: string[];
}

/** 본문 섹션 — 순서대로 렌더. bullets가 있으면 문단 뒤에 나열 */
export interface BlogPostSection {
    heading: string;
    paragraphs: string[];
    bullets?: string[];
}

export interface BlogPostFaqItem {
    question: string;
    /** 문단 배열 — JSON-LD에는 공백으로 join되어 들어감 */
    answer: string[];
}

export interface BlogPostContent {
    /** URL 세그먼트. kebab-case. 색인 후 변경 금지 */
    slug: string;
    kind: BlogPostKind;
    /** <title> — 사이트명 접미는 메타에서 붙지 않으니 필요하면 직접 포함 */
    metaTitle: string;
    metaDescription: string;
    /** 'YYYY-MM-DD' */
    publishedAt: string;
    /** 'YYYY-MM-DD' — sitemap lastmod로도 사용 */
    updatedAt: string;
    /** H1 위 작은 라벨 (예: "AdCreative.ai alternative") */
    eyebrow: string;
    headline: string;
    subheadline: string;
    /** ★ AI 인용의 1차 표적 — 답이 문단으로 있는 요약 박스. 비우지 말 것 */
    quickAnswer: string[];
    keyTakeaways: string[];
    table?: BlogPostTable;
    competitors?: BlogPostCompetitor[];
    sections: BlogPostSection[];
    faq: BlogPostFaqItem[];
    ctaLabel: string;
    /** 내부링크 — 존재하는 슬러그만. 로더가 빌드 타임에 검증 */
    relatedSlugs: string[];
}
