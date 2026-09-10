import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { communityError, communityConfigured, useCommunityUser } from '@/community/client';
import {
  publicNickname,
  readCommunityIdentities,
  saveCommunityIdentity,
  type CommunityIdentity,
} from '@/community/identity';
import { avatarOf, type AvatarLook } from '@/personal/avatar';
import { PillButton } from '@/ui/PillButton';
import { AvatarPortrait } from './AvatarArt';

export function PublicProfileSync({ profile }: { profile: AvatarLook }) {
  const auth = useCommunityUser();
  return (
    <PublicProfileContent
      key={auth.user?.id ?? 'guest'}
      profile={profile}
      userId={auth.user?.id}
      ready={auth.ready}
    />
  );
}

function PublicProfileContent({
  profile,
  userId,
  ready,
}: {
  profile: AvatarLook;
  userId?: string;
  ready: boolean;
}) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<CommunityIdentity | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(!!userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(false);
  const [retry, setRetry] = useState(0);
  const alive = useRef(true);
  const writing = useRef(false);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    if (userId && communityConfigured)
      void readCommunityIdentities([userId], controller.signal)
        .then((rows) => {
          if (controller.signal.aborted) return;
          setSaved(rows[userId] ?? null);
          setName(rows[userId]?.name ?? '');
          setLoading(false);
          setError('');
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(communityError(e));
            setLoading(false);
          }
        });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [userId, retry]);
  const current = avatarOf(profile);
  const same =
    !!saved &&
    publicNickname(name) === saved.name &&
    JSON.stringify(current) === JSON.stringify(saved.avatar);
  async function sync() {
    if (!userId || !saved || writing.current) return;
    writing.current = true;
    setBusy(true);
    setError('');
    setMessage(false);
    const snapshot = { name: publicNickname(name), avatar: current };
    try {
      await saveCommunityIdentity(snapshot.name, snapshot.avatar, userId);
      if (alive.current) {
        setSaved(snapshot);
        setMessage(true);
      }
    } catch (e) {
      if (alive.current) setError(communityError(e));
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4" data-testid="public-profile-sync">
      <h2 className="text-title">{t('communityIdentity.title')}</h2>
      <p className="text-body-sm text-muted">{t('communityIdentity.hint')}</p>
      {!ready || loading ? (
        <p role="status">{t('common.loading')}</p>
      ) : !userId || !saved ? (
        <>
          {error && (
            <p role="alert" className="text-danger">
              {t(error)}
            </p>
          )}
          <PillButton
            onClick={() =>
              error ? (setLoading(true), setRetry((n) => n + 1)) : navigate('account')
            }
          >
            {t(error ? 'study.retry' : 'communityIdentity.join')}
          </PillButton>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sync();
          }}
        >
          <fieldset disabled={busy} className="space-y-3">
            <div className="flex items-center gap-3">
              <AvatarPortrait
                profile={current}
                label={t('communityIdentity.preview')}
                className="h-16 w-16"
              />
              <p className="min-w-0 text-caption text-muted">
                {t('communityIdentity.currentLook')}
              </p>
            </div>
            <label className="block text-body-sm">
              {t('communityIdentity.nickname')}
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage(false);
                }}
                maxLength={48}
                required
                autoComplete="nickname"
                className="mt-2 min-h-11 w-full rounded-xl bg-bg px-3"
              />
            </label>
            <p className="text-caption text-muted">{t('communityIdentity.nicknameHint')}</p>
            {error && (
              <p role="alert" className="text-danger">
                {t(error)}
              </p>
            )}
            {message && (
              <p role="status" className="text-accent">
                {t('communityIdentity.saved')}
              </p>
            )}
            <PillButton type="submit" disabled={!publicNickname(name) || same}>
              {t(busy ? 'common.loading' : 'communityIdentity.sync')}
            </PillButton>
            {same && !message && (
              <p className="text-caption text-muted">{t('communityIdentity.upToDate')}</p>
            )}
          </fieldset>
        </form>
      )}
    </section>
  );
}
