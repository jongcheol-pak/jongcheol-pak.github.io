// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// 빌드 도중 src/lib/thumbnail.ts 가 public/thumbs/ 에 늦게 쓰는 webp 들을
// 빌드 종료 시점에 dist/thumbs/ 로 복사. Astro 의 public→dist 복사는 빌드
// 시작 시점 1회뿐이라, 그 이후 생성된 파일은 dist 에 누락된다.
// GitHub Actions runner 처럼 fresh checkout 환경에서는 public/thumbs/ 가
// 비어 있어 1회 복사 단계에서 들어갈 게 없고 → 배포 산출물에서 thumbs/ 가
// 통째로 빠져 카드 이미지가 404 가 된다.
function copyThumbsToDist() {
  return {
    name: 'copy-thumbs-to-dist',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const src = path.resolve('public/thumbs');
        if (!existsSync(src)) return;
        const dest = fileURLToPath(new URL('thumbs/', dir));
        await cp(src, dest, { recursive: true, force: true });
      },
    },
  };
}

// GitHub Pages 배포 설정
// user pages 라 base path 는 root('/'), site 만 지정.
export default defineConfig({
  site: 'https://jongcheol-pak.github.io',
  trailingSlash: 'ignore',
  integrations: [
    tailwind({
      // 자체 reset/스타일을 그대로 사용하므로 preflight 비활성화
      applyBaseStyles: false,
    }),
    sitemap({
      // A-4 검색 인덱스는 검색 엔진 노이즈가 되므로 sitemap 에서 제외
      filter: (page) => !page.endsWith('/search-index.json'),
    }),
    copyThumbsToDist(),
  ],
  vite: {
    // 빌드 타임 상수 주입:
    // - MOCK_REPOS=1 환경에서 빌드하면 __BUILD_MOCK__ = true → fixture import 가 번들에 포함
    // - 미설정(프로덕션/Actions) 환경에선 false → github.ts 의 가드가 상시 true 로 치환되어
    //   Rollup DCE 가 mock import 문 자체를 번들에서 제거 → fixture 파일이 없어도 빌드 성공.
    define: {
      __BUILD_MOCK__: JSON.stringify(process.env.MOCK_REPOS === '1'),
    },
  },
});
