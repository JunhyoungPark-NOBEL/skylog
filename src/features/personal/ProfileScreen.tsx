import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { returnToLearning } from '@/features/learn/learnNavigation';
import { useLearning } from '@/features/learn/useLearning';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { DECORATIONS, SUITS, SKINS, HATS, type Personal } from '@/personal/catalog';
import { grantRewards, readPersonal, savePersonal } from '@/personal/store';
import { onDbChange } from '@/db/events';
import { PillButton } from '@/ui/PillButton';
import { GardenArt, DecorationArt } from './GardenArt';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { value } = useLearning();
  const [data, setData] = useState<Awaited<ReturnType<typeof readPersonal>> | null>(null);
  const [mode, setMode] = useState<'home' | 'garden' | 'avatar'>('home');
  const [slot, setSlot] = useState(0);
  const [collection, setCollection] = useState<'owned' | 'rewards'>('owned');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void readPersonal()
        .then((d) => {
          if (alive) setData(d);
        })
        .catch(() => {
          if (alive) setError(true);
        });
    };
    refresh();
    const stop = onDbChange((table) => {
      if (table === 'progress' || table === 'all') refresh();
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);
  useEffect(() => {
    if (value) void grantRewards(value.snap.earnedBadges).catch(() => setError(true));
  }, [value]);
  async function save(next: Personal) {
    setBusy(true);
    setError(false);
    try {
      await savePersonal(next);
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
      onBack={() => (mode === 'home' ? returnToLearning() : setMode('home'))}
      testId="personal-screen"
    >
      <div className="mx-auto max-w-xl space-y-5 p-5">
        {error && (
          <p role="alert" className="text-danger">
            {t('personal.error')}
          </p>
        )}
        {!profile ? (
          <p role="status">{t('common.loading')}</p>
        ) : (
          <>
            <GardenArt
              profile={profile}
              label={t('personal.scene')}
              selectedSlot={mode === 'garden' ? slot : undefined}
            />
            {mode === 'home' ? (
              <>
                <div>
                  <h2 className="text-title">{profile.name || t('personal.welcome')}</h2>
                  <p className="mt-1 text-body-sm text-muted">{t('personal.intro')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PillButton onClick={() => setMode('garden')}>{t('personal.garden')}</PillButton>
                  <PillButton onClick={() => setMode('avatar')}>{t('personal.avatar')}</PillButton>
                </div>
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
              <>
                <p className="text-body-sm text-muted">{t('personal.pickSlot')}</p>
                <div className="flex flex-wrap gap-2" aria-label={t('personal.slots')}>
                  {profile.slots.map((_, i) => (
                    <PillButton
                      key={i}
                      pressed={slot === i}
                      onClick={() => setSlot(i)}
                      aria-label={t('personal.slot', { n: i + 1 })}
                    >
                      {i + 1}
                    </PillButton>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <PillButton
                    pressed={collection === 'owned'}
                    onClick={() => setCollection('owned')}
                  >
                    {t('personal.owned')}
                  </PillButton>
                  <PillButton
                    pressed={collection === 'rewards'}
                    onClick={() => setCollection('rewards')}
                  >
                    {t('personal.newRewards')}
                  </PillButton>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {DECORATIONS.filter((item) =>
                    collection === 'owned' ? data.owned.has(item.id) : !data.owned.has(item.id),
                  ).map((item) => {
                    const owned = data.owned.has(item.id);
                    return (
                      <button
                        key={item.id}
                        disabled={busy || !owned}
                        aria-pressed={profile.slots[slot] === item.id}
                        className="min-h-28 rounded-2xl bg-surface p-2 text-body-sm aria-pressed:ring-2 aria-pressed:ring-accent disabled:opacity-50"
                        onClick={() =>
                          void save({
                            ...profile,
                            slots: profile.slots.map((v, i) =>
                              i === slot ? item.id : v === item.id ? null : v,
                            ),
                          })
                        }
                      >
                        <svg
                          viewBox="-40 -60 80 80"
                          className="personal-art mx-auto h-16 w-16"
                          aria-hidden
                        >
                          <DecorationArt id={item.id} />
                        </svg>
                        <span className="block">{t('personal.items.' + item.id)}</span>
                        {!owned && (
                          <span className="mt-1 block text-caption">
                            {t('personal.unlock.' + item.id)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <PillButton
                  disabled={busy || !profile.slots[slot]}
                  onClick={() =>
                    void save({
                      ...profile,
                      slots: profile.slots.map((v, i) => (i === slot ? null : v)),
                    })
                  }
                >
                  {t('personal.remove')}
                </PillButton>
                <p className="text-caption text-muted">{t('personal.free')}</p>
              </>
            ) : (
              <>
                <label className="block text-body-sm">
                  {t('personal.name')}
                  <input
                    key={profile.name}
                    maxLength={24}
                    defaultValue={profile.name}
                    className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
                    onBlur={(e) => {
                      if (e.target.value !== profile.name)
                        void save({ ...profile, name: e.target.value });
                    }}
                  />
                </label>
                {(['suit', 'skin', 'hat'] as const).map((kind) => (
                  <fieldset key={kind}>
                    <legend className="mb-2 text-body-sm text-muted">
                      {t('personal.' + kind)}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {(kind === 'suit' ? SUITS : kind === 'skin' ? SKINS : HATS).map((v) => (
                        <PillButton
                          key={v}
                          pressed={profile[kind] === v}
                          disabled={busy}
                          onClick={() => void save({ ...profile, [kind]: v })}
                        >
                          {t('personal.choices.' + v)}
                        </PillButton>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <p className="text-caption text-muted">{t('personal.saved')}</p>
              </>
            )}
          </>
        )}
      </div>
    </ScreenFrame>
  );
}
