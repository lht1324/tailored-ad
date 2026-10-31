export type ProjectImageVariant = 'list' | 'thumb' | 'full';

/**
 * 프로젝트 이미지 예쁜 URL — Supabase 서명 URL 대신 동일 출처 경로.
 * 실바이트는 `/projects/[projectId]/image` 라우트가 세션 확인 후 중계한다.
 * 변환 미사용 (쿼터 고갈): list·thumb·full 전부 원본 바이트, 사이징은 CSS.
 * v 파라미터는 URL 안정용으로 유지.
 */
export function buildProjectImageUrl(
    projectId: string,
    creativeIndex: number,
    ratioKey: string,
    variant: ProjectImageVariant,
): string {
    return `/projects/${projectId}/image?c=${creativeIndex}&r=${encodeURIComponent(ratioKey)}&v=${variant}`;
}
