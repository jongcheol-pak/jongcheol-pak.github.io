// Playwright E2E 설정 (C-2)
// - 회귀 방지용 최소 스모크 테스트 1~2 케이스만 유지
// - webServer 가 자동으로 `npm run preview` 실행 → 빌드된 dist 가 필요하므로 사전 `npm run build` 실행 필요
// - 브라우저는 chromium 만 (테스트 표면 최소화)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
