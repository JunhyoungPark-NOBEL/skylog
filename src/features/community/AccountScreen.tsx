import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { PillButton } from '@/ui/PillButton';
import {
  communityAction,
  communityClient,
  communityConfigured,
  communityError,
  edgeAction,
  useCommunityUser,
} from '@/community/client';
import {
  exportBundle,
  bundleToJson,
  parseBundle,
  importBundle,
  previewImport,
} from '@/db/exportImport';
import type { ExportBundle } from '@/db/types';
import type { CloudBackup, CommunityMember } from '@/community/types';
import { EmailLogin } from './EmailLogin';
import { clearLoginCallback, useLoginCallback } from '@/community/callback';

export default function AccountScreen() {
  const auth = useCommunityUser();
  return <AccountContent key={auth.user?.id ?? 'guest'} {...auth} />;
}
function AccountContent({ user, ready }: ReturnType<typeof useCommunityUser>) {
  const { t, i18n } = useTranslation();
  const callback = useLoginCallback();
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [joined, setJoined] = useState(false);
  const [mod, setMod] = useState(false);
  const [backups, setBackups] = useState<CloudBackup[]>([]);
  const [blocks, setBlocks] = useState<CommunityMember[]>([]);
  const [audit, setAudit] = useState<
    { id: number; action: string; reason: string; created_at: string }[]
  >([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [restore, setRestore] = useState<{ bundle: ExportBundle; count: number } | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const c = communityClient();
    void Promise.all([
      c.from('sky_members').select('name').eq('id', user.id).maybeSingle(),
      c.from('sky_moderators').select('id').eq('id', user.id).maybeSingle(),
      c
        .from('sky_backups')
        .select('id,size,created_at,ready')
        .eq('owner', user.id)
        .eq('ready', true)
        .order('created_at', { ascending: false }),
      c.rpc('sky_blocked_people'),
      c
        .from('sky_audit')
        .select('id,action,reason,created_at')
        .eq('affected', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
      .then(([member, role, b, bl, a]) => {
        if (member.error || role.error || b.error || bl.error || a.error) throw new Error('LOAD');
        if (alive) {
          setJoined(!!member.data);
          setName(member.data?.name || '');
          setMod(!!role.data);
          setBackups(b.data as CloudBackup[]);
          setBlocks(
            (bl.data as { id: string; name: string }[]).map((v) => ({
              id: v.id,
              name: v.name,
              suspended: false,
            })),
          );
          setAudit(a.data);
        }
      })
      .catch((e) => {
        if (alive) setError(communityError(e));
      });
    return () => {
      alive = false;
    };
  }, [user, tick, t]);
  async function run(fn: () => Promise<void>, done = 'social.done') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(t(done));
      setTick((n) => n + 1);
    } catch (e) {
      setError(communityError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScreenFrame
      title={t('social.account')}
      onBack={() => navigate('profile')}
      testId="account-screen"
    >
      <div className="mx-auto max-w-xl space-y-5 p-5">
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft p-4">
            {t(error)}
          </p>
        )}
        {message && (
          <p role="status" className="text-accent">
            {message}
          </p>
        )}
        {!communityConfigured ? (
          <p>{t('social.comingBody')}</p>
        ) : !ready && callback.busy ? (
          <EmailLogin />
        ) : !ready ? (
          <p role="status">{t('common.loading')}</p>
        ) : !user ? (
          <EmailLogin />
        ) : callback.busy || callback.error || callback.recoveryUrl ? (
          <div className="space-y-4" data-testid="signed-in-login-callback">
            <p className="break-words rounded-xl bg-surface p-4 text-body-sm">
              {t('auth.currentAccount', { email: user.email })}
            </p>
            <EmailLogin callbackOnly />
            <PillButton disabled={callback.busy} onClick={clearLoginCallback}>
              {t('auth.keepCurrentAccount')}
            </PillButton>
          </div>
        ) : (
          <>
            <p className="break-words text-body-sm text-muted">{user.email}</p>
            {!joined ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => communityAction('join', { name, terms: '2026-09-08' }));
                }}
              >
                <h2 className="text-title">{t('social.joinTitle')}</h2>
                <label className="block text-body-sm">
                  {t('social.displayName')}
                  <input
                    required
                    maxLength={24}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
                  />
                </label>
                <div className="rounded-2xl bg-surface p-4 text-body-sm leading-relaxed">
                  <p>{t('social.rules')}</p>
                  <p className="mt-3">{t('social.privacy')}</p>
                  <a
                    href="https://junhyoungpark-nobel.github.io/skylog/community-terms.html"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block min-h-11 py-2 text-accent"
                  >
                    {t('social.fullTerms')}
                  </a>
                </div>
                <label className="flex min-h-11 items-start gap-3 text-body-sm">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  {t('social.agreeRules')}
                </label>
                <PillButton
                  type="submit"
                  disabled={busy || !agreed || !name.trim()}
                  variant="primary"
                >
                  {t('social.join')}
                </PillButton>
              </form>
            ) : (
              <>
                <div>
                  <h2 className="text-title">{name}</h2>
                  <p className="mt-1 text-body-sm text-muted">{t('social.accountIntro')}</p>
                </div>
                <PillButton onClick={() => navigate('community')}>{t('social.title')}</PillButton>
                <section className="rounded-3xl bg-surface p-5">
                  <h2 className="text-title">{t('social.backup')}</h2>
                  <p className="mb-4 mt-2 text-body-sm text-muted">{t('social.backupHint')}</p>
                  <PillButton
                    disabled={busy || backups.length >= 5}
                    onClick={() => {
                      if (window.confirm(t('social.backupConsent')))
                        void run(async () => {
                          const text = bundleToJson(await exportBundle());
                          if (new Blob([text]).size > 20971520) throw new Error('TOO_LARGE');
                          await edgeAction('backup', text);
                        }, 'social.backupDone');
                    }}
                  >
                    {t('social.saveBackup')}
                  </PillButton>
                  {backups.map((b) => (
                    <div key={b.id} className="mt-4 border-t border-fg/10 pt-4">
                      <p className="text-body-sm">
                        {new Date(b.created_at).toLocaleString(i18n.language)} ·{' '}
                        {(b.size / 1048576).toFixed(1)} MB
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <PillButton
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const r = await edgeAction('restore', { id: b.id });
                              const parsed = parseBundle(await r.text());
                              if ('error' in parsed) throw new Error('INVALID_BACKUP');
                              const p = await previewImport(parsed.bundle);
                              setRestore({ bundle: parsed.bundle, count: p.counts.observations });
                            }, 'social.restorePreview')
                          }
                        >
                          {t('social.restore')}
                        </PillButton>
                        <PillButton
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(t('social.deleteBackupConfirm')))
                              void run(async () => {
                                await edgeAction('deleteBackup', { id: b.id });
                              });
                          }}
                        >
                          {t('social.delete')}
                        </PillButton>
                      </div>
                    </div>
                  ))}
                  {restore && (
                    <div className="mt-4 rounded-xl bg-bg p-4">
                      <p>{t('social.restoreConfirm', { count: restore.count })}</p>
                      <div className="mt-3 flex gap-2">
                        <PillButton
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await importBundle(restore.bundle, { policy: 'newest' });
                              setRestore(null);
                            }, 'social.restored')
                          }
                        >
                          {t('social.merge')}
                        </PillButton>
                        <PillButton onClick={() => setRestore(null)}>
                          {t('common.cancel')}
                        </PillButton>
                      </div>
                    </div>
                  )}
                </section>
                {!!blocks.length && (
                  <details className="rounded-2xl bg-surface p-4">
                    <summary className="min-h-11 cursor-pointer py-2">
                      {t('social.blocked')}
                    </summary>
                    {blocks.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-2 py-2">
                        <span>{b.name}</span>
                        <PillButton
                          disabled={busy}
                          onClick={() => void run(() => communityAction('unblock', { id: b.id }))}
                        >
                          {t('social.unblock')}
                        </PillButton>
                      </div>
                    ))}
                  </details>
                )}
                {!!audit.length && (
                  <details className="rounded-2xl bg-surface p-4">
                    <summary className="min-h-11 cursor-pointer py-2">
                      {t('social.decisions')}
                    </summary>
                    {audit.map((a) => (
                      <p key={a.id} className="my-3 border-t border-fg/10 pt-3 text-body-sm">
                        {new Date(a.created_at).toLocaleDateString(i18n.language)} · {a.reason}
                      </p>
                    ))}
                  </details>
                )}
                {mod && (
                  <PillButton onClick={() => navigate('moderation')}>
                    {t('social.moderation')}
                  </PillButton>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <PillButton
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await communityClient().auth.signOut();
                    setRestore(null);
                    setBackups([]);
                    setJoined(false);
                    setMod(false);
                  }, 'social.signedOut')
                }
              >
                {t('social.signOut')}
              </PillButton>
              <details className="w-full pt-3">
                <summary className="min-h-11 cursor-pointer py-2 text-body-sm text-muted">
                  {t('social.manageAccount')}
                </summary>
                <p className="my-3 text-body-sm text-muted">{t('social.deleteAccountHint')}</p>
                <PillButton
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t('social.deleteAccountConfirm')))
                      void run(async () => {
                        await edgeAction('deleteAccount', { confirm: 'DELETE' });
                        await communityClient().auth.signOut({ scope: 'local' });
                        setRestore(null);
                        setJoined(false);
                      }, 'social.accountDeleted');
                  }}
                >
                  {t('social.deleteAccount')}
                </PillButton>
              </details>
            </div>
          </>
        )}
      </div>
    </ScreenFrame>
  );
}
