import { expect, test, type Page } from '@playwright/test';
import { HISTORY_QUESTS, type HistoryQuestion } from '../../src/learn/historyQuests';
import { HISTORY_NARRATIVES } from '../../src/learn/historyNarrative';
import { HISTORY_STORY } from '../../src/learn/historyStory';

test.use({ serviceWorkers: 'block', viewport: { width: 360, height: 800 } });
const path = (id: string) => '#/learn?section=quiz&track=physics&quest=' + id;
async function selectStep(page: Page, step: number) {
  await page.getByText('단계 이동', { exact: true }).click();
  await page.getByRole('button', { name: `${step}단계`, exact: true }).click();
}
async function submit(page: Page, question: HistoryQuestion, correct: boolean) {
  if (question.type === 'numeric')
    await page.getByTestId('history-numeric').fill(correct ? String(question.answer) : '0');
  else
    await page
      .getByTestId('history-question')
      .getByRole('radio')
      .nth(question.options.findIndex((o) => (o.id === question.answerId) === correct))
      .check();
  await page.getByRole('button', { name: '답 확인', exact: true }).click();
  await expect(page.getByTestId('history-result')).toBeVisible();
}

test('열 이야기의 도입과 장면이 서로 다르고 모바일에서 가로로 넘치지 않는다', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const quest of HISTORY_QUESTS) {
    await page.goto(path(quest.id));
    const narrative = HISTORY_NARRATIVES[quest.id]!;
    await expect(page.getByTestId('history-opening')).toContainText(narrative.opening.ko);
    await expect(page.getByTestId('history-scene')).toHaveText(narrative.chapters[0].scenes[0].ko);
    await expect(page.getByTestId('history-read-ending')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByTestId('history-opening').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${quest.id}-opening-360.png`) });
    await selectStep(page, 2);
    await expect(page.getByTestId('history-scene')).toHaveText(narrative.chapters[0].scenes[1].ko);
    await page.getByText('이야기 순서', { exact: true }).click();
    await page
      .getByRole('button', { name: new RegExp(HISTORY_STORY[quest.questions[2]!.id]!.title.ko) })
      .click();
    await selectStep(page, 9);
    await expect(page.getByTestId('history-scene')).toHaveText(narrative.chapters[2].scenes[2].ko);
    await expect(page.getByTestId('history-result')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('마지막 장만 풀면 남은 이야기로 안내하고 오답이 있어도 결말과 복습을 점수와 구별한다', async ({
  page,
}, info) => {
  const quest = HISTORY_QUESTS.find((q) => q.id === 'romer-light')!;
  const narrative = HISTORY_NARRATIVES[quest.id]!;
  await page.goto(path(quest.id));
  await page.getByText('이야기 순서', { exact: true }).click();
  await page
    .getByRole('button', { name: new RegExp(HISTORY_STORY[quest.questions[2]!.id]!.title.ko) })
    .click();
  await selectStep(page, 9);
  await submit(page, quest.questions[2]!, true);
  await expect(page.getByTestId('history-discovery')).toContainText(
    narrative.chapters[2].discovery.ko,
  );
  await expect(page.getByTestId('history-finish')).toContainText('남은 장면 이어가기');
  await page.getByTestId('history-finish').click();
  await expect(page.getByTestId('history-step-count')).toHaveText('단계 1 / 9');
  await expect(page.getByTestId('history-ending')).toHaveCount(0);
  await selectStep(page, 3);
  await submit(page, quest.questions[0]!, false);
  await expect(page.getByTestId('history-discovery')).toContainText(
    narrative.chapters[0].discovery.ko,
  );
  await expect(page.getByTestId('history-read-ending')).toHaveCount(0);
  await page.getByRole('button', { name: /이야기 이어가기/ }).click();
  await selectStep(page, 6);
  await submit(page, quest.questions[1]!, true);
  await page.getByTestId('history-read-ending').click();
  await expect(page.getByTestId('history-ending')).toContainText(narrative.ending.ko);
  await expect(page.getByTestId('history-ending-score')).toContainText('2/3');
  await expect(
    page.getByTestId('history-ending').getByText('해설과 함께 복습하기', { exact: true }),
  ).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('romer-ending-review-360.png') });
  await page.getByRole('button', { name: '첫 장면 다시 보기', exact: true }).click();
  await expect(page.getByTestId('history-step-count')).toHaveText('단계 1 / 9');
  await selectStep(page, 3);
  await expect(page.getByTestId('history-result')).toContainText('누적 1회 풀이');
  await page.reload();
  await page.getByTestId('history-read-ending').click();
  await expect(page.getByTestId('history-ending-score')).toContainText('2/3');
  await page.getByRole('button', { name: /다른 이야기 고르기/ }).click();
  await expect(page.getByTestId('history-quest-romer-light')).toContainText('2/3');
});
