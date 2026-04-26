// 검색 인덱스 — README 를 plain-text 로 변환 + UTF-8 byte 기준으로 절단 (A-4)
// readme.ts 의 extractSummary 와 정규화 로직은 유사하나, 검색 인덱스는
// (1) 4KB 같은 큰 길이 절단 (2) "..." suffix 없음 — 검색 매칭 노이즈 방지

// 카드(저장소) 1개당 최대 byte 수. 카드 50개 기준 ≈ 200KB → 250KB 상한 내
export const SEARCH_INDEX_MAX_BYTES_PER_DOC = 4 * 1024;

// Markdown 문법/HTML 태그/주석 제거 + 공백 normalize → plain text
export function toPlainText(markdown: string): string {
  if (!markdown) return '';
  let text = markdown;
  // 코드 블록 / 인라인 코드 / HTML 주석 / HTML 태그 / 이미지 / 링크
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]*`/g, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // reference-style 링크 정의 줄
  text = text.replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, '');
  // 헤딩 / 리스트 마커 / 인용 / 수평선
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/^\s*>\s?/gm, '');
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, '');
  // 강조 (**bold**, *italic*)
  text = text.replace(/(\*\*|__)(.+?)\1/g, '$2');
  text = text.replace(/(\*|_)(.+?)\1/g, '$2');
  // 공백 normalize
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// UTF-8 byte 기준 안전 절단 — multi-byte char 중간에서 잘리지 않도록 continuation byte(10xxxxxx) 회피
export function truncateBytes(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, 'utf-8');
  if (buf.length <= maxBytes) return text;
  let cut = maxBytes;
  while (cut > 0 && (buf[cut] & 0xc0) === 0x80) cut -= 1;
  return buf.subarray(0, cut).toString('utf-8');
}
