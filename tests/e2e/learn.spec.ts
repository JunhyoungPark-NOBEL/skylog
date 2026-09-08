import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('업적 48개의 단계 필터·빈 획득 목록·한영 목표와 숫자 진도', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/learn?section=achievements');
  const screen = page.getByTestId('achievements-screen');
  await expect(screen).toBeVisible();
  await expect(screen.locator('article')).toHaveCount(48);
  await expect(screen.getByRole('progressbar').first()).toHaveAttribute('aria-valuemax', '48');
  await expect(screen.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '0');
  const objects = page.getByTestId('badge-challenge-observed-objects-10');
  await expect(objects).toContainText('서로 다른 천체·별자리 10개');
  await expect(objects.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(objects.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '10');
  await expect(page.getByTestId('next-badges').locator('li')).toHaveCount(3);

  for (const [tier, count] of [
    ['starter', 17],
    ['explorer', 17],
    ['master', 14],
  ] as const) {
    await page.getByTestId('badge-tier-' + tier).click();
    await expect(page.getByTestId('badge-tier-' + tier)).toHaveAttribute('aria-pressed', 'true');
    await expect(screen.locator('article')).toHaveCount(count);
    await expect(page.getByTestId('next-badges')).toHaveCount(0);
  }
  await expect(page.getByTestId('badge-challenge-messier-count-110')).toBeAttached();
  await expect(objects).toHaveCount(0);
  await page.getByTestId('badge-tier-all').click();
  await screen.getByRole('button', { name: '모은 업적만 보기' }).click();
  await expect(screen.locator('article')).toHaveCount(0);
  await expect(screen).toContainText('아직 모은 업적이 없어요');
  await screen.getByRole('button', { name: '모은 업적만 보기' }).click();
  await expect(screen.locator('article')).toHaveCount(48);

  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn?section=achievements');
  await expect(page.getByTestId('badge-tier-master')).toHaveText('Long-term');
  await expect(objects).toContainText('Ten discoveries');
  await expect(objects).toContainText('0 / 10 completed');
  await expect(objects).toContainText('Record 10 different objects or constellations as seen.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('관측 저장·같은 대상 재기록·새로고침 뒤 업적과 고유 대상/메모/밤 진도 보존', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  for (let i = 0; i < 2; i++) {
    await page.goto('#/log');
    await page.getByTestId('log-add').click();
    await page.getByTestId('quickpick-input').fill('moon');
    await page.getByTestId('quickpick-item').filter({ hasText: '달' }).first().click();
    await page
      .getByTestId('obs-notes')
      .fill('달의 밝은 가장자리와 어두운 바다의 모양을 자세히 비교해서 기록했어요.');
    await page.getByTestId('obs-save').click();
    await expect(page.getByTestId('observation-form')).toHaveCount(0);
    await expect(page.getByTestId('log-item')).toHaveCount(i + 1);
  }
  await page.goto('#/learn?section=achievements');
  const first = page.getByTestId('badge-badge-first-look');
  await expect(first).toContainText('획득');
  for (const [id, total] of [
    ['observed-objects-10', 10],
    ['detailed-objects-5', 5],
    ['observation-nights-3', 3],
  ] as const) {
    const progress = page.getByTestId('badge-challenge-' + id).getByRole('progressbar');
    await expect(progress).toHaveAttribute('aria-valuenow', '1');
    await expect(progress).toHaveAttribute('aria-valuemax', String(total));
  }
  await page.reload();
  await expect(first).toContainText('획득');
  await expect(page.getByTestId('badge-challenge-observed-objects-10')).toContainText(
    '1 / 10 달성',
  );
  await page
    .getByTestId('achievements-screen')
    .getByRole('button', { name: '모은 업적만 보기' })
    .click();
  await expect(page.getByTestId('achievements-screen').locator('article')).toHaveCount(1);
  await expect(first).toBeVisible();
  await page.goto('#/log');
  await expect(page.getByTestId('log-item')).toHaveCount(2);
  expect(errors).toEqual([]);
});
