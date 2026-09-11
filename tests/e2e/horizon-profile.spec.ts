import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

test.use({ serviceWorkers: 'block' });
const scriptErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  scriptErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(scriptErrors.get(page)).toEqual([]);
});

async function editor(page: Page) {
  await page.goto('./#/profile');
  await page.getByRole('button', { name: /^(지평선 꾸미기|Decorate horizon)$/ }).click();
  await expect(page.getByTestId('horizon-editor')).toBeVisible();
}

async function profile(page: Page) {
  return page.evaluate(
    async () =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const request = indexedDB.open('skylog');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const row = db
            .transaction('progress')
            .objectStore('progress')
            .index('key')
            .get('personal.profile');
          row.onsuccess = () => {
            resolve(row.result?.value ?? null);
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

// 공개 문항의 유효한 답 기록을 만든다. 보상·소유권·배지 플래그를 직접 심지 않는다.
async function seedQuizAttempts(page: Page, count: number) {
  await page.evaluate(async (n) => {
    const response = await fetch(new URL('data/learn/v1/quiz.json', document.baseURI));
    const questions = (await response.json()) as {
      id: string;
      version?: number;
      answer: number | boolean | string;
      enabled?: boolean;
      type: string;
    }[];
    const chosen = questions.filter((q) => q.enabled !== false && q.type !== 'skyPick').slice(0, n);
    if (chosen.length !== n) throw new Error('Missing quiz fixtures');
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open('skylog');
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        const transaction = db.transaction('progress', 'readwrite');
        for (const [i, q] of chosen.entries()) {
          const at = new Date(Date.UTC(2026, 8, 11, 0, i)).toISOString();
          transaction.objectStore('progress').put({
            id: crypto.randomUUID(),
            key: `learn.attempt:horizon-fixture-${i}`,
            value: { quizId: q.id, version: q.version ?? 1, answer: q.answer, at },
            createdAt: at,
            updatedAt: at,
            schemaVersion: 1,
          });
        }
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  }, count);
  await page.reload();
}

test('새 사용자는 벤치 하나로 시작하며 배치·크기·숨기기를 저장하고 하늘로 돌아간다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await editor(page);
  await expect(page.getByTestId('horizon-items').getByRole('button')).toHaveCount(1);
  await expect(page.getByRole('button', { name: '나무 벤치', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('horizon-profile-avatar')).toBeVisible();
  await page.getByRole('button', { name: '1번 자리', exact: true }).click();
  await page.getByRole('button', { name: '나무 벤치', exact: true }).click();
  await expect
    .poll(() => profile(page))
    .toMatchObject({ slots: ['bench', null, null, null, null] });
  await page.getByRole('button', { name: '표시', exact: true }).click();
  await page.getByRole('button', { name: '조금 크게', exact: true }).click();
  await expect.poll(() => profile(page)).toMatchObject({ sceneryScale: 'medium' });
  await page.getByRole('checkbox', { name: /하늘에 장식 표시/ }).click();
  await expect
    .poll(() => profile(page))
    .toMatchObject({ sceneryEnabled: false, slots: ['bench', null, null, null, null] });
  await page.reload();
  await expect(page.getByTestId('horizon-preview')).toHaveAttribute('data-scenery', 'hidden');
  await page.getByRole('button', { name: '지평선 꾸미기', exact: true }).click();
  await page.getByRole('button', { name: '표시', exact: true }).click();
  await page.getByRole('checkbox', { name: /하늘에 장식 표시/ }).click();
  await expect.poll(() => profile(page)).toMatchObject({ sceneryEnabled: true });
  await page.getByRole('button', { name: '하늘에서 보기', exact: true }).click();
  await expect(page).toHaveURL(/#\/sky$/);
});

test('실제 퀴즈 답 기록을 다시 채점해 장식·지면을 해금하고 선택한 모습을 보존한다', async ({
  page,
}) => {
  await editor(page);
  await page.getByRole('button', { name: /^해금할 장식/ }).click();
  await expect(page.getByRole('button', { name: '야외 식탁', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: '야외 식탁', exact: true }),
  ).toHaveAccessibleDescription(/새 퀴즈 5문제 첫 시도 연속 정답/);
  await page.getByRole('button', { name: '지면', exact: true }).click();
  await expect(page.getByRole('button', { name: '모래 지면', exact: true })).toBeDisabled();
  await seedQuizAttempts(page, 10);
  await page.getByRole('button', { name: '지평선 꾸미기', exact: true }).click();
  await expect(page.getByRole('button', { name: '야외 식탁', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '장초점 굴절망원경', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '야외 식탁', exact: true }).click();
  await expect
    .poll(() => profile(page))
    .toMatchObject({ slots: [null, null, 'picnic-table', null, null] });
  await page.getByRole('button', { name: '4번 자리', exact: true }).click();
  await page.getByRole('button', { name: '장초점 굴절망원경', exact: true }).click();
  await expect
    .poll(() => profile(page))
    .toMatchObject({ slots: [null, null, 'picnic-table', 'refractor-long', null] });
  await page.getByRole('button', { name: '지면', exact: true }).click();
  await page.getByRole('button', { name: '모래 지면', exact: true }).click();
  await expect.poll(() => profile(page)).toMatchObject({ ground: 'sand' });
  await page.reload();
  await expect(page.getByTestId('horizon-preview')).toHaveAttribute('data-ground', 'sand');
  await page.screenshot({ path: 'artifacts/qa-build20/profile-earned-ko.png' });
});

test('영어 125%와 야간 모드에서 지평선과 보상 목록이 넘치거나 밝은 색을 누출하지 않는다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await editor(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  for (const section of ['Place items', 'Ground', 'Display']) {
    await page.getByRole('button', { name: section, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Place items', exact: true }).click();
  await page.getByRole('button', { name: /^To unlock/ }).click();
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Newtonian reflector', exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('horizon-preview').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'artifacts/qa-build20/profile-horizon-en-large.png',
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'night';
  });
  const pixels = await sharp(await page.getByTestId('horizon-preview').screenshot())
    .removeAlpha()
    .raw()
    .toBuffer();
  let bright = 0,
    wrong = 0;
  for (let i = 0; i < pixels.length; i += 3)
    if (pixels[i]! > 20) {
      bright++;
      if (pixels[i + 1]! > 3 || pixels[i + 2]! > 3) wrong++;
    }
  expect(bright).toBeGreaterThan(100);
  expect(wrong / bright).toBeLessThan(0.001);
  await page.screenshot({ path: 'artifacts/qa-build20/profile-horizon-night.png', fullPage: true });
});
