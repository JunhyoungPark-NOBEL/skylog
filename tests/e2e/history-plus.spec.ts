import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });

test('역사 문제의 단계 힌트·숫자 답·메모·재도전과 새로고침 보존', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/learn?section=quiz&track=physics');
  await expect(page.getByTestId('history-screen')).toBeVisible();
  await expect(page.getByTestId('plus-notice')).toContainText('베타 미리보기');
  await page.getByTestId('history-quest-eratosthenes-earth').click();
  await page.getByText('단계 이동', { exact: true }).click();
  await page.getByRole('button', { name: '3단계', exact: true }).click();
  await expect(page.getByTestId('history-question')).toBeVisible();
  await expect(page.getByTestId('history-result')).toHaveCount(0);
  const input = page.getByTestId('history-numeric');
  await input.fill('2+3');
  await expect(page.getByRole('button', { name: '답 확인', exact: true })).toBeDisabled();
  await input.fill('4e4');
  await page.getByRole('textbox', { name: /나의 풀이 메모/ }).fill('C = 800 × 360 / 7.2');
  await page.getByTestId('history-hint').click();
  await expect(page.getByTestId('history-hint')).toContainText('2 / 3');
  await expect(page.getByTestId('history-result')).toHaveCount(0);
  await page.reload();
  await expect(input).toHaveValue('4e4');
  await expect(page.getByRole('textbox', { name: /나의 풀이 메모/ })).toHaveValue(
    'C = 800 × 360 / 7.2',
  );
  await expect(page.getByTestId('history-hint')).toContainText('2 / 3');
  await page.getByRole('button', { name: '답 확인', exact: true }).click();
  await expect(page.getByTestId('history-result')).toContainText('잘 풀었습니다');
  await expect(page.getByTestId('history-result')).toContainText('이번 풀이 힌트 1개');
  await expect(input).toBeDisabled();
  await page.getByRole('button', { name: '힌트 없이 다시 풀기' }).click();
  await expect(page.getByTestId('history-result')).toHaveCount(0);
  await input.fill('40,000');
  await page.getByRole('button', { name: '답 확인', exact: true }).click();
  await expect(page.getByTestId('history-result')).toContainText('누적 2회 풀이');
  await expect(page.getByTestId('history-result')).toContainText('이번 풀이 힌트 0개');
  await page.getByRole('button', { name: /이야기 목록/ }).click();
  await expect(page.getByTestId('history-screen')).toContainText('힌트 없이 1문제');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/qa-build18/history-library-ko.png' });
  expect(errors).toEqual([]);
});

test('Plus 미리보기는 가격과 준비 상태를 알리고 구매 완료로 가장하지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/plus');
  await expect(page.getByTestId('plus-screen')).toBeVisible();
  await expect(page.getByTestId('plus-offer')).toContainText('9,900원 1회 구매');
  await expect(page.getByTestId('plus-offer')).toContainText('결제는 진행되지 않습니다');
  await expect(page.getByRole('button', { name: /에 1회 구매/ })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/qa-build18/plus-preview-ko.png' });
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn?section=quiz&track=physics&quest=eratosthenes-earth');
  await expect(page.getByTestId('quiz-track-physics')).toHaveText('Astrophysics');
  await page.getByText('Go to a step', { exact: true }).click();
  await page.getByRole('button', { name: 'Step 3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check answer', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/qa-build18/history-question-en.png' });
});
