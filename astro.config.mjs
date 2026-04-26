// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

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
