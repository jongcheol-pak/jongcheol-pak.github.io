// README Markdown 파싱 로직
// 1) 첫 번째 이미지 URL 추출 (상대 경로 → 절대 경로 변환)
// 2) 본문에서 180자 요약 추출 (코드/이미지/링크 문법 제거)
// 3) 전문 Markdown → 안전한 HTML 변환 (상세 페이지용)

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { OWNER } from './github';
import { toPlainText } from './search-index';

// 첫 이미지: Markdown ![]() 우선, 없으면 <img src="">
export function extractFirstImage(
  markdown: string,
  repoName: string,
  defaultBranch: string,
): string | null {
  if (!markdown) return null;

  const rawBase = `https://raw.githubusercontent.com/${OWNER}/${repoName}/${defaultBranch}`;

  const mdMatch = markdown.match(/!\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/);
  if (mdMatch && mdMatch[1]) {
    return resolveImageSrc(mdMatch[1], rawBase);
  }

  const htmlMatch = markdown.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (htmlMatch && htmlMatch[1]) {
    return resolveImageSrc(htmlMatch[1], rawBase);
  }

  return null;
}

// README 요약 (기본 180자) — Markdown 정규화는 search-index.ts 의 toPlainText 와 공유
export function extractSummary(markdown: string, maxLen = 180): string {
  const text = toPlainText(markdown);
  if (!text) return '';
  if (text.length <= maxLen) return text;

  const sliced = text.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(' ');
  const cutoff = lastSpace > maxLen * 0.6 ? lastSpace : maxLen;
  return `${text.slice(0, cutoff).trimEnd()}...`;
}

// Markdown 전문 → 안전한 HTML 변환
export function renderMarkdown(
  markdown: string,
  repoName: string,
  defaultBranch: string,
): string {
  if (!markdown) return '';

  const rawHtml = marked.parse(markdown, {
    gfm: true,
    breaks: false,
    async: false,
  }) as string;

  const cleaned = sanitizeHtml(rawHtml, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'del', 's', 'code', 'pre', 'kbd',
      'blockquote',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img',
      'span', 'div',
      'details', 'summary',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      pre: ['class'],
      span: ['class'],
      div: ['class'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  });

  return resolveRelativeUrls(cleaned, repoName, defaultBranch);
}

function resolveRelativeUrls(
  html: string,
  repoName: string,
  defaultBranch: string,
): string {
  const rawBase = `https://raw.githubusercontent.com/${OWNER}/${repoName}/${defaultBranch}`;
  const blobBase = `https://github.com/${OWNER}/${repoName}/blob/${defaultBranch}`;

  let result = html;

  result = result.replace(/<img\b([^>]*?)\bsrc=(["'])([^"']+)\2/gi, (_match, pre, q, src) => {
    const resolved = resolveImageSrc(src, rawBase);
    return `<img${pre} src=${q}${resolved}${q}`;
  });

  result = result.replace(/<a\b([^>]*?)\bhref=(["'])([^"']+)\2/gi, (_match, pre, q, href) => {
    const resolved = resolveLinkHref(href, blobBase);
    return `<a${pre} href=${q}${resolved}${q}`;
  });

  return result;
}

function resolveImageSrc(src: string, rawBase: string): string {
  const trimmed = src.trim();

  const blobMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i,
  );
  if (blobMatch) {
    const [, user, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return trimmed;
  }

  const cleanPath = trimmed.replace(/^\.?\/+/, '');
  return `${rawBase}/${cleanPath}`;
}

function resolveLinkHref(href: string, blobBase: string): string {
  const trimmed = href.trim();

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#') || trimmed.startsWith('?')) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;

  const cleanPath = trimmed.replace(/^\.?\/+/, '');
  return `${blobBase}/${cleanPath}`;
}
