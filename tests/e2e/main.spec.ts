// 메인 대시보드 스모크 테스트 (C-2)
// - 케이스 1: 메인 진입 → `.repo-card` 1개 이상 visible
// - 케이스 2: 검색 박스에 매칭 안 되는 단어 입력 → visible 카드 수 감소 (필터 동작 회귀 방지)
//
// 사전 조건: `npm run build` 로 dist 가 빌드된 상태 (빈 카드는 mock 환경 — 그 경우 케이스 1 이 fail).
// CI 는 GITHUB_TOKEN 자동 주입 → 실데이터 빌드 → 카드 ≥1개.
import { test, expect } from '@playwright/test';

test('case 1: main page renders at least one repo card', async ({ page }) => {
  await page.goto('/');
  // 카드 그리드 존재
  await expect(page.locator('#card-grid')).toBeVisible();
  // 보이는 카드 1개 이상
  const visibleCards = page.locator('.repo-card:visible');
  await expect(visibleCards.first()).toBeVisible();
  expect(await visibleCards.count()).toBeGreaterThanOrEqual(1);
});

test('case 2: search filter reduces visible card count', async ({ page }) => {
  await page.goto('/');
  const visibleCards = page.locator('.repo-card:visible');
  const initialCount = await visibleCards.count();

  // 매칭 가능성이 매우 낮은 검색어로 결과를 0 으로 만든다
  await page.locator('#search-input').fill('zzznomatchxxx');
  // filter.ts 가 150ms debounce 후 적용 → 충분히 대기
  await page.waitForTimeout(400);

  const filteredCount = await visibleCards.count();
  expect(filteredCount).toBeLessThan(initialCount);
});
