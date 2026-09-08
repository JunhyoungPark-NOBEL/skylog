import { test, expect } from '@playwright/test';
import sharp from 'sharp';
test.use({ serviceWorkers: 'block' });
test('영어 큰 글자와 야간 마당은 넘침과 밝은 색 번짐이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('./#/profile');
  await expect(page.getByRole('heading', { name: 'My garden', exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/community-garden-en-large.png' });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'night';
  });
  const pixels = await sharp(await page.locator('svg.personal-art').screenshot())
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
  await page.screenshot({ path: 'artifacts/screenshots/community-garden-night.png' });
});
test('무료 마당은 작은 화면과 키보드에서 꾸미고 재실행해도 유지된다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/profile');
  await expect(page.getByRole('heading', { name: '별빛 아래, 나만의 자리' })).toBeVisible();
  await page.getByRole('button', { name: '마당 꾸미기', exact: true }).click();
  await page.getByRole('button', { name: '1번 자리', exact: true }).click();
  await page.getByRole('button', { name: '조약돌', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '조약돌', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({
    path: 'artifacts/screenshots/community-garden-edit-ko.png',
    fullPage: true,
  });
  await page.getByTestId('back').click();
  await page.getByRole('button', { name: '아바타', exact: true }).click();
  await page.getByRole('button', { name: '라벤더', exact: true }).click();
  await expect(page.getByRole('button', { name: '라벤더', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('textbox', { name: '마당 이름' }).fill('별이 머무는 곳');
  await page.getByRole('heading', { name: '아바타', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const req = indexedDB.open('skylog');
        return new Promise<string>((resolve, reject) => {
          req.onsuccess = () => {
            const db = req.result;
            const q = db
              .transaction('progress')
              .objectStore('progress')
              .index('key')
              .get('personal.profile');
            q.onsuccess = () => {
              resolve(q.result?.value?.name || '');
              db.close();
            };
            q.onerror = () => reject(q.error);
          };
        });
      }),
    )
    .toBe('별이 머무는 곳');
  await page.reload();
  await expect(page.getByRole('heading', { name: '별이 머무는 곳' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/community-garden-ko.png', fullPage: true });
});
test('사진 모음과 상세를 분리하고 본문·옵션을 읽을 수 있다', async ({ page }) => {
  const id = '00000000-0000-4000-8000-000000000099';
  const post = {
    id,
    owner: 'photographer',
    object_id: 'moon',
    caption: '달이 구름 사이로 나온 순간',
    equipment: '쌍안경과 휴대폰',
    kind: 'capture',
    status: 'published',
    created_at: '2026-09-08T12:00:00Z',
  };
  await page.route('**/rest/v1/sky_posts?*', (r) => r.fulfill({ json: [post] }));
  await page.route('**/rest/v1/sky_members?*', (r) =>
    r.fulfill({ json: [{ id: 'photographer', name: '별빛 산책' }] }),
  );
  await page.route('**/rest/v1/sky_comments?*', (r) => r.fulfill({ json: [] }));
  await page.route('**/functions/v1/community?*', (r) =>
    r.fulfill({
      json: {
        signedUrl:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#16273a"/><circle cx="205" cy="190" r="95" fill="#e1dfcc"/><circle cx="178" cy="155" r="17" fill="#c4c7b8"/></svg>',
          ),
      },
    }),
  );
  await page.goto('./#/community');
  await expect(page.getByRole('heading', { name: '함께 보는 밤하늘' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '댓글', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /달이 구름 사이로 나온 순간/ }).click();
  await expect(page.getByRole('heading', { name: post.caption })).toBeVisible();
  await expect(page.getByRole('heading', { name: '댓글', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/community-photo-ko.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
