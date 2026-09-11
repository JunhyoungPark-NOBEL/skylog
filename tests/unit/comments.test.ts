import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { communityClient } from '@/community/client';
import { COMMENTS_PAGE_SIZE, readComments } from '@/community/comments';
import type { CommunityComment } from '@/community/types';
import { DEFAULT_AVATAR } from '@/personal/avatar';

vi.mock('@/community/client', () => ({ communityClient: vi.fn() }));
const postId = '00000000-0000-4000-8000-000000000100';
const owner = '00000000-0000-4000-8000-000000000001';
const id = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;
function row(n: number): CommunityComment {
  return {
    id: id(n),
    post_id: postId,
    owner,
    body: `Comment ${n}`,
    status: 'published',
    created_at: '2026-09-09T00:00:00.123456+00:00',
  };
}
let data: CommunityComment[];
let errorTable: string;
let legacyProfile: boolean;
let requests: { url: URL; signal?: AbortSignal | null }[];
let serial = 0;
beforeEach(() => {
  data = [];
  requests = [];
  errorTable = '';
  legacyProfile = false;
  serial += 1;
  const client = createClient('https://comments-test.invalid', 'test-public-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `comments-test-${serial}`,
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        );
        requests.push({ url, signal: init?.signal });
        if (url.pathname.endsWith(errorTable) && errorTable)
          return Response.json({ message: 'read failed' }, { status: 403 });
        if (
          legacyProfile &&
          url.pathname.endsWith('sky_members') &&
          url.searchParams.get('select')?.includes('avatar')
        )
          return Response.json(
            { code: '42703', message: 'column sky_members.avatar does not exist' },
            { status: 400 },
          );
        return Response.json(
          url.pathname.endsWith('sky_comments') ? data : [{ id: owner, name: 'Writer' }],
        );
      },
    },
  });
  vi.mocked(communityClient).mockReturnValue(client);
});

describe('댓글 페이지 조회', () => {
  it('최신 페이지와 다음 커서를 만들며 삭제 댓글을 제외하는 실제 SDK 쿼리를 보낸다', async () => {
    data = Array.from({ length: COMMENTS_PAGE_SIZE + 1 }, (_, i) => row(100 - i));
    const result = await readComments(postId);
    expect(result.comments).toEqual(data.slice(0, COMMENTS_PAGE_SIZE));
    expect(result.before).toEqual({ createdAt: row(51).created_at, id: id(51) });
    expect(result.authors).toEqual({ [owner]: { name: 'Writer', avatar: DEFAULT_AVATAR } });
    const query = requests[0]!.url.searchParams;
    expect(query.get('post_id')).toBe('eq.' + postId);
    expect(query.get('status')).toBe('neq.deleted');
    expect(query.get('order')).toBe('created_at.desc,id.desc');
    expect(query.get('limit')).toBe('51');
    expect(requests[1]!.url.searchParams.get('id')).toContain(owner);
  });

  it('같은 생성 시각의 페이지는 미세초를 보존하고 ID 비교를 함께 보낸다', async () => {
    const cursor = { createdAt: row(51).created_at, id: id(51) };
    data = [row(50), row(49)];
    const result = await readComments(postId, cursor);
    expect(requests[0]!.url.searchParams.get('or')).toBe(
      `(created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}))`,
    );
    expect(result.comments).toEqual(data);
    expect(result.before).toBeNull();
  });

  it('빈 페이지는 작성자 전체 조회 없이 끝낸다', async () => {
    expect(await readComments(postId)).toEqual({ comments: [], authors: {}, before: null });
    expect(requests).toHaveLength(1);
  });

  it('아바타 열이 아직 없는 서버에서는 작성자 이름과 기본 모습을 읽는다', async () => {
    legacyProfile = true;
    data = [row(1)];
    const page = await readComments(postId);
    expect(page.authors[owner]).toEqual({ name: 'Writer', avatar: DEFAULT_AVATAR });
    expect(requests).toHaveLength(4);
    expect(requests[1]!.url.searchParams.get('select')).toBe('id,name,avatar,horizon');
    expect(requests[2]!.url.searchParams.get('select')).toBe('id,name,avatar');
    expect(requests[3]!.url.searchParams.get('select')).toBe('id,name');
  });

  it('잘못된 커서는 필터 쿼리로 보내지 않는다', async () => {
    await expect(
      readComments(postId, { createdAt: 'now),status.eq.pending', id: id(1) }),
    ).rejects.toThrow('INVALID_CURSOR');
    await expect(
      readComments(postId, { createdAt: row(1).created_at, id: 'id),status.eq.pending' }),
    ).rejects.toThrow('INVALID_CURSOR');
    expect(requests).toHaveLength(0);
  });

  it('댓글이나 작성자 조회 오류를 성공한 빈 목록으로 바꾸지 않는다', async () => {
    errorTable = 'sky_comments';
    await expect(readComments(postId)).rejects.toThrow('read failed');
    data = [row(1)];
    errorTable = 'sky_members';
    await expect(readComments(postId)).rejects.toThrow('read failed');
  });

  it('사진·계정 이동의 취소 신호를 댓글과 작성자 요청에 전달한다', async () => {
    data = [row(1)];
    const controller = new AbortController();
    await readComments(postId, null, controller.signal);
    expect(requests.map((request) => request.signal)).toEqual([
      controller.signal,
      controller.signal,
    ]);
  });
});
