import { expect, test } from '@playwright/test';

/** SVG 경로 문법 오류는 pageerror가 아니라 console.error로 전달되므로 두 경로를 모두 검사한다. */
test('보유 및 잠긴 장식 20종 전체가 브라우저 SVG 문법 오류 없이 그려진다', async ({ page }) => {
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
  await expect(cards.getByRole('button')).toHaveCount(19);
  const locked = await cards
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
  expect(new Set([...owned, ...locked]).size).toBe(20);
  // 모든 물품을 실제 DOM에 만들고 브라우저의 경로 파서·배치까지 실행한다.
  const bounds = await cards.locator('svg path').evaluateAll((paths) =>
    paths.map((path) => {
      const box = (path as SVGGraphicsElement).getBBox();
      return [box.x, box.y, box.width, box.height];
    }),
  );
  expect(bounds.length).toBeGreaterThan(60);
  expect(bounds.flat().every(Number.isFinite)).toBe(true);
  await page.getByRole('button', { name: '별밤 강아지', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/qa-build23/horizon-all-items-valid.png' });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(errors).toEqual([]);
});

test('잠긴 풍경 4종의 그림과 전체 미리보기를 보고도 소유권·현재 배경은 바뀌지 않는다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (event) => {
    if (event.type() === 'error') errors.push(event.text());
  });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/profile');
  await page.getByRole('button', { name: '지평선 꾸미기', exact: true }).click();
  await page.getByRole('button', { name: '배경', exact: true }).click();
  const choices = page.getByTestId('horizon-backdrops');
  await expect(choices.locator('article')).toHaveCount(4);
  const artwork = await choices
    .locator('article > button > svg')
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        [...node.querySelectorAll('path')].map((path) => path.getAttribute('d')).join('|'),
      ),
    );
  expect(new Set(artwork).size).toBe(4);
  for (const [id, name] of [
    ['field', '푸른 언덕'],
    ['rocky-peaks', '바위산 능선'],
    ['snow-peaks', '눈 덮인 산맥'],
    ['sea', '고요한 바다'],
  ]) {
    const select = choices.getByRole('button', { name, exact: true });
    if (id !== 'field') await expect(select).toBeDisabled();
    const previewButton = choices.getByRole('button', { name: `${name} 미리보기`, exact: true });
    await previewButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('horizon-preview')).toHaveAttribute('data-backdrop', id!);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/qa-build23/backdrop-${id}-preview360.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(previewButton).toBeFocused();
  }
  await expect(page.getByTestId('horizon-preview')).toHaveAttribute('data-backdrop', 'field');
  await page.reload();
  await expect(page.getByTestId('horizon-preview')).toHaveAttribute('data-backdrop', 'field');
  await page.screenshot({ path: 'artifacts/qa-build23/profile-starter360.png' });
  expect(errors).toEqual([]);
});
