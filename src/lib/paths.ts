// 공용 URL/경로/이스케이프 헬퍼
// - Astro base path 의 trailing slash 제거 값, 절대 URL 조합, XML/HTML 텍스트 이스케이프

export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');
export const DEFAULT_SITE_ORIGIN = 'https://jongcheol-pak.github.io';

/** base path prefix 를 붙인 내부 경로 반환 */
export function withBase(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Astro.site 기반 절대 URL 반환. site 가 없으면 DEFAULT_SITE_ORIGIN 으로 폴백. */
export function absoluteUrl(site: URL | undefined, path: string): string {
  const origin = site?.origin ?? DEFAULT_SITE_ORIGIN;
  return `${origin}${withBase(path)}`;
}

/** XML/HTML 공통 텍스트 이스케이프 — 5개 문자(&, <, >, ", ') 처리 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
