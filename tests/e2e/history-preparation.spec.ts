import { expect, test, type Locator, type Page } from '@playwright/test';
import { HISTORY_LESSONS } from '../../src/learn/historyLessons';
import { HISTORY_QUESTS } from '../../src/learn/historyQuests';
import { HISTORY_NARRATIVES } from '../../src/learn/historyNarrative';

test.use({ serviceWorkers: 'block' });
const path = '#/learn?section=quiz&track=physics&quest=eratosthenes-earth';
const questionId = 'eratosthenes-circumference';
const lesson = HISTORY_LESSONS[questionId]!;
async function goToStep(page: Page, n: number, english = false) {
  await page.getByText(english ? 'Go to a step' : '단계 이동', { exact: true }).click();
  await page.getByRole('button', { name: english ? `Step ${n}` : `${n}단계`, exact: true }).click();
}

async function progress(page: Page) {
  return page.evaluate(
    async () =>
      new Promise<{ key: string; value: unknown }[]>((resolve, reject) => {
        const request = indexedDB.open('skylog');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const row = db.transaction('progress').objectStore('progress').getAll();
          row.onsuccess = () => {
            resolve(row.result as { key: string; value: unknown }[]);
            db.close();
          };
          row.onerror = () => {
            reject(row.error);
            db.close();
          };
        };
      }),
  );
}

async function holdTerm(page: Page, term: Locator, drag: boolean) {
  // 고정 하단 탭바도 viewport 안에 있다. 가려진 용어를 누르지 않도록 본문 중앙에 둔다.
  await term.evaluate((node) =>
    node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
  );
  await term.click({ trial: true });
  const box = (await term.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    if (drag)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - 35 }],
      });
    // 실제 브라우저의 450ms 길게 누르기 문턱을 지난다. 이동한 손가락에는 열리지 않아야 한다.
    await page.waitForTimeout(550);
    if (drag) await expect(page.getByTestId('history-glossary-dialog')).toHaveCount(0);
    else await expect(page.getByTestId('history-glossary-dialog')).toBeVisible();
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (!drag) await expect(page.getByTestId('history-glossary-dialog')).toBeVisible();
  } finally {
    await session.detach();
  }
}

test('관측 단계는 오답 재도전과 두 정답을 저장하고 채점 문항 점수를 올리지 않는다', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(path);
  const prep = page.getByTestId('history-preparation');
  await expect(prep).toBeVisible();
  await expect(page.getByTestId('history-main-content')).toBeHidden();
  const term = prep.locator('.history-term').first();
  await term.scrollIntoViewIfNeeded();
  await term.tap();
  await expect(page.getByTestId('history-glossary-dialog')).toHaveCount(0);
  await holdTerm(page, term, true);
  await holdTerm(page, term, false);
  await expect(page.getByTestId('history-glossary-dialog')).toContainText('천정각');
  await page.touchscreen.tap(5, 5);
  await expect(page.getByTestId('history-glossary-dialog')).toHaveCount(0);
  await holdTerm(page, term, false);
  await page.getByRole('button', { name: '용어 설명 닫기', exact: true }).click();
  await expect(term).toBeFocused();
  const mouseBox = (await term.boundingBox())!;
  await page.mouse.move(mouseBox.x + mouseBox.width / 2, mouseBox.y + mouseBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(550);
  await expect(page.getByTestId('history-glossary-dialog')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId('history-glossary-dialog')).toBeVisible();
  await page.getByRole('button', { name: '용어 설명 닫기', exact: true }).click();
  await page
    .getByTestId('history-story-step')
    .evaluate((node) => node.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('story-step-1-ko-360.png') });
  for (let i = 0; i < lesson.warmups.length; i++) {
    const step = lesson.warmups[i]!;
    const right = step.choices.findIndex((c) => c.id === step.answerId);
    const wrong = (right + 1) % step.choices.length;
    await expect(prep.getByRole('heading')).toHaveText(step.prompt.ko);
    await prep.getByRole('radio').nth(wrong).check();
    await prep.getByRole('button', { name: '생각 확인하기', exact: true }).click();
    await expect(page.getByTestId('preparation-feedback')).toContainText('한 번 더 생각해 볼까요?');
    await expect(page.getByTestId('history-main-content')).toBeHidden();
    await prep.getByRole('radio').nth(right).check();
    await prep.getByRole('button', { name: '생각 확인하기', exact: true }).click();
    await expect(page.getByTestId('preparation-feedback')).toContainText(
      '맞아요. 이렇게 이어집니다.',
    );
    await expect(page.getByTestId('history-step-count')).toHaveText(`단계 ${i + 1} / 9`);
    await prep.getByRole('button', { name: /다음으로/ }).click();
    if (i === 0) await page.screenshot({ path: testInfo.outputPath('story-step-2-ko-360.png') });
  }
  await expect(page.getByTestId('history-main-content')).toBeVisible();
  await expect(page.getByTestId('history-step-count')).toHaveText('단계 3 / 9');
  await expect(page.getByTestId('history-numeric')).toHaveValue('');
  await expect(page.getByTestId('history-result')).toHaveCount(0);
  const rows = await progress(page);
  const saved = rows.find((r) => r.key === 'learn.preparation:' + questionId)!.value as {
    answers: Record<string, string[]>;
  };
  for (const step of lesson.warmups) {
    expect(saved.answers[step.id]).toContain(step.answerId);
    expect(saved.answers[step.id]).toHaveLength(2);
  }
  expect(
    rows.filter((r) => r.key.startsWith('learn.history:') || r.key.startsWith('learn.stage:')),
  ).toEqual([]);
  await page.reload();
  await expect(page.getByTestId('history-main-content')).toBeVisible();
  await expect(page.getByTestId('history-preparation')).toHaveCount(0);
  await expect(page.getByTestId('history-result')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/qa-history-preparation/completed-warmups-ko.png' });
  await page.getByRole('button', { name: /이야기 목록/ }).click();
  await expect(page.getByTestId('history-quest-eratosthenes-earth')).toContainText('0/3');
  expect(errors).toEqual([]);
});

test('단계 이동은 정답으로 기록되지 않고 새로고침하면 아직 풀지 않은 관측 단계로 돌아온다', async ({
  page,
}) => {
  await page.goto(path);
  await goToStep(page, 3);
  await expect(page.getByTestId('history-main-content')).toBeVisible();
  expect((await progress(page)).filter((r) => r.key.startsWith('learn.preparation:'))).toEqual([]);
  await page.reload();
  await expect(page.getByTestId('history-preparation')).toBeVisible();
  await expect(page.getByTestId('history-main-content')).toBeHidden();
  await expect(page.getByTestId('history-step-count')).toHaveText('단계 1 / 9');
  await expect(page.getByTestId('history-result')).toHaveCount(0);
});

test('영어 야간 360px·125% 글자에서 본 문제 관계식의 아래첨자가 직립체이고 가로로 넘치지 않는다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/settings');
  await page.locator('#setting-night').click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('#/learn?section=quiz&track=physics&quest=kepler-orbits');
  await page.getByText('Story chapters', { exact: true }).click();
  await page.getByRole('button', { name: /Why closer means faster/ }).click();
  await goToStep(page, 6, true);
  const main = page.getByTestId('history-main-content');
  await main.getByText('Diagram and useful relationships', { exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  await expect(main.getByTestId('history-math').first()).toBeVisible();
  const subscripts = main.locator('.katex-html .msupsub .mathrm');
  expect(await subscripts.count()).toBeGreaterThan(0);
  for (const sub of await subscripts.all()) await expect(sub).toHaveCSS('font-style', 'normal');
  expect(await main.locator('msub > mi[mathvariant="normal"]').count()).toBeGreaterThan(0);
  await expect(main.getByTestId('history-math-fallback')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await main.getByTestId('history-math').first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/qa-history-preparation/formulas-night-en-360.png' });
  expect(errors).toEqual([]);
});

test('하나의 발견을 1→9단계로 이어가며 장 경계를 되짚어도 정답·힌트 기록이 유지된다', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(path);
  const quest = HISTORY_QUESTS[0]!;
  for (let chapter = 0; chapter < quest.questions.length; chapter++) {
    const question = quest.questions[chapter]!;
    const steps = HISTORY_LESSONS[question.id]!.warmups;
    await expect(page.getByTestId('history-step-count')).toHaveText(`단계 ${chapter * 3 + 1} / 9`);
    if (chapter > 0) {
      await page.getByRole('button', { name: '← 이전으로', exact: true }).click();
      await expect(page.getByTestId('history-step-count')).toHaveText(`단계 ${chapter * 3} / 9`);
      await expect(page.getByTestId('history-result')).toContainText('누적 1회 풀이');
      await page.getByRole('button', { name: /이야기 이어가기/ }).click();
    }
    for (let local = 0; local < steps.length; local++) {
      const step = steps[local]!;
      await expect(page.getByTestId('history-step-count')).toHaveText(
        `단계 ${chapter * 3 + local + 1} / 9`,
      );
      await page
        .getByTestId('history-preparation')
        .getByRole('radio')
        .nth(step.choices.findIndex((c) => c.id === step.answerId))
        .check();
      await page.getByRole('button', { name: '생각 확인하기', exact: true }).click();
      await page.getByRole('button', { name: /다음으로/ }).click();
    }
    await expect(page.getByTestId('history-step-count')).toHaveText(`단계 ${chapter * 3 + 3} / 9`);
    if (question.type === 'numeric')
      await page.getByTestId('history-numeric').fill(String(question.answer));
    else
      await page
        .getByTestId('history-question')
        .getByRole('radio')
        .nth(question.options.findIndex((c) => c.id === question.answerId))
        .check();
    await page.getByRole('button', { name: '답 확인', exact: true }).click();
    await expect(page.getByTestId('history-result')).toContainText('잘 풀었습니다');
    if (chapter < quest.questions.length - 1)
      await page.getByRole('button', { name: /이야기 이어가기/ }).click();
  }
  const saved = (await progress(page)).filter((r) => r.key.startsWith('learn.history:'));
  expect(saved).toHaveLength(3);
  for (const row of saved)
    expect(row.value).toMatchObject({ attempts: [expect.objectContaining({ hints: 0 })] });
  await page.getByTestId('history-finish').click();
  await expect(page.getByTestId('history-ending')).toBeVisible();
  await expect(page.getByTestId('history-ending')).toContainText(
    HISTORY_NARRATIVES[quest.id]!.ending.ko,
  );
  await expect(page.getByTestId('history-ending-score')).toContainText('3/3');
  expect((await progress(page)).filter((r) => r.key.startsWith('learn.history:'))).toEqual(saved);
  await page.screenshot({ path: testInfo.outputPath('story-ending-ko-360.png') });
  await page.reload();
  await page.getByTestId('history-read-ending').click();
  await expect(page.getByTestId('history-ending')).toBeVisible();
  await page.getByRole('button', { name: /다른 이야기 고르기/ }).click();
  await expect(page.getByTestId('history-quest-eratosthenes-earth')).toContainText('3/3');
  await expect(page.getByTestId('history-screen')).toContainText('힌트 없이 3문제');
  await page.screenshot({ path: testInfo.outputPath('story-complete-ko-360.png') });
});

test('6단계 미저장 답과 메모는 5→4→3으로 되짚고 다른 장에서 돌아와도 남는다', async ({ page }) => {
  await page.goto(path);
  await page.getByText('이야기 순서', { exact: true }).click();
  await page.getByRole('button', { name: /숫자는 얼마나 믿을 만할까/ }).click();
  await goToStep(page, 6);
  await page.getByTestId('history-numeric').fill('1.94');
  const note = '거리와 각도의 독립 상대 불확도를 제곱해 더한다.';
  await page.getByRole('textbox', { name: /나의 풀이 메모/ }).fill(note);
  for (const n of [5, 4, 3]) {
    await page.getByRole('button', { name: '← 이전으로', exact: true }).click();
    await expect(page.getByTestId('history-step-count')).toHaveText(`단계 ${n} / 9`);
  }
  // 첫 장에서는 별도의 초안을 만든다. 둘째 장의 답을 덮어쓰면 안 된다.
  await page.getByTestId('history-numeric').fill('40010');
  await page.getByText('이야기 순서', { exact: true }).click();
  await page.getByRole('button', { name: /숫자는 얼마나 믿을 만할까/ }).click();
  await goToStep(page, 6);
  await expect(page.getByTestId('history-numeric')).toHaveValue('1.94');
  await expect(page.getByRole('textbox', { name: /나의 풀이 메모/ })).toHaveValue(note);
  expect((await progress(page)).filter((r) => r.key.startsWith('learn.history:'))).toEqual([]);
  await page.getByRole('button', { name: '입력·메모 저장', exact: true }).click();
  await expect(page.getByText('저장했습니다.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText('이야기 순서', { exact: true }).click();
  await page.getByRole('button', { name: /숫자는 얼마나 믿을 만할까/ }).click();
  await expect(page.getByTestId('history-numeric')).toHaveValue('1.94');
  await expect(page.getByRole('textbox', { name: /나의 풀이 메모/ })).toHaveValue(note);
});
