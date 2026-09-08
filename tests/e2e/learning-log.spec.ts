import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { QuizItem } from '../../src/learn/schema';
const quiz = JSON.parse(readFileSync('public/data/learn/v1/quiz.json', 'utf8')) as QuizItem[];
test('기록·스케치·퀴즈·백업 복원 흐름', async ({ page, browser, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/log');
  await page.getByTestId('log-add').click();
  await page.getByTestId('quickpick-input').fill('moon');
  await page.getByTestId('quickpick-item').filter({ hasText: '달' }).first().click();
  await expect(page.getByTestId('obs-save')).toBeEnabled();
  await page.getByTestId('obs-rating-4').click();
  await page.getByTestId('obs-notes').fill('달의 밝은 부분과 가장자리를 봤어요.');
  await page.getByTestId('obs-sketch-open').click();
  const box = await page.getByTestId('sketch-surface').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.55, { steps: 12 });
  await page.mouse.up();
  await page.getByTestId('sketch-save').click();
  await expect(page.getByTestId('obs-sketch-thumb')).toBeVisible();
  const photo = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 2000;
    c.height = 1000;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, 2000, 1000);
    return c.toDataURL('image/png').split(',')[1]!;
  });
  await page.getByTestId('obs-photo-library').setInputFiles({
    name: 'test-moon.png',
    mimeType: 'image/png',
    buffer: Buffer.from(photo, 'base64'),
  });
  await expect(page.getByTestId('obs-photo-0')).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId('obs-photo-0').evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBe(1600);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/observation-form.png' });
  await page.getByTestId('obs-save').click();
  await expect(page.getByTestId('observation-form')).toHaveCount(0);
  await page.getByTestId('toast-action').click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId('quiz-question')).toBeVisible();
    const question = await page.getByTestId('quiz-question').innerText();
    const q = quiz.find((q) => q.question.ko === question)!;
    expect(q).toBeTruthy();
    const answer = q.type === 'trueFalse' ? (q.answer ? 0 : 1) : Number(q.answer);
    await page.getByTestId('quiz-choice-' + answer).click();
    await page.getByTestId('quiz-next').click();
    await expect(page.getByTestId('quiz-explanation')).toBeVisible();
    if (i === 0) await page.screenshot({ path: 'tests/e2e/__screenshots__/quiz-feedback.png' });
    await page.getByTestId('quiz-next').click();
  }
  await expect(page.getByTestId('quiz-results')).toBeVisible();
  await page
    .getByTestId('quiz-host')
    .getByRole('button', { name: '닫기', exact: true })
    .last()
    .click();
  await expect(page.getByTestId('log-item')).toHaveCount(1);
  await page.getByTestId('log-view-calendar').click();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/log-calendar.png' });
  await page.getByTestId('log-view-byObject').click();
  await page.getByTestId('log-view-timeline').click();
  await page.getByTestId('log-item').click();
  await page.getByTestId('detail-edit').click();
  await page.getByTestId('obs-notes').fill('수정한 달 기록');
  await page.getByTestId('obs-save').click();
  await page.goto('#/backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  const file = await download.path();
  expect(file).not.toBeNull();
  const bundle = JSON.parse(readFileSync(file!, 'utf8'));
  expect(bundle.data.observations).toHaveLength(1);
  expect(bundle.data.observations[0].notes).toBe('수정한 달 기록');
  expect(Object.keys(bundle.blobs)).toHaveLength(2);
  expect(
    bundle.data.progress.filter((x: { key: string }) => x.key.startsWith('learn.attempt:')),
  ).toHaveLength(3);
  const other = await browser.newContext({
    baseURL,
    viewport: { width: 412, height: 915 },
    timezoneId: 'Asia/Seoul',
  });
  try {
    const restore = await other.newPage();
    await restore.goto('#/backup');
    await restore.getByTestId('import-file').setInputFiles(file!);
    await expect(restore.getByTestId('import-preview')).toBeVisible();
    await restore.getByTestId('import-run').click();
    await restore.goto('#/log');
    await expect(restore.getByTestId('log-item')).toHaveCount(1);
    await restore.getByTestId('log-item').click();
    await expect(restore.getByTestId('detail-notes')).toContainText('수정한 달 기록');
    await expect(restore.getByTestId('detail-image')).toHaveCount(2);
  } finally {
    await other.close();
  }
  await page.goto('#/log');
  await page.getByTestId('log-item').click();
  await page.getByTestId('detail-delete').click();
  await page.getByTestId('detail-delete-confirm').click();
  await page.getByTestId('toast-action').click();
  await expect(page.getByTestId('log-item')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('이야기 읽음·미션 진도·퀴즈와 영어 화면', async ({ page }) => {
  await page.goto('#/learn');
  await expect(page.getByTestId('learn-screen')).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/learn-home.png' });
  await page.getByTestId('learn-tab-courses').click();
  await page.getByTestId('course-theme-naked').click();
  await page.getByTestId('path-naked-first-directions').click();
  await page.getByTestId('mission-any-moon-phase').click();
  await page.getByTestId('mission-start').click();
  await page
    .getByTestId('mission-detail')
    .getByRole('button', { name: /이야기 읽기/ })
    .first()
    .click();
  await expect(page.getByTestId('story-view')).toHaveAttribute('data-object-id', 'moon');
  await page.screenshot({ path: 'tests/e2e/__screenshots__/story-moon.png' });
  await page.getByTestId('story-mark-read').click();
  await page.getByTestId('story-host').getByTestId('back').click();
  await expect(page.getByTestId('mission-progress')).toContainText('1단계');
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn');
  await expect(page.getByRole('heading', { name: 'Learn', exact: true })).toBeVisible();
  await page.getByTestId('learn-quiz-start').click();
  await expect(page.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  await page.getByTestId('quiz-choice-0').click();
  await expect(page.getByRole('button', { name: 'Check answer' })).toBeEnabled();
});
test('이야기 첫 열람 뒤 새로고침·오프라인 재열람', async ({ page, context }) => {
  await page.goto('#/learn');
  await expect(page.getByTestId('learn-screen')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByTestId('learn-screen')).toBeVisible();
  await page.getByTestId('learn-tab-courses').click();
  await page.getByTestId('course-theme-naked').click();
  await page.getByTestId('path-naked-first-directions').click();
  await page.getByTestId('mission-any-moon-phase').click();
  await page.getByTestId('mission-start').click();
  await page
    .getByRole('button', { name: /이야기 읽기/ })
    .first()
    .click();
  await expect(page.getByTestId('story-view')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const c = await caches.open('skylog-content');
        return (await c.keys()).some((r) => r.url.includes('moon.json'));
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('learn-screen')).toBeVisible();
  await page
    .getByRole('button', { name: /이야기 읽기/ })
    .first()
    .click();
  await expect(page.getByTestId('story-view')).toBeVisible();
  await context.setOffline(false);
});

test('상세 시트의 이야기·글자 크기·길잡이 링크가 실제 화면으로 이어진다', async ({ page }) => {
  await page.goto('#/search');
  await page.getByTestId('search-input').fill('M31');
  await expect(
    page.getByTestId('search-result').first().getByTestId('search-result-name'),
  ).toHaveText('안드로메다은하');
  await page.getByTestId('search-result').first().click();
  await page.getByTestId('sheet-story').click();
  await expect(page.getByTestId('story-view')).toHaveAttribute('data-object-id', 'dso:M31');
  const para = page.getByTestId('story-story').locator('p');
  const before = await para.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  await page.getByTestId('story-font').click();
  expect(await para.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(
    before,
  );
  const hop = page.locator('[data-testid^="story-hop-"]').first();
  await expect(hop).toBeVisible();
  await hop.click();
  await expect(page.getByTestId('story-host')).toHaveCount(0);
  await expect(page.getByTestId('object-sheet')).toBeVisible();
});
