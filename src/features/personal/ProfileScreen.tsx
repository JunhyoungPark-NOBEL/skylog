import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { returnToLearning } from '@/features/learn/learnNavigation';
import { useLearning } from '@/features/learn/useLearning';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { grantRewards, readPersonal, saveGarden } from '@/personal/store';
import { onDbChange } from '@/db/events';
import { PillButton } from '@/ui/PillButton';
import { GardenArt } from './GardenArt';
import { HorizonEditor } from './HorizonEditor';
import './horizon.css';
import { AvatarEditor } from './AvatarEditor';
import { PublicProfileSync } from './PublicProfileSync';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { value } = useLearning();
  const [data, setData] = useState<Awaited<ReturnType<typeof readPersonal>> | null>(null);
  const [mode, setMode] = useState<'home' | 'garden' | 'avatar'>('home');
  const [slot, setSlot] = useState(2);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [readError, setReadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const latestRead = useRef<Promise<void> | null>(null);
  const refreshData = useCallback((): Promise<void> => {
    const request: Promise<void> = readPersonal().then(
      (next) => {
        if (latestRead.current !== request) return latestRead.current ?? undefined;
        if (alive.current) {
          setData(next);
          setReadError(false);
        }
      },
      (failure: unknown) => {
        // 오래된 읽기의 실패도 최신 읽기가 화면에 반영될 때까지 기다린다.
        if (latestRead.current !== request) return latestRead.current ?? undefined;
        if (alive.current) setReadError(true);
        throw failure;
      },
    );
    latestRead.current = request;
    return request;
  }, []);
  useEffect(() => {
    alive.current = true;
    const refresh = () => {
      void refreshData().catch(() => {
        if (alive.current) setError(true);
      });
    };
    refresh();
    const stop = onDbChange((table) => {
      if (table === 'progress' || table === 'all') refresh();
    });
    return () => {
      alive.current = false;
      stop();
    };
  }, [refreshData]);
  useEffect(() => {
    if (value) void grantRewards(value.snap.earnedBadges).catch(() => setError(true));
  }, [value]);
  async function save(next: Parameters<typeof saveGarden>[0]) {
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await saveGarden(next);
      await refreshData();
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  const profile = data?.profile;
  return (
    <ScreenFrame
      title={t('personal.' + (mode === 'home' ? 'title' : mode))}
      onBack={() => {
        if (!busy) {
          if (mode === 'home') returnToLearning();
          else setMode('home');
        }
      }}
      testId="personal-screen"
      scrollKey={mode}
    >
      <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
        {error && !readError && (
          <p role="alert" className="text-danger">
            {t('personal.error')}
          </p>
        )}
        {readError && (
          <div role="alert" className="space-y-2">
            <p className="text-danger">{t('avatar.reloadError')}</p>
            <PillButton
              onClick={() => {
                setError(false);
                void refreshData().catch(() => undefined);
              }}
            >
              {t('avatar.retry')}
            </PillButton>
          </div>
        )}
        {!profile ? (
          <p role="status">{t('common.loading')}</p>
        ) : (
          <fieldset disabled={readError} className="min-w-0 space-y-4">
            {mode !== 'avatar' && (
              <GardenArt
                profile={profile}
                label={t('personal.scene')}
                selectedSlot={mode === 'garden' ? slot : undefined}
              />
            )}
            {mode !== 'avatar' && (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-caption text-muted">
                <span>{t('horizon.previewCaption')}</span>
                <span role="status" aria-live="polite">
                  {busy
                    ? t('avatar.saving')
                    : saved
                      ? t('horizon.saved')
                      : mode === 'garden'
                        ? t('horizon.autoSave')
                        : ''}
                </span>
                {!profile.sceneryEnabled && <span className="w-full">{t('horizon.hidden')}</span>}
              </div>
            )}
            {mode === 'home' ? (
              <>
                <div>
                  <h2 className="text-title">{profile.name || t('personal.welcome')}</h2>
                  <p className="mt-1 text-body-sm text-muted">{t('personal.intro')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PillButton disabled={busy} onClick={() => setMode('garden')}>
                    {t('personal.garden')}
                  </PillButton>
                  <PillButton disabled={busy} onClick={() => setMode('avatar')}>
                    {t('personal.avatar')}
                  </PillButton>
                </div>
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = new FormData(event.currentTarget).get('gardenName');
                    if (typeof name === 'string') void save({ name });
                  }}
                >
                  <label className="min-w-0 flex-1 text-body-sm text-muted">
                    {t('personal.name')}
                    <input
                      key={profile.name}
                      name="gardenName"
                      defaultValue={profile.name}
                      maxLength={24}
                      disabled={busy}
                      className="mt-1 min-h-11 w-full rounded-xl bg-surface px-3 text-fg"
                    />
                  </label>
                  <PillButton type="submit" disabled={busy}>
                    {t('avatar.saveName')}
                  </PillButton>
                </form>
                <PublicProfileSync profile={profile} />
                <div className="rounded-2xl bg-surface p-1">
                  <button
                    className="flex min-h-16 w-full items-center justify-between px-4 text-left"
                    onClick={() => navigate('community')}
                  >
                    <span>
                      <strong className="block font-medium">{t('social.title')}</strong>
                      <span className="text-body-sm text-muted">{t('social.intro')}</span>
                    </span>
                    <span aria-hidden>↗</span>
                  </button>
                  <button
                    className="flex min-h-14 w-full items-center justify-between border-t border-fg/10 px-4 text-left"
                    onClick={() => navigate('account')}
                  >
                    <span>{t('social.account')}</span>
                    <span aria-hidden>›</span>
                  </button>
                </div>
              </>
            ) : mode === 'garden' ? (
              <HorizonEditor
                profile={profile}
                owned={data.owned}
                ownedGround={data.ownedGround}
                progress={value?.badgeProgress}
                busy={busy}
                slot={slot}
                onSlot={setSlot}
                onSave={save}
              />
            ) : (
              <AvatarEditor
                profile={profile}
                owned={data.ownedAvatar}
                looks={data.looks}
                progress={value?.badgeProgress}
                onBusy={setBusy}
                onRefresh={refreshData}
                onDone={() => setMode('home')}
              />
            )}
          </fieldset>
        )}
      </div>
    </ScreenFrame>
  );
}
