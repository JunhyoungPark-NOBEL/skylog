import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentsPanel } from '@/features/community/CommentsPanel';
import { communityAction } from '@/community/client';
import { readComments, type CommentPage } from '@/community/comments';
import type { CommunityComment } from '@/community/types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/community/client', () => ({
  communityAction: vi.fn(),
  communityError: () => 'social.error',
}));
vi.mock('@/community/comments', () => ({ readComments: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function comment(id: string, owner = 'author', body = id): CommunityComment {
  return {
    id,
    owner,
    body,
    post_id: 'photo-a',
    status: 'published',
    created_at: '2026-09-09T00:00:00Z',
  };
}
function page(comments: CommunityComment[] = []): CommentPage {
  return { comments, names: { author: 'Author', me: 'Me' }, before: null };
}
let host: HTMLDivElement;
let root: Root;
let onBlocked = vi.fn<() => void>();
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(readComments).mockReset().mockResolvedValue(page());
  vi.mocked(communityAction).mockReset().mockResolvedValue(undefined);
  onBlocked = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount(postId = 'photo-a', userId = 'me') {
  await act(async () =>
    root.render(
      <CommentsPanel postId={postId} published userId={userId} joined onBlocked={onBlocked} />,
    ),
  );
}
function button(name: string): HTMLButtonElement {
  const target = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent === name,
  );
  if (!target) throw new Error(`Missing button ${name}`);
  return target;
}
async function click(name: string) {
  await act(async () => button(name).click());
}
async function type(text: string) {
  const area = host.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, text);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('댓글 작성·느린 응답', () => {
  it('전송 중 입력을 막고 실패하면 초안을 보존한다', async () => {
    await mount();
    await type('내 관측 이야기');
    const writing = deferred<void>();
    vi.mocked(communityAction).mockReturnValue(writing.promise);
    await click('social.sendReview');
    expect(communityAction).toHaveBeenCalledWith('comment', {
      id: 'photo-a',
      text: '내 관측 이야기',
    });
    expect(host.querySelector('textarea')!.matches(':disabled')).toBe(true);
    await act(async () => writing.reject(new Error('offline')));
    expect(host.querySelector('textarea')!.value).toBe('내 관측 이야기');
    expect(host.querySelector('textarea')!.matches(':disabled')).toBe(false);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('social.error');
  });

  it('댓글은 전송됐지만 읽기가 실패하면 새로고침만 재시도하고 중복 전송하지 않는다', async () => {
    await mount();
    await type('보낸 댓글');
    vi.mocked(readComments).mockRejectedValueOnce(new Error('read failed'));
    await click('social.sendReview');
    expect(host.textContent).toContain('social.pendingNotice');
    expect(host.textContent).toContain('social.commentsLoadError');
    expect(host.querySelector('textarea')!.value).toBe('');
    expect(host.querySelector('textarea')!.matches(':disabled')).toBe(true);
    vi.mocked(readComments).mockResolvedValue(
      page([{ ...comment('new', 'me', '보낸 댓글'), status: 'pending' }]),
    );
    await click('study.retry');
    expect(communityAction).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('보낸 댓글');
    expect(host.textContent).toContain('social.states.pending');
    expect(host.querySelector('textarea')!.matches(':disabled')).toBe(false);
  });

  it('다른 사진으로 이동하면 초안과 이전 사진의 늦은 댓글을 섞지 않는다', async () => {
    await mount();
    await type('A 사진 초안');
    const stale = deferred<CommentPage>();
    vi.mocked(readComments).mockReturnValueOnce(stale.promise);
    await click('social.refreshComments');
    vi.mocked(readComments).mockResolvedValue(page([comment('b', 'author', 'B 사진 댓글')]));
    await mount('photo-b');
    expect(host.querySelector('textarea')!.value).toBe('');
    await act(async () => stale.resolve(page([comment('a', 'author', 'A 사진 늦은 댓글')])));
    expect(host.textContent).toContain('B 사진 댓글');
    expect(host.textContent).not.toContain('A 사진 늦은 댓글');
  });

  it('계정 변경 후 이전 차단 응답이 새 화면을 이동시키지 않는다', async () => {
    vi.mocked(readComments).mockResolvedValue(page([comment('other')]));
    await mount();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const writing = deferred<void>();
    vi.mocked(communityAction).mockReturnValue(writing.promise);
    await click('social.block');
    vi.mocked(readComments).mockResolvedValue(page([comment('new', 'other', '새 계정 댓글')]));
    await mount('photo-a', 'second-user');
    await type('새 계정 초안');
    await act(async () => writing.resolve(undefined));
    expect(onBlocked).not.toHaveBeenCalled();
    expect(host.querySelector('textarea')!.value).toBe('새 계정 초안');
    expect(host.textContent).not.toContain('social.done');
  });

  it('댓글 신고는 별도 사유를 보내며 쓰던 댓글 초안을 지우지 않는다', async () => {
    vi.mocked(readComments).mockResolvedValue(page([comment('reported')]));
    await mount();
    await type('내 댓글 초안');
    vi.spyOn(window, 'prompt').mockReturnValue('신고 사유');
    await click('social.report');
    expect(communityAction).toHaveBeenCalledWith('report', {
      id: 'reported',
      type: 'comment',
      text: '신고 사유',
    });
    expect(host.querySelector('textarea')!.value).toBe('내 댓글 초안');
  });

  it('이전 페이지는 시간순 앞에 붙이며 중복 댓글을 만들지 않는다', async () => {
    vi.mocked(readComments).mockResolvedValue({
      ...page([comment('3'), comment('2')]),
      before: { createdAt: '2026-09-09T00:00:00Z', id: '2' },
    });
    await mount();
    vi.mocked(readComments).mockResolvedValue(page([comment('2'), comment('1')]));
    await click('social.olderComments');
    expect(
      [...host.querySelectorAll('article')].map((row) => row.getAttribute('data-testid')),
    ).toEqual(['comment-1', 'comment-2', 'comment-3']);
    expect(readComments).toHaveBeenLastCalledWith(
      'photo-a',
      { createdAt: '2026-09-09T00:00:00Z', id: '2' },
      expect.any(AbortSignal),
    );
  });

  it('초기 읽기 오류를 빈 댓글 목록으로 알리지 않고 새로고침 후 복구한다', async () => {
    vi.mocked(readComments).mockRejectedValueOnce(new Error('offline'));
    await mount();
    expect(host.textContent).toContain('social.commentsLoadError');
    expect(host.textContent).not.toContain('social.noComments');
    await click('study.retry');
    expect(host.textContent).toContain('social.noComments');
    expect(host.querySelector('textarea')!.matches(':disabled')).toBe(false);
  });
});
