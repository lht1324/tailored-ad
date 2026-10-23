import type { BlogPostContent } from "@/lib/content/blog/types";
import { adcreativeAiAlternativesPost } from "@/lib/content/blog/posts/adcreativeAiAlternatives";

/**
 * 블로그 콘텐츠 레지스트리 + 로더 — 데이터(posts/*)와 접근(이 파일) 분리.
 * llm-prompts(POST_ 상수) ↔ llmServerAPI 분리 패턴과 동일한 구조다.
 *
 * 새 글 추가 절차:
 *   1. posts/에 파일 1개 추가 (BlogPostContent 규격 충족)
 *   2. REGISTRY에 1줄 추가
 *   → URL·목록 노출·sitemap·JSON-LD가 전부 자동. 라우트 코드 수정 없음.
 *
 * 검증은 모듈 로드 시 1회 실행 — 위반 시 빌드가 즉시 실패한다(fail-fast).
 * 색인된 URL을 망가뜨리는 오탈자·중복·끊긴 내부링크를 런타임까지 미루지 않는다.
 */

/** 레지스트리 — 실제 글 목록. 여기 한 줄이 배포 스위치다. */
const REGISTRY: readonly BlogPostContent[] = [
    adcreativeAiAlternativesPost,
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 레지스트리 무결성 검증 — 슬러그 규칙·중복·필수값·상호참조.
 * 빌드 타임에 실패해야 할 것들을 여기서 전부 걷어간다.
 */
function validateRegistry(posts: readonly BlogPostContent[]): void {
    const seen = new Set<string>();

    for (const post of posts) {
        if (!SLUG_PATTERN.test(post.slug)) {
            throw new Error(`[blogContent] invalid slug "${post.slug}" — kebab-case required`);
        }
        if (seen.has(post.slug)) {
            throw new Error(`[blogContent] duplicate slug "${post.slug}"`);
        }
        seen.add(post.slug);

        const requiredStrings: Array<[string, string]> = [
            ["metaTitle", post.metaTitle],
            ["metaDescription", post.metaDescription],
            ["eyebrow", post.eyebrow],
            ["headline", post.headline],
            ["subheadline", post.subheadline],
            ["ctaLabel", post.ctaLabel],
        ];
        for (const [field, value] of requiredStrings) {
            if (value.trim().length === 0) {
                throw new Error(`[blogContent] "${post.slug}" — required field "${field}" is empty`);
            }
        }

        for (const field of ["publishedAt", "updatedAt"] as const) {
            if (!DATE_PATTERN.test(post[field])) {
                throw new Error(`[blogContent] "${post.slug}" — ${field} must be YYYY-MM-DD`);
            }
        }

        if (post.quickAnswer.length === 0) {
            throw new Error(`[blogContent] "${post.slug}" — quickAnswer is the AI-citation target; it must not be empty`);
        }
        if (post.keyTakeaways.length === 0) {
            throw new Error(`[blogContent] "${post.slug}" — keyTakeaways must not be empty`);
        }
        if (post.sections.length === 0) {
            throw new Error(`[blogContent] "${post.slug}" — sections must not be empty`);
        }
        for (const section of post.sections) {
            if (section.heading.trim().length === 0 || section.paragraphs.length + (section.bullets?.length ?? 0) === 0) {
                throw new Error(`[blogContent] "${post.slug}" — section "${section.heading}" has no content`);
            }
        }
        if (post.table && (post.table.columns.length < 2 || post.table.rows.length === 0)) {
            throw new Error(`[blogContent] "${post.slug}" — table needs ≥2 columns and ≥1 row`);
        }
    }

    for (const post of posts) {
        for (const related of post.relatedSlugs) {
            if (!seen.has(related)) {
                throw new Error(`[blogContent] "${post.slug}" references unknown related slug "${related}"`);
            }
        }
    }
}

validateRegistry(REGISTRY);

export const blogContentServerAPI = {
    /** [slug] 정적 생성용 — 빌드 타임에 전체 슬러그 목록 제공 */
    listBlogSlugs(): string[] {
        return REGISTRY.map((post) => post.slug);
    },

    /** 목록 페이지용 — 선언 순서 그대로 복사본 반환 */
    listBlogPosts(): BlogPostContent[] {
        return [...REGISTRY];
    },

    /** 본문 조회 — 없으면 null (호출부에서 notFound 처리) */
    getBlogPostBySlug(slug: string): BlogPostContent | null {
        return REGISTRY.find((post) => post.slug === slug) ?? null;
    },
};
