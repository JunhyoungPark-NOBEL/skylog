import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { communityAction, communityError } from '@/community/client';
import { readComments, type CommentCursor } from '@/community/comments';
import type { CommunityComment } from '@/community/types';
import { PillButton } from '@/ui/PillButton';

interface Props {
  postId: string;
  published: boolean;
  userId?: string;
  joined: boolean;
  onBlocked(): void;
}

/** 사진·로그인 계정별로 분리해 다른 사진의 초안과 늦은 응답을 이어 쓰지 않는다. */
export function CommentsPanel(props: Props) {
  return <CommentsContent key={`${props.postId}:${props.userId ?? 'guest'}`} {...props} />;
}

function CommentsContent({ postId, published, userId, joined, onBlocked }: Props) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [before, setBefore] = useState<CommentCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const alive = useRef(true);
  const writing = useRef(false);
  const reading = useRef<AbortController | null>(null);

  const load = useCallback(
    async (cursor?: CommentCursor | null): Promise<boolean> => {
      reading.current?.abort();
      const request = new AbortController();
      reading.current = request;
      try {
        const page = await readComments(postId, cursor, request.signal);
        if (!alive.current || reading.current !== request) return false;
        setComments((current) => {
          if (!cursor) return page.comments;
          const ids = new Set(current.map((comment) => comment.id));
          return [...current, ...page.comments.filter((comment) => !ids.has(comment.id))];
        });
        setNames((current) => (cursor ? { ...current, ...page.names } : page.names));
        setBefore(page.before);
        return true;
      } catch (error) {
        if (alive.current && reading.current === request) setLoadError(communityError(error));
        return false;
      } finally {
        if (alive.current && reading.current === request) setLoading(false);
      }
    },
    [postId],
  );

  function refresh(cursor?: CommentCursor | null): Promise<boolean> {
    setLoading(true);
    setLoadError('');
    return load(cursor);
  }

  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      alive.current = false;
      reading.current?.abort();
    };
  }, [load]);

  async function run(action: string, payload: Record<string, unknown>) {
    if (writing.current || loading) return;
    writing.current = true;
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      await communityAction(action, payload);
      if (!alive.current) return;
      if (action === 'comment') setText('');
      // RPC 성공과 목록 읽기 실패를 구분한다. 새로고침 재시도는 댓글을 다시 보내지 않는다.
      setNotice(t(action === 'comment' ? 'social.pendingNotice' : 'social.done'));
      if (action === 'deleteComment') {
        setComments((current) => current.filter((comment) => comment.id !== payload.id));
      }
      if (action === 'block') {
        setComments((current) => current.filter((comment) => comment.owner !== payload.id));
        onBlocked();
        return;
      }
      await refresh();
    } catch (error) {
      if (alive.current) setActionError(communityError(error));
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <section className="space-y-4" data-testid="comments-panel" aria-busy={loading || busy}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-title">{t('social.comments')}</h2>
        <PillButton disabled={loading || busy} onClick={() => void refresh()}>
          {t('social.refreshComments')}
        </PillButton>
      </div>
      {loadError && (
        <div role="alert" className="space-y-2">
          <p className="text-danger">{t('social.commentsLoadError')}</p>
          <PillButton disabled={loading || busy} onClick={() => void refresh()}>
            {t('study.retry')}
          </PillButton>
        </div>
      )}
      {actionError && (
        <p role="alert" className="text-danger">
          {t(actionError)}
        </p>
      )}
      {notice && (
        <p role="status" className="text-accent">
          {notice}
        </p>
      )}
      {loading && (
        <p role="status" className="text-body-sm text-muted">
          {t('common.loading')}
        </p>
      )}
      {!loading && !loadError && !comments.length && (
        <p className="text-body-sm text-muted">{t('social.noComments')}</p>
      )}
      {before && (
        <PillButton disabled={loading || busy} onClick={() => void refresh(before)}>
          {t('social.olderComments')}
        </PillButton>
      )}
      {[...comments].reverse().map((comment) => (
        <article
          key={comment.id}
          className="rounded-2xl bg-surface p-4"
          data-testid={`comment-${comment.id}`}
        >
          <p className="text-body-sm text-muted">
            {names[comment.owner] || t('social.observer')}
            {comment.status !== 'published' && ' · ' + t('social.states.' + comment.status)}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words">{comment.body}</p>
          {joined && (
            <details className="mt-2 text-body-sm">
              <summary className="min-h-11 cursor-pointer py-2">{t('social.options')}</summary>
              <div className="flex flex-wrap gap-2">
                {comment.owner === userId ? (
                  <>
                    <PillButton
                      disabled={busy || loading}
                      onClick={() => {
                        if (window.confirm(t('social.deleteConfirm')))
                          void run('deleteComment', { id: comment.id });
                      }}
                    >
                      {t('social.delete')}
                    </PillButton>
                    {['rejected', 'hidden'].includes(comment.status) && (
                      <PillButton
                        disabled={busy || loading}
                        onClick={() => {
                          const reason = window.prompt(t('social.appealReason'));
                          if (reason?.trim())
                            void run('appeal', { id: comment.id, type: 'comment', text: reason });
                        }}
                      >
                        {t('social.appeal')}
                      </PillButton>
                    )}
                  </>
                ) : (
                  <>
                    <PillButton
                      disabled={busy || loading}
                      onClick={() => {
                        const reason = window.prompt(t('social.reportReason'));
                        if (reason?.trim())
                          void run('report', { id: comment.id, type: 'comment', text: reason });
                      }}
                    >
                      {t('social.report')}
                    </PillButton>
                    <PillButton
                      disabled={busy || loading}
                      onClick={() => {
                        if (window.confirm(t('social.blockConfirm')))
                          void run('block', { id: comment.owner });
                      }}
                    >
                      {t('social.block')}
                    </PillButton>
                  </>
                )}
              </div>
            </details>
          )}
        </article>
      ))}
      {joined && published ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) void run('comment', { id: postId, text });
          }}
        >
          <fieldset disabled={busy || loading || !!loadError}>
            <label className="block text-body-sm">
              {t('social.writeComment')}
              <textarea
                required
                maxLength={500}
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-2xl bg-surface p-4"
              />
            </label>
            <PillButton type="submit" disabled={!text.trim()}>
              {t('social.sendReview')}
            </PillButton>
            <p className="mt-2 text-caption text-muted">{t('social.reviewHint')}</p>
          </fieldset>
        </form>
      ) : (
        !joined && <PillButton onClick={() => navigate('account')}>{t('social.signIn')}</PillButton>
      )}
    </section>
  );
}
