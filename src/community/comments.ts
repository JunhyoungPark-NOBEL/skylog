import { communityClient } from './client';
import type { CommunityComment } from './types';
import { readCommunityIdentities, type CommunityIdentity } from './identity';

export const COMMENTS_PAGE_SIZE = 50;
export interface CommentCursor {
  createdAt: string;
  id: string;
}
export interface CommentPage {
  comments: CommunityComment[];
  authors: Record<string, CommunityIdentity>;
  before: CommentCursor | null;
}

/** 최신 댓글부터 읽고, 동일 시각의 댓글도 ID로 구분해 빠짐없이 이전 페이지를 이어 간다. */
export async function readComments(
  postId: string,
  before?: CommentCursor | null,
  signal?: AbortSignal,
): Promise<CommentPage> {
  const client = communityClient();
  let query = client
    .from('sky_comments')
    .select('id,owner,body,post_id,status,created_at')
    .eq('post_id', postId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(COMMENTS_PAGE_SIZE + 1);
  if (before) {
    // 커서는 서버 행에서만 만들며 PostgREST 필터 구문에 쓰기 전에 형식을 확인한다.
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before.id) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(before.createdAt)
    )
      throw new Error('INVALID_CURSOR');
    query = query.or(
      `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
    );
  }
  if (signal) query = query.abortSignal(signal);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  const rows = result.data as CommunityComment[];
  const comments = rows.slice(0, COMMENTS_PAGE_SIZE);
  const owners = [...new Set(comments.map((comment) => comment.owner))];
  const authors = await readCommunityIdentities(owners, signal);
  const last = comments.at(-1);
  return {
    comments,
    authors,
    before:
      rows.length > COMMENTS_PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null,
  };
}
