import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
const email = 'login-fixture@example.invalid';
const user = {
  id: '00000000-0000-4000-8000-000000000007',
  email,
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-09-09T00:00:00Z',
};
function session() {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url');
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fixture`,
    refresh_token: 'fixture-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    user,
  };
}
async function mockAuth(page: Page) {
  const calls = { emails: 0, exchanges: 0, verifier: false };
  // 모든 Supabase 호출을 먼저 차단한다. 테스트 메일·댓글·실제 사용자 세션은 만들지 않는다.
  await page.route('**/*.supabase.co/**', (route) => route.abort());
  await page.route('**/auth/v1/otp?*', async (route) => {
    calls.emails++;
    await route.fulfill({ json: {} });
  });
  await page.route('**/auth/v1/token?grant_type=pkce', async (route) => {
    const body = route.request().postDataJSON() as { code_verifier?: string };
    calls.exchanges++;
    calls.verifier = typeof body.code_verifier === 'string' && body.code_verifier.length >= 43;
    await route.fulfill({ json: session() });
  });
  await page.route('**/auth/v1/user', (route) => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', (route) => {
    const member = route.request().url().includes('/sky_members?');
    return route.fulfill({ json: member ? [{ name: '로그인 테스트' }] : [] });
  });
  return calls;
}
async function requestMail(page: Page) {
  await page.goto('./#/account');
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByRole('button', { name: '로그인 메일 받기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '이제 메일을 확인해 주세요' })).toBeVisible();
}
test('메일 요청한 브라우저는 PKCE를 확인하고 콜백 URL을 지운다', async ({ page }) => {
  const calls = await mockAuth(page);
  await requestMail(page);
  await page.goto('./?code=same-browser-fixture-code');
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '로그인 테스트', exact: true })).toBeVisible();
  expect(calls).toEqual({ emails: 1, exchanges: 1, verifier: true });
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);
  expect(
    await page.evaluate(() => localStorage.getItem('skylog.community.pending-email')),
  ).toBeNull();
});
test('다른 브라우저에서 실패한 링크를 원래 홈 화면 앱에 붙여넣어 로그인한다', async ({
  page,
  browser,
  baseURL,
}) => {
  const calls = await mockAuth(page);
  await requestMail(page);
  const external = await browser.newContext({
    locale: 'ko-KR',
    viewport: { width: 360, height: 780 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
    serviceWorkers: 'block',
  });
  try {
    const mail = await external.newPage();
    const outsideCalls = await mockAuth(mail);
    await mail.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            (window as unknown as { copiedRecovery: string }).copiedRecovery = value;
          },
        },
      });
    });
    await mail.goto(new URL('?code=cross-browser-fixture-code', baseURL).href);
    await expect(mail.getByRole('button', { name: '복구 링크 복사', exact: true })).toBeVisible();
    await expect(mail.getByRole('link', { name: '설치한 앱에서 계속' })).toHaveCount(0);
    expect(outsideCalls.exchanges).toBe(0);
    expect(new URL(mail.url()).search).toBe('');
    await mail.getByRole('button', { name: '복구 링크 복사', exact: true }).click();
    const copied = await mail.evaluate(
      () => (window as unknown as { copiedRecovery: string }).copiedRecovery,
    );
    await page.getByText('로그인이 안 되나요?', { exact: true }).click();
    await page.getByLabel('로그인 링크 붙여넣기', { exact: true }).fill(copied);
    await page.getByRole('button', { name: '이 앱에서 로그인 확인', exact: true }).click();
    await expect(page.getByRole('heading', { name: '로그인 테스트', exact: true })).toBeVisible();
    expect(calls.exchanges).toBe(1);
    expect(calls.verifier).toBe(true);
  } finally {
    await external.close();
  }
});
test('Android 외부 콜백은 설치 앱 복귀를 제공하고 새 요청은 접어 둔다', async ({ page }) => {
  await mockAuth(page);
  await page.goto('./?code=android-return-fixture-code');
  const link = page.getByRole('link', { name: '설치한 앱에서 계속', exact: true });
  await expect(link).toHaveAttribute(
    'href',
    'io.github.junhyoungparknobel.skylog://login?code=android-return-fixture-code',
  );
  await expect(page.getByLabel('이메일', { exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'artifacts/screenshots/auth-android-recovery-ko.png',
    fullPage: true,
  });
});
test('만료·서버 오류 콜백은 비밀값을 남기지 않으며 새 메일 요청을 제공한다', async ({ page }) => {
  const calls = await mockAuth(page);
  await page.goto(
    './#error=access_denied&error_code=otp_expired&error_description=fixture-private-detail&access_token=fixture-private-token',
  );
  await expect(page.getByRole('alert')).toContainText('만료되었거나 이미 사용됐어요');
  await expect(page.getByRole('button', { name: '로그인 메일 받기', exact: true })).toBeVisible();
  expect(page.url()).not.toMatch(/fixture-private|error_code|access_token/);
  expect(await page.locator('body').innerText()).not.toContain('fixture-private');
  expect(calls.exchanges).toBe(0);
});
test('메일 확인 단계는 새로고침 후 복원하며 잘못된 링크를 소비하거나 표시하지 않는다', async ({
  page,
}) => {
  const calls = await mockAuth(page);
  await requestMail(page);
  await page.reload();
  await expect(page.getByLabel('이메일', { exact: true })).toHaveValue(email);
  await expect(page.getByRole('button', { name: /초 후 다시 받기/ })).toBeDisabled();
  await page.getByText('로그인이 안 되나요?', { exact: true }).click();
  await page
    .getByLabel('로그인 링크 붙여넣기', { exact: true })
    .fill('https://untrusted.invalid/?code=private-fixture');
  await page.getByRole('button', { name: '이 앱에서 로그인 확인', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('로그인 링크인지 확인');
  await expect(page.getByLabel('로그인 링크 붙여넣기', { exact: true })).toHaveValue('');
  expect(calls.exchanges).toBe(0);
  expect(calls.emails).toBe(1);
});
test('영어 360px 큰 글자의 로그인 안내는 화면을 넘지 않는다', async ({ page }) => {
  await mockAuth(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.goto('./?code=large-text-fixture-code');
  await expect(page.getByRole('button', { name: 'Copy recovery link', exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'artifacts/screenshots/auth-recovery-en-large.png',
    fullPage: true,
  });
});

test('이미 로그인된 외부 브라우저도 복구를 표시하고 현재 계정·로컬 북마크를 보존한다', async ({
  page,
}) => {
  const calls = await mockAuth(page);
  const existing = { ...session(), expires_at: Math.floor(Date.now() / 1000) + 3600 };
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('skylog.community.auth'))
      localStorage.setItem('skylog.community.auth', JSON.stringify(saved));
  }, existing);
  await page.goto('./#/account');
  await expect(page.getByRole('heading', { name: '로그인 테스트', exact: true })).toBeVisible();
  const bookmark = {
    id: 'login-preserved-bookmark',
    objectId: 'moon',
    note: '원래 기기의 북마크',
    createdAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z',
    schemaVersion: 1,
  };
  await page.evaluate(
    (row) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('skylog');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('bookmarks', 'readwrite');
          transaction.objectStore('bookmarks').put(row);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    bookmark,
  );
  await page.goto('./?code=external-existing-account-fixture');
  const panel = page.getByTestId('signed-in-login-callback');
  await expect(panel).toContainText(email);
  await expect(panel.getByRole('alert')).toContainText('다른 브라우저');
  await expect(panel.getByRole('button', { name: '복구 링크 복사', exact: true })).toBeVisible();
  await expect(panel.getByRole('link', { name: '설치한 앱에서 계속', exact: true })).toBeVisible();
  await expect(page.getByLabel('이메일', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toHaveCount(0);
  expect(calls.exchanges).toBe(0);
  expect(calls.emails).toBe(0);
  expect(new URL(page.url()).search).toBe('');
  await page.screenshot({ path: 'artifacts/screenshots/auth-existing-account-recovery.png' });
  await panel.getByRole('button', { name: '현재 계정으로 돌아가기', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '로그인 테스트', exact: true })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('skylog.community.auth') ?? 'null'),
  );
  expect(saved.user).toEqual(existing.user);
  expect(saved.refresh_token).toBe(existing.refresh_token);
  const retained = await page.evaluate(
    (id) =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open('skylog');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const row = db.transaction('bookmarks').objectStore('bookmarks').get(id);
          row.onsuccess = () => {
            db.close();
            resolve(row.result);
          };
          row.onerror = () => {
            db.close();
            reject(row.error);
          };
        };
      }),
    bookmark.id,
  );
  expect(retained).toEqual(bookmark);
});

test('기존 세션 위의 느린 콜백은 확인 중과 만료를 구분하고 계정 작업을 잠시 가린다', async ({
  page,
}) => {
  await mockAuth(page);
  const existing = { ...session(), expires_at: Math.floor(Date.now() / 1000) + 3600 };
  await page.addInitScript((saved) => {
    localStorage.setItem('skylog.community.auth', JSON.stringify(saved));
    localStorage.setItem(
      'skylog.community.auth-code-verifier',
      JSON.stringify('fixture-verifier-'.repeat(4)),
    );
  }, existing);
  let release!: () => void;
  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/auth/v1/token?grant_type=pkce', async (route) => {
    await paused;
    await route.fulfill({
      status: 400,
      headers: {
        'x-supabase-api-version': '2024-01-01',
        // 교차 출처 응답에서도 SDK가 API 버전을 읽어 JSON의 code 필드를 해석한다.
        'access-control-expose-headers': 'x-supabase-api-version',
      },
      json: { code: 'flow_state_expired', message: 'Fixture expired' },
    });
  });
  try {
    await page.goto('./?code=slow-existing-account-fixture');
    await expect(page.getByRole('status')).toContainText('로그인을 확인하고 있어요');
    await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toHaveCount(0);
    const panel = page.getByTestId('signed-in-login-callback');
    // getSession도 SDK 잠금을 기다릴 수 있어 세션 복원 직전에는 게스트 확인 안내가 먼저 보인다.
    if (await panel.count())
      await expect(
        panel.getByRole('button', { name: '현재 계정으로 돌아가기', exact: true }),
      ).toBeDisabled();
    release();
    await expect(panel.getByRole('alert')).toContainText('만료되었거나 이미 사용됐어요');
    await expect(panel).toContainText(email);
    await panel.getByRole('button', { name: '현재 계정으로 돌아가기', exact: true }).click();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('skylog.community.auth') ?? 'null').refresh_token,
      ),
    ).toBe(existing.refresh_token);
  } finally {
    release();
  }
});
