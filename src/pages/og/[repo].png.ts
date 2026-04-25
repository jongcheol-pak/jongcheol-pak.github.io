// 저장소별 OG 이미지 동적 라우트
// - 빌드 타임에 각 대상 저장소에 대해 /og/<repo>.png 정적 파일 생성

import type { APIRoute, GetStaticPaths } from 'astro';
import { getDetailRouteList, getRepoMeta } from '../../lib/data';
import { renderOgImage } from '../../lib/og';

export const getStaticPaths: GetStaticPaths = async () => {
  const list = await getDetailRouteList();
  return list.map((item) => ({ params: { repo: item.name } }));
};

export const GET: APIRoute = async ({ params }) => {
  const repoName = params.repo;
  if (!repoName) {
    return new Response('repo param missing', { status: 400 });
  }

  // OG 는 name/description 만 필요 → 경량 meta 조회로 README 렌더링 낭비 제거
  const meta = await getRepoMeta(repoName);
  if (!meta) {
    return new Response('not found', { status: 404 });
  }

  const png = await renderOgImage({
    repoName: meta.name,
    description: meta.description,
  });

  return new Response(png, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
};
