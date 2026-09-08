import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

test.use({ serviceWorkers: 'block' });

async function openEditor(page: Page) {
  await page.goto('./#/profile');
  await page.getByRole('button', { name: /^(아바타|Avatar)$/ }).click();
  await expect(page.getByTestId('avatar-current')).toBeVisible();
}

async function readProfile(page: Page) {
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

test('아바타 미리보기는 취소·뒤로에서 저장되지 않고 적용한 모습은 재실행 뒤 남는다', async ({
  page,
}) => {
  await openEditor(page);
  const before = await readProfile(page);
  await page.getByRole('button', { name: '라벤더', exact: true }).click();
  await page.getByRole('button', { name: '포근한 후디', exact: true }).click();
  expect(await readProfile(page)).toEqual(before);
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await openEditor(page);
  await expect(page.getByRole('button', { name: '세이지', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '멜빵 바지', exact: true }).click();
  await page.getByTestId('back').click();
  expect(await readProfile(page)).toEqual(before);
  await openEditor(page);
  await page.getByRole('button', { name: '포근한 후디', exact: true }).click();
  await page.getByRole('button', { name: '라벤더', exact: true }).click();
  await page.getByRole('button', { name: '머리', exact: true }).click();
  await page.getByRole('button', { name: '모자 없이', exact: true }).click();
  await page.getByRole('button', { name: '물결 머리', exact: true }).click();
  await page.getByRole('button', { name: '구리빛', exact: true }).click();
  await page.getByRole('button', { name: '얼굴', exact: true }).click();
  await page.getByRole('button', { name: '윙크', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '이 모습 적용', exact: true }).click();
  await expect
    .poll(() => readProfile(page))
    .toMatchObject({
      suit: 'lavender',
      outfit: 'hoodie',
      hat: 'none',
      hair: 'waves',
      hairColor: 'copper',
      expression: 'wink',
    });
  await page.reload();
  await openEditor(page);
  await expect(page.getByRole('button', { name: '포근한 후디', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: 'artifacts/screenshots/avatar-clothes-ko.png' });
});

test('코디 보관·불러오기·되돌리기·교체·삭제는 적용 모습과 분리된다', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: '라벤더', exact: true }).click();
  await page.getByTestId('avatar-looks').locator('summary').click();
  const first = page.getByTestId('avatar-look-0');
  await first.getByRole('textbox').fill('달빛 산책');
  await first.getByRole('button', { name: '이 코디 보관', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('미리보던 코디를 보관했어요.');
  expect(await readProfile(page)).toBeNull();
  await page.getByRole('button', { name: '햇살 노랑', exact: true }).click();
  await first.getByRole('button', { name: '꺼내 입어보기', exact: true }).click();
  await expect(page.getByRole('button', { name: '라벤더', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '한 단계 되돌리기', exact: true }).click();
  await expect(page.getByRole('button', { name: '햇살 노랑', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await first.getByRole('button', { name: '지금 코디로 교체', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('미리보던 코디를 보관했어요.');
  await page.reload();
  await openEditor(page);
  await page.getByTestId('avatar-looks').locator('summary').click();
  await expect(first.getByRole('textbox')).toHaveValue('달빛 산책');
  await first.getByRole('button', { name: '꺼내 입어보기', exact: true }).click();
  await expect(page.getByRole('button', { name: '햇살 노랑', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await first.getByRole('button', { name: '비우기', exact: true }).click();
  await expect(first.getByRole('button', { name: '이 코디 보관', exact: true })).toBeVisible();
});

test('보상 조건을 보여 주며 추천 코디는 미획득 보상을 선택하지 않는다', async ({ page }) => {
  await openEditor(page);
  await expect(page.getByRole('button', { name: '탐험 우주복', exact: true })).toBeDisabled();
  await expect(page.getByText('퀴즈 스테이지 5개 완료')).toBeVisible();
  await page.getByRole('button', { name: '소품', exact: true }).click();
  await expect(page.getByRole('button', { name: '작은 쌍안경', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: '작은 쌍안경', exact: true }),
  ).toHaveAccessibleDescription('첫 관측 기록 0 / 1');
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: '새 코디 추천', exact: true }).click();
    await expect(page.getByRole('button', { name: '가볍게 나가기', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await page.getByRole('button', { name: '업적 보러 가기', exact: true }).click();
  await expect(page.getByTestId('achievements-screen')).toBeVisible();
});

test('영어 125% 작은 화면에서 꾸미기 부위·보관함은 넘치지 않고 야간 미리보기는 적색이다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await openEditor(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  for (const name of ['Face', 'Hair', 'Clothes', 'Gear']) {
    await page.getByRole('button', { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByTestId('avatar-looks').locator('summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Hair', exact: true }).click();
  await page.getByRole('button', { name: 'No hat', exact: true }).click();
  await page.getByRole('button', { name: 'Waves', exact: true }).click();
  await page.getByRole('button', { name: 'Copper', exact: true }).click();
  await page.getByTestId('avatar-current').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/screenshots/avatar-en-large.png' });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'night';
  });
  const pixels = await sharp(await page.getByTestId('avatar-current').locator('svg').screenshot())
    .removeAlpha()
    .raw()
    .toBuffer();
  let bright = 0,
    bad = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    if (pixels[i]! > 20) {
      bright++;
      if (pixels[i + 1]! > 3 || pixels[i + 2]! > 3) bad++;
    }
  }
  expect(bright).toBeGreaterThan(100);
  expect(bad / bright).toBeLessThan(0.001);
  await page.screenshot({ path: 'artifacts/screenshots/avatar-night.png' });
});
