import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { DEFAULT_AVATAR, type AvatarLook } from '../../src/personal/avatar';

test.use({ serviceWorkers: 'block' });
const me = '00000000-0000-4000-8000-000000000081';
const other = '00000000-0000-4000-8000-000000000082';
const postId = '00000000-0000-4000-8000-000000000083';
function session() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: me, role: 'authenticated', exp })).toString('base64url')}.fixture`,
    refresh_token: 'fixture-only',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    user: {
      id: me,
      email: 'fixture@example.invalid',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-09-10T00:00:00Z',
    },
  };
}
async function fixtures(page: Page, signedIn = false) {
  const state = {
    name: '별빛 산책',
    avatar: { ...DEFAULT_AVATAR } as AvatarLook,
    writes: [] as Record<string, unknown>[],
    failNext: false,
  };
  await page.addInitScript(
    (auth) => {
      if (auth) localStorage.setItem('skylog.community.auth', JSON.stringify(auth));
    },
    signedIn ? session() : null,
  );
  await page.route('**/*.supabase.co/**', (route) => route.abort());
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: session().user }));
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    if (table === 'sky_update_profile') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      state.writes.push(body);
      if (state.failNext) {
        state.failNext = false;
        await route.fulfill({ status: 503, json: { code: 'offline', message: 'REQUEST_FAILED' } });
        return;
      }
      state.name = String(body.display_name);
      state.avatar = body.look as AvatarLook;
      await route.fulfill({ json: null });
      return;
    }
    let rows: unknown[] = [];
    if (table === 'sky_members') {
      const members = [
        { id: me, name: state.name, avatar: state.avatar },
        { id: other, name: '오래된 관측자' },
      ];
      rows = members.filter(
        (member) => !url.searchParams.has('id') || url.searchParams.get('id')!.includes(member.id),
      );
    }
    if (table === 'sky_posts')
      rows = [
        {
          id: postId,
          owner: me,
          object_id: 'moon',
          caption: '별마당에서 본 달',
          equipment: '테스트 예시',
          kind: 'capture',
          status: 'published',
          created_at: '2026-09-10T12:00:00Z',
        },
      ];
    if (table === 'sky_comments')
      rows = [
        {
          id: '00000000-0000-4000-8000-000000000084',
          owner: me,
          post_id: postId,
          body: '달빛이 밝았어요.',
          status: 'published',
          created_at: '2026-09-10T12:01:00Z',
        },
        {
          id: '00000000-0000-4000-8000-000000000085',
          owner: other,
          post_id: postId,
          body: '함께 봐요.',
          status: 'published',
          created_at: '2026-09-10T12:02:00Z',
        },
      ];
    const single = route.request().headers().accept?.includes('vnd.pgrst.object');
    await route.fulfill({ json: single ? (rows[0] ?? null) : rows });
  });
  await page.route('**/functions/v1/community?*', (route) =>
    route.fulfill({
      json: {
        signedUrl:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#152a43"/><circle cx="100" cy="100" r="60" fill="#d2d4c9"/></svg>',
          ),
      },
    }),
  );
  return state;
}
async function seedObservations(page: Page) {
  await page.evaluate(async () => {
    const quiz = (await fetch(new URL('data/learn/v1/quiz.json', document.baseURI)).then((r) =>
      r.json(),
    )) as { id: string; version?: number; enabled?: boolean; type: string; answer: unknown }[];
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('skylog');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['observations', 'progress'], 'readwrite');
        const ids = [
          'const:Ori',
          'const:Cas',
          'dso:M31',
          'dso:M42',
          'dso:M45',
          'star:HIP91262',
          'star:HIP102098',
          'star:HIP97649',
        ];
        ids.forEach((objectId, i) => {
          const date = `2026-09-${String(7 + (i % 3)).padStart(2, '0')}`;
          const at = date + 'T12:00:00Z';
          tx.objectStore('observations').put({
            id: crypto.randomUUID(),
            objectId,
            observedAt: at,
            nightKey: date,
            outcome: 'seen',
            site: { lat: 36.37, lon: 127.36 },
            notes: '격리 자동 검사의 관측 예시',
            tags: [],
            createdAt: at,
            updatedAt: at,
            schemaVersion: 1,
          });
        });
        quiz
          .filter((q) => q.enabled !== false && q.type !== 'skyPick')
          .slice(0, 3)
          .forEach((q, i) => {
            const id = crypto.randomUUID();
            const at = `2026-09-10T12:0${i}:00Z`;
            tx.objectStore('progress').put({
              id,
              key: 'learn.attempt:' + id,
              value: { quizId: q.id, version: q.version ?? 1, answer: q.answer, correct: true, at },
              createdAt: at,
              updatedAt: at,
              schemaVersion: 1,
            });
          });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  });
  await page.reload();
}

test('실제 관측·퀴즈 기록의 보상을 장착하고 닉네임+아바타를 명시적으로 동기화한다', async ({
  page,
}) => {
  const state = await fixtures(page, true);
  await page.goto('./#/profile');
  await page.getByRole('button', { name: '아바타', exact: true }).click();
  await page.getByRole('button', { name: '배경', exact: true }).click();
  await expect(page.getByRole('button', { name: '오리온 별자리', exact: true })).toBeDisabled();
  await page.goto('./#/profile');
  await seedObservations(page);
  await page.getByRole('button', { name: '아바타', exact: true }).click();
  await page.getByRole('button', { name: '배경', exact: true }).click();
  for (const name of ['오리온 별자리', '달빛 언덕', '나선은하'])
    await expect(page.getByRole('button', { name, exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '토성의 고리', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '나선은하', exact: true }).click();
  await page.getByRole('button', { name: '머리', exact: true }).click();
  await expect(page.getByRole('button', { name: '유성 관측 모자', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '별빛 왕관', exact: true }).click();
  await page
    .getByTestId('avatar-current')
    .screenshot({ path: 'artifacts/qa-community-identity/earned-galaxy-crown.png' });
  await page.getByRole('button', { name: '이 모습 적용', exact: true }).click();
  expect(state.writes).toHaveLength(0);
  const form = page.getByTestId('public-profile-sync');
  await form.getByRole('textbox', { name: '공개 닉네임', exact: true }).fill('은하수 산책자');
  state.failNext = true;
  await form.getByRole('button', { name: '이 닉네임과 모습 공개 동기화', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(form.getByRole('textbox')).toHaveValue('은하수 산책자');
  await form.getByRole('button', { name: '이 닉네임과 모습 공개 동기화', exact: true }).click();
  await expect(form.getByRole('status')).toContainText('동기화했어요');
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1]).toEqual({
    display_name: '은하수 산책자',
    look: { ...DEFAULT_AVATAR, hat: 'starcrown', background: 'galaxy' },
    expected_user: me,
  });
  await page.reload();
  await expect(page.getByTestId('public-profile-sync').getByRole('textbox')).toHaveValue(
    '은하수 산책자',
  );
  await page.goto('./#/community');
  await expect(page.getByTestId('author-identity')).toContainText('은하수 산책자');
  await page.getByRole('button', { name: /별마당에서 본 달/ }).click();
  await expect(page.getByTestId('author-avatar')).toHaveCount(3);
  await expect(
    page.getByTestId('comments-panel').getByText('은하수 산책자', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId('comments-panel').getByText('오래된 관측자', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'artifacts/qa-community-identity/public-authors-ko.png',
    fullPage: true,
  });
  await expect(page.getByText('fixture@example.invalid', { exact: true })).toHaveCount(0);
});

test('공개 원형 아바타의 야간 적색과 작은 영문 화면, 구형 작성자 폴백을 유지한다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const state = await fixtures(page);
  state.avatar = { ...DEFAULT_AVATAR, hat: 'meteorcap', background: 'saturn' };
  state.name = 'Stargazer of the night';
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto(`./#/community?post=${postId}`);
  await expect(page.getByTestId('author-avatar')).toHaveCount(3);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
    document.documentElement.dataset.theme = 'night';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const pixels = await sharp(await page.getByTestId('author-avatar').first().screenshot())
    .removeAlpha()
    .raw()
    .toBuffer();
  let bright = 0,
    bad = 0;
  for (let i = 0; i < pixels.length; i += 3)
    if (pixels[i]! > 20) {
      bright++;
      if (pixels[i + 1]! > 3 || pixels[i + 2]! > 3) bad++;
    }
  expect(bright).toBeGreaterThan(100);
  expect(bad / bright).toBeLessThan(0.001);
  await page.screenshot({
    path: 'artifacts/qa-community-identity/public-authors-en-night.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
