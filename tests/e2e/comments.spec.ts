import { test, expect, type Page, type Route } from '@playwright/test';
import type { CommunityComment, CommunityPost } from '../../src/community/types';

test.use({ serviceWorkers: 'block' });
const owner = '00000000-0000-4000-8000-000000000001';
const writer = '00000000-0000-4000-8000-000000000002';
const moderator = '00000000-0000-4000-8000-000000000003';
const other = '00000000-0000-4000-8000-000000000004';
const photoId = '00000000-0000-4000-8000-000000000100';
const pendingPhotoId = '00000000-0000-4000-8000-000000000101';
const id = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;
function comment(n: number, author = writer, status = 'published'): CommunityComment {
  return {
    id: id(n),
    owner: author,
    post_id: photoId,
    body: `댓글 ${n}`,
    status,
    created_at: '2026-09-09T00:00:00.000000Z',
  };
}
function session(userId: string) {
  const claims = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${claims}.test`,
    refresh_token: 'test-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'fixture@example.invalid',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-09-09T00:00:00Z',
    },
  };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
interface MockState {
  comments: CommunityComment[];
  posts: CommunityPost[];
  actions: { action: string; payload: Record<string, unknown>; actor: string }[];
  blocks: Set<string>;
  holdRead?: (actor: string, query: URLSearchParams) => Promise<void>;
  holdAction?: (action: string) => Promise<void>;
}
function actor(route: Route): string {
  try {
    return (
      JSON.parse(
        Buffer.from(
          route.request().headers().authorization?.split('.')[1] ?? '',
          'base64url',
        ).toString(),
      ).sub ?? ''
    );
  } catch {
    return '';
  }
}
async function rows(route: Route, data: unknown[]) {
  const single = route.request().headers().accept?.includes('vnd.pgrst.object');
  await route.fulfill({ json: single ? (data[0] ?? null) : data });
}
async function mockCommunity(
  page: Page,
  userId: string | null,
  initial: CommunityComment[] = [],
): Promise<MockState> {
  const state: MockState = {
    comments: initial,
    posts: [
      {
        id: photoId,
        owner,
        object_id: 'moon',
        caption: '댓글을 나눌 달 사진',
        equipment: '',
        kind: 'capture',
        status: 'published',
        created_at: '2026-09-09T00:00:00Z',
      },
    ],
    actions: [],
    blocks: new Set(),
  };
  await page.addInitScript(
    (auth) => {
      if (sessionStorage.getItem('comments-auth-seeded')) return;
      sessionStorage.setItem('comments-auth-seeded', 'yes');
      if (auth) localStorage.setItem('skylog.community.auth', JSON.stringify(auth));
      else localStorage.removeItem('skylog.community.auth');
    },
    userId ? session(userId) : null,
  );
  // 실제 서비스로 테스트 댓글·인증 요청이 나가지 않도록 나머지 Supabase 경로를 차단한다.
  await page.route('**/*.supabase.co/**', (route) => route.abort());
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({ json: actor(route) ? session(actor(route)).user : {} }),
  );
  await page.route('**/functions/v1/community?*', (route) =>
    route.fulfill({
      json: {
        signedUrl:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#16273a"/><circle cx="100" cy="60" r="35" fill="#bcb8ad"/></svg>',
          ),
      },
    }),
  );
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    const query = url.searchParams;
    const viewer = actor(route);
    const blocked = (person: string) =>
      state.blocks.has(`${viewer}:${person}`) || state.blocks.has(`${person}:${viewer}`);
    if (table === 'sky_action') {
      const body = route.request().postDataJSON() as {
        action: string;
        payload: Record<string, unknown>;
      };
      state.actions.push({ ...body, actor: viewer });
      await state.holdAction?.(body.action);
      const target = state.comments.find((row) => row.id === body.payload.id);
      if (body.action === 'comment')
        state.comments.push({
          ...comment(1000 + state.actions.length, viewer, 'pending'),
          body: String(body.payload.text),
          created_at: new Date().toISOString(),
        });
      else if (body.action === 'reviewComment' && viewer === moderator && target)
        target.status = String(body.payload.status);
      else if (body.action === 'deleteComment' && target?.owner === viewer)
        target.status = 'deleted';
      else if (body.action === 'block') state.blocks.add(`${viewer}:${String(body.payload.id)}`);
      await route.fulfill({ json: {} });
      return;
    }
    if (table === 'sky_posts') {
      let data = state.posts.filter(
        (post) =>
          post.owner === viewer ||
          viewer === moderator ||
          (post.status === 'published' && !blocked(post.owner)),
      );
      if (query.has('id')) data = data.filter((post) => 'eq.' + post.id === query.get('id'));
      if (query.get('status')?.startsWith('eq.'))
        data = data.filter((post) => 'eq.' + post.status === query.get('status'));
      await rows(route, data);
    } else if (table === 'sky_members') {
      let data = [owner, writer, moderator, other]
        .filter((member) => !blocked(member))
        .map((member) => ({
          id: member,
          name: member === writer ? '댓글 작성자' : member === moderator ? '운영자' : '별빛 산책',
        }));
      if (query.get('id')?.startsWith('eq.'))
        data = data.filter((member) => 'eq.' + member.id === query.get('id'));
      if (query.get('id')?.startsWith('in.'))
        data = data.filter((member) => query.get('id')!.includes(member.id));
      await rows(route, data);
    } else if (table === 'sky_moderators') {
      await rows(route, viewer === moderator ? [{ id: moderator }] : []);
    } else if (table === 'sky_comments') {
      let data = state.comments.filter(
        (row) =>
          row.owner === viewer ||
          viewer === moderator ||
          (row.status === 'published' && !blocked(row.owner)),
      );
      if (query.get('post_id'))
        data = data.filter((row) => 'eq.' + row.post_id === query.get('post_id'));
      if (query.get('status') === 'neq.deleted')
        data = data.filter((row) => row.status !== 'deleted');
      if (query.get('status')?.startsWith('eq.'))
        data = data.filter((row) => 'eq.' + row.status === query.get('status'));
      const filter = query.get('or');
      if (filter) {
        const time = filter.match(/created_at\.lt\.([^,]+)/)?.[1];
        const cursorId = filter.match(/id\.lt\.([0-9a-f-]+)/)?.[1];
        if (!time || !cursorId) throw new Error('Invalid comment cursor query');
        data = data.filter(
          (row) => row.created_at < time || (row.created_at === time && row.id < cursorId),
        );
      }
      data.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      if (!query.get('order')?.includes('desc')) data.reverse();
      const response = data.slice(0, Number(query.get('limit') ?? 100));
      await state.holdRead?.(viewer, query);
      await rows(route, response);
    } else {
      await rows(route, []);
    }
  });
  return state;
}
async function changeUser(page: Page, userId: string | null) {
  await page.evaluate(
    (auth) => {
      if (auth) localStorage.setItem('skylog.community.auth', JSON.stringify(auth));
      else localStorage.removeItem('skylog.community.auth');
      const channel = new BroadcastChannel('skylog.community.auth');
      channel.postMessage({ event: auth ? 'SIGNED_IN' : 'SIGNED_OUT', session: auth });
      channel.close();
    },
    userId ? session(userId) : null,
  );
}
async function openPhoto(page: Page) {
  await page.goto(`./#/community?post=${photoId}`);
  await expect(page.getByTestId('comments-panel')).toHaveAttribute('aria-busy', 'false');
}

test('사진 신고 사유와 댓글 초안을 분리하고 전송 중 입력을 막는다', async ({ page }) => {
  const state = await mockCommunity(page, writer);
  await openPhoto(page);
  await page.locator('details').first().locator('summary').click();
  await page.getByRole('textbox', { name: '어떤 점이 문제인가요?' }).fill('사진 신고 전용 사유');
  const draft = page.getByRole('textbox', { name: '댓글 쓰기' });
  await expect(draft).toHaveValue('');
  await draft.fill('달의 무늬가 잘 보이네요');
  const seen = deferred(),
    release = deferred();
  state.holdAction = async (action) => {
    if (action === 'comment') {
      seen.resolve();
      await release.promise;
    }
  };
  await page.getByRole('button', { name: '검토 요청', exact: true }).click();
  await seen.promise;
  await expect(draft).toBeDisabled();
  release.resolve();
  await expect(page.getByTestId('comments-panel')).toContainText('달의 무늬가 잘 보이네요');
  await expect(page.getByTestId('comments-panel')).toContainText('검토 대기');
  expect(state.actions[0]).toMatchObject({
    action: 'comment',
    payload: { text: '달의 무늬가 잘 보이네요' },
    actor: writer,
  });
  await expect(draft).toHaveValue('');
});

test('작성자만 대기 댓글을 보고 운영 승인 뒤 비로그인 독자에게 공개된다', async ({ page }) => {
  await mockCommunity(page, writer, [comment(1, writer, 'pending')]);
  await openPhoto(page);
  await expect(page.getByTestId(`comment-${id(1)}`)).toBeVisible();
  await changeUser(page, owner);
  await expect(page.getByTestId(`comment-${id(1)}`)).toHaveCount(0);
  await changeUser(page, moderator);
  await page.goto('./#/moderation');
  await page.getByRole('button', { name: '댓글', exact: true }).click();
  await expect(page.getByText('댓글 1', { exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept('내용과 맥락 확인'));
  await page.getByRole('button', { name: '공개 승인', exact: true }).click();
  await expect(page.getByText('댓글 1', { exact: true })).toHaveCount(0);
  await changeUser(page, null);
  await openPhoto(page);
  await expect(page.getByTestId(`comment-${id(1)}`)).toBeVisible();
  await expect(page.getByRole('textbox', { name: '댓글 쓰기' })).toHaveCount(0);
});

test('내 댓글 삭제와 다른 댓글 신고·차단은 올바른 대상을 처리한다', async ({ page }) => {
  const state = await mockCommunity(page, writer, [
    comment(1, writer, 'pending'),
    comment(2, other),
  ]);
  await openPhoto(page);
  const theirComment = page.getByTestId(`comment-${id(2)}`);
  await theirComment.locator('summary').click();
  page.once('dialog', (dialog) => dialog.accept('댓글의 개인정보 확인 요청'));
  await theirComment.getByRole('button', { name: '신고하기', exact: true }).click();
  await expect(page.getByTestId('comments-panel')).toHaveAttribute('aria-busy', 'false');
  expect(state.actions).toContainEqual({
    action: 'report',
    payload: { id: id(2), type: 'comment', text: '댓글의 개인정보 확인 요청' },
    actor: writer,
  });
  const mine = page.getByTestId(`comment-${id(1)}`);
  await mine.locator('summary').click();
  page.once('dialog', (dialog) => dialog.accept());
  await mine.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(mine).toHaveCount(0);
  await expect(page.getByTestId('comments-panel')).toHaveAttribute('aria-busy', 'false');
  page.once('dialog', (dialog) => dialog.accept());
  await theirComment.getByRole('button', { name: '이 사용자 차단', exact: true }).click();
  await expect(page).toHaveURL(/#\/community$/);
  await openPhoto(page);
  await expect(theirComment).toHaveCount(0);
  expect(state.blocks.has(`${writer}:${other}`)).toBe(true);
});

test('댓글이 100개를 넘어도 최신 댓글과 같은 시각의 이전 댓글을 빠짐없이 조회한다', async ({
  page,
}) => {
  await mockCommunity(
    page,
    writer,
    Array.from({ length: 121 }, (_, n) => comment(n + 1, other)),
  );
  await openPhoto(page);
  const panel = page.getByTestId('comments-panel');
  await expect(panel.locator('article')).toHaveCount(50);
  await expect(page.getByTestId(`comment-${id(121)}`)).toBeVisible();
  await expect(page.getByTestId(`comment-${id(1)}`)).toHaveCount(0);
  await page.getByRole('button', { name: '이전 댓글 더 보기', exact: true }).click();
  await expect(panel.locator('article')).toHaveCount(100);
  await page.getByRole('button', { name: '이전 댓글 더 보기', exact: true }).click();
  await expect(panel.locator('article')).toHaveCount(121);
  await expect(page.getByTestId(`comment-${id(1)}`)).toBeVisible();
  await page.getByRole('textbox', { name: '댓글 쓰기' }).fill('백 개 이후에도 보이는 새 댓글');
  await page.getByRole('button', { name: '검토 요청', exact: true }).click();
  await expect(panel.getByText('백 개 이후에도 보이는 새 댓글', { exact: true })).toBeVisible();
});

test('로그아웃 뒤 이전 계정의 늦은 대기 댓글 응답을 표시하지 않는다', async ({ page }) => {
  const state = await mockCommunity(page, writer, [comment(1, writer, 'pending')]);
  await openPhoto(page);
  const seen = deferred(),
    release = deferred();
  state.holdRead = async (viewer) => {
    if (viewer === writer) {
      seen.resolve();
      await release.promise;
    }
  };
  await page.getByRole('button', { name: '댓글 새로고침', exact: true }).click();
  await seen.promise;
  await changeUser(page, null);
  await expect(page.getByRole('textbox', { name: '댓글 쓰기' })).toHaveCount(0);
  release.resolve();
  await expect(page.getByTestId('comments-panel')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByTestId(`comment-${id(1)}`)).toHaveCount(0);
});

test('운영 검토 탭 전환 중 이전 사진 행을 댓글로 승인할 수 없다', async ({ page }) => {
  const state = await mockCommunity(page, moderator, [comment(1, writer, 'pending')]);
  state.posts.push({
    ...state.posts[0]!,
    id: pendingPhotoId,
    status: 'pending',
    caption: '이전 사진 검토 행',
  });
  await page.goto('./#/moderation');
  await expect(page.getByText('이전 사진 검토 행', { exact: true })).toBeVisible();
  const seen = deferred(),
    release = deferred();
  state.holdRead = async () => {
    seen.resolve();
    await release.promise;
  };
  await page.getByRole('button', { name: '댓글', exact: true }).click();
  await seen.promise;
  await expect(page.getByText('이전 사진 검토 행', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '공개 승인', exact: true })).toHaveCount(0);
  state.holdRead = undefined;
  release.resolve();
  await expect(page.getByText('댓글 1', { exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept('댓글 확인 완료'));
  await page.getByRole('button', { name: '공개 승인', exact: true }).click();
  await expect.poll(() => state.actions.length).toBe(1);
  expect(state.actions[0]).toMatchObject({
    action: 'reviewComment',
    payload: { id: id(1), status: 'published' },
  });
});
