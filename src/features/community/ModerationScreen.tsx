import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { PillButton } from '@/ui/PillButton';
import {
  communityAction,
  communityClient,
  communityError,
  useCommunityUser,
} from '@/community/client';
import type { CommunityPost, CommunityComment, CommunityCase } from '@/community/types';
function goToPhoto(id: string) {
  window.location.hash = '#/community?post=' + id;
}

export default function ModerationScreen() {
  const auth = useCommunityUser();
  return <ModerationContent key={auth.user?.id ?? 'guest'} {...auth} />;
}
function ModerationContent({ user }: ReturnType<typeof useCommunityUser>) {
  const { t } = useTranslation();
  const [section, setSection] = useState<'posts' | 'comments' | 'reports' | 'appeals'>('posts');
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<(CommunityPost | CommunityComment | CommunityCase)[]>([]);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      try {
        const c = communityClient();
        const role = await c.from('sky_moderators').select('id').eq('id', user.id).maybeSingle();
        if (role.error || !role.data) {
          if (alive) setAllowed(false);
          return;
        }
        let q = c
          .from('sky_' + section)
          .select('*')
          .order('created_at')
          .limit(100);
        q =
          section === 'posts' || section === 'comments'
            ? q.eq('status', 'pending')
            : q.eq('resolved', false);
        const r = await q;
        if (r.error) throw r.error;
        if (alive) {
          setAllowed(true);
          setRows(r.data as (CommunityPost | CommunityComment | CommunityCase)[]);
        }
      } catch (e) {
        if (alive) setError(communityError(e));
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [user, section, tick]);
  async function review(action: string, row: { id: string; owner: string }, status?: string) {
    const reason = window.prompt(t('social.reviewReason'));
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await communityAction(action, { id: row.id, status, text: reason });
      setTick((n) => n + 1);
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  async function openPhoto(row: CommunityPost | CommunityComment | CommunityCase) {
    try {
      let id = 'caption' in row ? row.id : row.post_id;
      if (!id && 'comment_id' in row && row.comment_id) {
        const result = await communityClient()
          .from('sky_comments')
          .select('post_id')
          .eq('id', row.comment_id)
          .single();
        if (result.error) throw result.error;
        id = result.data.post_id;
      }
      if (!id) throw new Error('NOT_AVAILABLE');
      goToPhoto(id);
    } catch (e) {
      setError(communityError(e));
    }
  }
  async function restrict(owner: string, on: boolean) {
    const reason = window.prompt(t('social.reviewReason'));
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await communityAction('suspend', { id: owner, on, text: reason });
      setTick((n) => n + 1);
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScreenFrame
      title={t('social.moderation')}
      onBack={() => navigate('account')}
      testId="moderation-screen"
    >
      <div className="mx-auto max-w-2xl space-y-5 p-5">
        {error && <p role="alert">{t(error)}</p>}
        {!allowed ? (
          <p>{t('social.moderatorsOnly')}</p>
        ) : (
          <>
            <p className="text-body-sm text-muted">{t('social.reviewRules')}</p>
            <div className="flex flex-wrap gap-2">
              {(['posts', 'comments', 'reports', 'appeals'] as const).map((s) => (
                <PillButton key={s} pressed={s === section} onClick={() => setSection(s)}>
                  {t('social.queues.' + s)}
                </PillButton>
              ))}
            </div>
            {!rows.length && <p>{t('social.queueEmpty')}</p>}
            {rows.map((row) => (
              <article className="space-y-3 rounded-2xl bg-surface p-4" key={row.id}>
                <p className="whitespace-pre-wrap">
                  {'caption' in row ? row.caption : 'body' in row ? row.body : row.reason}
                </p>
                <div className="flex flex-wrap gap-2">
                  <PillButton onClick={() => void openPhoto(row)}>
                    {t('social.openPhoto')}
                  </PillButton>
                  {section === 'posts' || section === 'comments' ? (
                    <>
                      <PillButton
                        disabled={busy}
                        onClick={() =>
                          void review(
                            section === 'posts' ? 'reviewPost' : 'reviewComment',
                            row,
                            'published',
                          )
                        }
                      >
                        {t('social.approve')}
                      </PillButton>
                      <PillButton
                        disabled={busy}
                        onClick={() =>
                          void review(
                            section === 'posts' ? 'reviewPost' : 'reviewComment',
                            row,
                            'rejected',
                          )
                        }
                      >
                        {t('social.reject')}
                      </PillButton>
                    </>
                  ) : (
                    <>
                      <PillButton
                        disabled={busy}
                        onClick={() =>
                          void review(
                            section === 'reports' ? 'resolveReport' : 'resolveAppeal',
                            row,
                          )
                        }
                      >
                        {t('social.resolve')}
                      </PillButton>
                      {'reason' in row && (
                        <>
                          <PillButton
                            disabled={busy}
                            onClick={() =>
                              void review(
                                row.post_id ? 'reviewPost' : 'reviewComment',
                                { id: (row.post_id || row.comment_id)!, owner: row.owner },
                                'hidden',
                              )
                            }
                          >
                            {t('social.hide')}
                          </PillButton>
                          <PillButton
                            disabled={busy}
                            onClick={() =>
                              void review(
                                row.post_id ? 'reviewPost' : 'reviewComment',
                                { id: (row.post_id || row.comment_id)!, owner: row.owner },
                                'published',
                              )
                            }
                          >
                            {t('social.restorePublication')}
                          </PillButton>
                        </>
                      )}
                    </>
                  )}
                </div>
                {('caption' in row || 'body' in row) && (
                  <details>
                    <summary className="min-h-11 cursor-pointer py-2 text-body-sm text-muted">
                      {t('social.authorActions')}
                    </summary>
                    <div className="flex flex-wrap gap-2">
                      <PillButton disabled={busy} onClick={() => void restrict(row.owner, true)}>
                        {t('social.suspend')}
                      </PillButton>
                      <PillButton disabled={busy} onClick={() => void restrict(row.owner, false)}>
                        {t('social.unsuspend')}
                      </PillButton>
                    </div>
                  </details>
                )}
              </article>
            ))}
          </>
        )}
      </div>
    </ScreenFrame>
  );
}
