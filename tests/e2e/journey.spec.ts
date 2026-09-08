import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { QuizItem } from '../../src/learn/schema';
import { QUIZ_STAGES } from '../../src/learn/stages';
const quiz = JSON.parse(readFileSync('public/data/learn/v1/quiz.json', 'utf8')) as QuizItem[];
const first = QUIZ_STAGES[0]!,
  second = QUIZ_STAGES[1]!;
async function finish(page: Page) {
  for (const ref of first.questions) {
    const q = quiz.find((q) => q.id === ref.id)!;
    await expect(page.getByTestId('quiz-question')).toHaveText(q.question.ko);
    const choice = q.type === 'trueFalse' ? (q.answer ? 0 : 1) : Number(q.answer);
    await page.getByTestId('quiz-choice-' + choice).click();
    await page.getByTestId('quiz-next').click();
    await expect(page.getByTestId('quiz-explanation')).toBeVisible();
    await page.getByTestId('quiz-next').click();
  }
  await expect(page.getByTestId('stage-result')).toContainText('1000점');
}
test('스테이지 완주·재도전·백업 복원과 개인 최고점', async ({ page, browser, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/learn');
  await expect(page.getByTestId('stage-' + first.id)).toBeEnabled();
  await expect(page.getByTestId('stage-' + second.id)).toBeDisabled();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/journey-home.png' });
  await page.getByTestId('learn-quiz-start').click();
  await finish(page);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/stage-stamp.png' });
  await page.getByTestId('stage-continue').click();
  await expect(page.getByTestId('quiz-question')).toHaveText(
    quiz.find((q) => q.id === second.questions[0]!.id)!.question.ko,
  );
  await page.getByTestId('quiz-host').getByLabel('닫기', { exact: true }).click();
  await expect(page.getByTestId('journey-total')).toContainText('1,000');
  await expect(page.getByTestId('stage-' + second.id)).toBeEnabled();
  await page.getByTestId('stage-' + first.id).click();
  await finish(page);
  await page.getByTestId('quiz-results').getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload();
  await expect(page.getByTestId('journey-total')).toContainText('1,000');
  await page.goto('#/backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  const path = await download.path();
  const data = JSON.parse(readFileSync(path!, 'utf8'));
  expect(
    data.data.progress.filter((r: { key: string }) => r.key.startsWith('learn.stage:')),
  ).toHaveLength(2);
  const other = await browser.newContext({
    baseURL,
    viewport: { width: 412, height: 915 },
    timezoneId: 'Asia/Seoul',
  });
  try {
    const restored = await other.newPage();
    await restored.goto('#/backup');
    await restored.getByTestId('import-file').setInputFiles(path!);
    await expect(restored.getByTestId('import-preview')).toBeVisible();
    await restored.getByTestId('import-run').click();
    await restored.goto('#/learn');
    await expect(restored.getByTestId('journey-total')).toContainText('1,000');
    await expect(restored.getByTestId('stage-' + second.id)).toBeEnabled();
  } finally {
    await other.close();
  }
  expect(errors).toEqual([]);
});
test('분리된 학습 탐색·이야기 검색·뒤로 가기·좁은 화면·키보드', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/learn');
  await expect(page.getByTestId('quiz-journey')).toBeVisible();
  await expect(page.getByTestId('courses-screen')).toHaveCount(0);
  await page.getByTestId('learn-tab-courses').click();
  await page.getByTestId('course-theme-naked').click();
  await expect(page.getByTestId('path-naked-first-directions')).toBeVisible();
  await page.getByTestId('path-naked-first-directions').click();
  await page.getByTestId('mission-any-moon-phase').click();
  await page.goBack();
  await expect(page.getByTestId('mission-any-moon-phase')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('courses-screen')).toBeVisible();
  await page.getByTestId('learn-tab-stories').click();
  await page.getByTestId('tab-log').click();
  await page.getByTestId('tab-learn').click();
  await expect(page.getByTestId('learn-tab-stories')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('story-search').fill('M31');
  await page.getByTestId('story-dso:M31').click();
  await expect(page.getByTestId('story-view')).toHaveAttribute('data-object-id', 'dso:M31');
  await page.getByTestId('story-host').getByTestId('back').click();
  await page.getByTestId('learn-tab-achievements').click();
  await expect(page.getByTestId('achievements-screen')).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/learn-badges.png' });
  const tab = page.getByTestId('learn-tab-achievements');
  await tab.focus();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('learn-tab-quiz')).toBeFocused();
  await expect(page.getByTestId('learn-tab-quiz')).toHaveAttribute('aria-selected', 'true');
  for (const name of ['quiz', 'courses', 'stories', 'achievements']) {
    const box = await page.getByTestId('learn-tab-' + name).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  }
  await page.getByTestId('learn-quiz-start').click();
  await expect(page.getByTestId('quiz-choice-0')).toBeVisible();
  await page.getByTestId('quiz-host').getByLabel('닫기', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('quiz-choice-0')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('quiz-host').getByLabel('닫기', { exact: true })).toBeFocused();
  await page.getByTestId('quiz-choice-0').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('quiz-choice-1')).toBeFocused();
  await expect(page.getByTestId('quiz-choice-1')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('quiz-host')).toHaveCount(0);
  await expect(page.getByTestId('learn-quiz-start')).toBeFocused();
  await page.goto('#/settings');
  await page.locator('#setting-night').click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn');
  await expect(page.getByRole('heading', { name: 'Learn', exact: true })).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/journey-night-en.png' });
  await page.getByTestId('learn-tab-courses').click();
  await page.getByTestId('course-theme-naked').click();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/learn-courses-en.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
