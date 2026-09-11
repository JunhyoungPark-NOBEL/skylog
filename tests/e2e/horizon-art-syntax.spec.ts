import { expect, test } from '@playwright/test';

/** SVG 경로 문법 오류는 pageerror가 아니라 console.error로 전달되므로 두 경로를 모두 검사한다. */
test('보유 및 잠긴 장식 21종 전체가 브라우저 SVG 문법 오류 없이 그려진다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (event) => {
    if (event.type() === 'error') errors.push(event.text());
  });
  await page.goto('./#/profile');
  await page.getByRole('button', { name: '지평선 꾸미기', exact: true }).click();
  const cards = page.getByTestId('horizon-items');
  await expect(cards.getByRole('button')).toHaveCount(1);
  await expect(cards.getByRole('button', { name: '나무 벤치', exact: true })).toBeEnabled();
  const owned = await cards
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
  await expect(page.getByTestId('horizon-profile-avatar')).toBeVisible();
  await page.getByRole('button', { name: /^해금할 장식/ }).click();
  await expect(cards.getByRole('button')).toHaveCount(20);
  const locked = await cards
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
  expect(new Set([...owned, ...locked]).size).toBe(21);
  // 모든 물품을 실제 DOM에 만들고 브라우저의 경로 파서·배치까지 실행한다.
  const bounds = await cards.locator('svg path').evaluateAll((paths) =>
    paths.map((path) => {
      const box = (path as SVGGraphicsElement).getBBox();
      return [box.x, box.y, box.width, box.height];
    }),
  );
  expect(bounds.length).toBeGreaterThan(60);
  expect(bounds.flat().every(Number.isFinite)).toBe(true);
  await page.getByRole('button', { name: '작은 풀숲', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/qa-build21/horizon-all-items-valid.png' });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(errors).toEqual([]);
});
