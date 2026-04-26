// 빌드 타임 검색 인덱스 emit (A-4) — /search-index.json
// 클라이언트(filter.ts) 가 첫 검색 입력 전후로 lazy fetch 해서
// README 본문 키워드까지 매칭되는 카드를 골라낸다.
// astro.config.mjs 의 sitemap filter 가 본 endpoint 를 sitemap 에서 제외한다.
import type { APIRoute } from 'astro';
import { getSearchIndex } from '../lib/data';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await getSearchIndex();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
