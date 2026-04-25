// 전체 저장소 릴리스 RSS 피드
// - 의존성 추가 없이 순수 XML 문자열 생성
// - 빌드 타임에 /rss.xml 정적 파일 생성

import type { APIRoute } from 'astro';
import { collectRecentReleases } from '../lib/data';
import { absoluteUrl, escapeXml } from '../lib/paths';

export const GET: APIRoute = async ({ site }) => {
  const items = await collectRecentReleases(20);
  const selfUrl = absoluteUrl(site, '/rss.xml');
  const homeUrl = absoluteUrl(site, '/');
  const now = new Date().toUTCString();

  const xmlItems = items
    .map((item) => {
      const repoUrl = absoluteUrl(site, `/${item.repoName}/`);
      const pubDate = new Date(item.publishedAt).toUTCString();
      return (
        `<item>` +
        `<title>${escapeXml(item.repoName)} ${escapeXml(item.tag)}</title>` +
        `<link>${escapeXml(item.url)}</link>` +
        `<guid isPermaLink="false">${escapeXml(item.url)}</guid>` +
        `<pubDate>${pubDate}</pubDate>` +
        `<description>${escapeXml(item.title)}</description>` +
        `<source url="${escapeXml(repoUrl)}">${escapeXml(item.repoName)}</source>` +
        `</item>`
      );
    })
    .join('');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">` +
    `<channel>` +
    `<title>P-J-C — Releases</title>` +
    `<link>${homeUrl}</link>` +
    `<atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />` +
    `<description>jongcheol-pak 의 공개 저장소 최신 릴리스 피드</description>` +
    `<language>ko</language>` +
    `<lastBuildDate>${now}</lastBuildDate>` +
    xmlItems +
    `</channel>` +
    `</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
