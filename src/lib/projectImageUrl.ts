export type ProjectImageVariant = 'list' | 'thumb' | 'full';

/**
 * 프로젝트 이미지 예쁜 URL — Supabase 서명 URL 대신 동일 출처 경로.
 * 실바이트는 `/projects/[projectId]/image` 라우트가 세션 확인 후 중계한다.
 * - list: 목록 썸네일 (width 800 경량)
 * - thumb: Detail 타일 (height 600 경량)
 * - full: 모달·에디터·다운로드 (원본)
 */
export function buildProjectImageUrl(
    projectId: string,
    creativeIndex: number,
    ratioKey: string,
    variant: ProjectImageVariant,
): string {
    return `/projects/${projectId}/image?c=${creativeIndex}&r=${encodeURIComponent(ratioKey)}&v=${variant}`;
}
