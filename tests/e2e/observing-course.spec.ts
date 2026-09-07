import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { QuizItem } from '../../src/learn/schema';
const quiz = JSON.parse(
  readFileSync('data-src/learn-raw/observing-quiz.json', 'utf8'),
) as QuizItem[];
test('관측·망원경은 독립적으로 시작하며 도장·영어·복원을 유지한다', async ({ page }) => {
  await page.goto('#/learn');
  await page.getByTestId('quiz-track-observing').click();
  await expect(page.getByTestId('stage-observing-1-observing')).toBeEnabled();
  await expect(page.getByTestId('stage-observing-1-design')).toBeDisabled();
  await page.screenshot({ path: 'tests/e2e/__screenshots__/observing-journey.png' });
  await page.getByTestId('learn-quiz-start').click();
  for (const q of quiz.slice(0, 5)) {
    await expect(page.getByTestId('quiz-question')).toHaveText(q.question.ko);
    await page.getByTestId('quiz-choice-' + q.answer).click();
    await page.getByTestId('quiz-next').click();
    await expect(page.getByTestId('quiz-explanation')).toContainText(q.explanation.ko);
    await page.getByTestId('quiz-next').click();
  }
  await expect(page.getByTestId('stage-result')).toContainText('1000');
  await page.getByTestId('quiz-results').getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByTestId('quiz-track-sky').click();
  await expect(page.getByTestId('journey-total')).toContainText('0');
  await page.getByTestId('quiz-track-observing').click();
  await page.reload();
  await expect(page.getByTestId('journey-total')).toContainText('1,000');
  await expect(page.getByTestId('stage-observing-1-design')).toBeEnabled();
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn?track=observing');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByTestId('stage-observing-1-observing').click();
  await expect(page.getByTestId('quiz-question')).toHaveText(quiz[0]!.question.en!);
  await page.getByTestId('quiz-choice-' + quiz[0]!.answer).click();
  await page.getByTestId('quiz-next').click();
  await expect(page.getByTestId('quiz-explanation')).toContainText(quiz[0]!.explanation.en!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tests/e2e/__screenshots__/observing-quiz-en.png' });
});
