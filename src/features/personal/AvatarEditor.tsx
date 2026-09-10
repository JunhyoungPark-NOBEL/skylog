import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AVATAR_OPTIONS,
  AVATAR_REWARDS,
  avatarOf,
  avatarOptionKey,
  type AvatarCategory,
  type AvatarLook,
} from '@/personal/avatar';
import { deleteLook, saveAvatarLook, saveLook, type SavedLook } from '@/personal/store';
import { navigateLearn } from '@/features/learn/learnNavigation';
import { PillButton } from '@/ui/PillButton';
import { AvatarPreview } from './AvatarArt';

const GROUPS = {
  face: ['skin', 'expression'],
  head: ['hair', 'hairColor', 'hat'],
  clothes: ['outfit', 'suit'],
  gear: ['accessory'],
  sky: ['background'],
} as const satisfies Record<string, readonly AvatarCategory[]>;
type Group = keyof typeof GROUPS;
type Props = {
  profile: AvatarLook;
  owned: ReadonlySet<string>;
  looks: readonly SavedLook[];
  progress?: ReadonlyMap<string, { n: number; total: number }>;
  onDone(): void;
  onBusy(busy: boolean): void;
  onRefresh(): Promise<void>;
};

export function AvatarEditor({
  profile,
  owned,
  looks,
  progress,
  onDone,
  onBusy,
  onRefresh,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [draft, setDraft] = useState(() => avatarOf(profile));
  const [history, setHistory] = useState<AvatarLook[]>([]);
  const [group, setGroup] = useState<Group>('clothes');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  function preview(next: AvatarLook) {
    setHistory((past) => [...past.slice(-19), draft]);
    setDraft(next);
    setMessage('');
  }
  async function run(action: () => Promise<unknown>, success?: string, done = false) {
    setBusy(true);
    onBusy(true);
    setError(false);
    setMessage('');
    try {
      await action();
      await onRefresh();
      if (success) setMessage(success);
      if (done) onDone();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  function shuffle() {
    const next = { ...draft };
    function pick<K extends AvatarCategory>(key: K) {
      const choices = AVATAR_OPTIONS[key].filter((v) =>
        owned.has(avatarOptionKey(key, v as AvatarLook[K])),
      );
      const choice = choices[Math.floor(Math.random() * choices.length)];
      if (choice) next[key] = choice as AvatarLook[K];
    }
    for (const key of Object.keys(AVATAR_OPTIONS) as AvatarCategory[]) pick(key);
    preview(next);
  }
  const earned = AVATAR_REWARDS.filter((reward) => owned.has(reward.key)).length;
  return (
    <div className="space-y-5" data-testid="avatar-editor">
      <div className="overflow-hidden rounded-3xl bg-surface" data-testid="avatar-current">
        <AvatarPreview profile={draft} label={t('avatar.preview')} className="h-56 w-full" />
        <p className="px-4 pb-3 text-center text-caption text-muted">{t('avatar.previewHint')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <PillButton disabled={busy} onClick={shuffle}>
          {t('avatar.shuffle')}
        </PillButton>
        <PillButton
          disabled={busy || !history.length}
          onClick={() => {
            const previous = history.at(-1);
            if (previous) {
              setDraft(previous);
              setHistory((past) => past.slice(0, -1));
              setMessage('');
            }
          }}
        >
          {t('avatar.undo')}
        </PillButton>
      </div>
      <div
        className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1 sm:grid-cols-5"
        aria-label={t('avatar.categories')}
      >
        {(Object.keys(GROUPS) as Group[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={group === key}
            className="min-h-12 rounded-xl px-1 text-body-sm font-medium aria-pressed:bg-accent-soft aria-pressed:text-accent"
            onClick={() => setGroup(key)}
          >
            {t('avatar.groups.' + key)}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {GROUPS[group].map((category) => (
          <fieldset key={category} disabled={busy}>
            <legend className="mb-2 text-body-sm font-medium">
              {t('avatar.fields.' + category)}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_OPTIONS[category].map((option) => {
                const key = avatarOptionKey(category, option);
                const unlocked = owned.has(key);
                const reward = AVATAR_REWARDS.find((item) => item.key === key);
                const count = reward && progress?.get(reward.badge);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!unlocked}
                    aria-pressed={draft[category] === option}
                    aria-label={t(`avatar.options.${category}.${option}`)}
                    aria-describedby={reward ? `${id}-${key}` : undefined}
                    className="min-w-0 rounded-2xl border-2 border-transparent bg-surface p-1 text-body-sm aria-pressed:border-accent aria-pressed:bg-accent-soft disabled:opacity-60"
                    onClick={() => preview({ ...draft, [category]: option })}
                  >
                    <div aria-hidden="true">
                      <AvatarPreview
                        profile={{ ...draft, [category]: option }}
                        label=""
                        className="h-20 w-full"
                      />
                    </div>
                    <span className="block px-1 pb-1">
                      {t(`avatar.options.${category}.${option}`)}
                    </span>
                    {reward && (
                      <span id={`${id}-${key}`} className="block px-1 pb-1 text-caption text-muted">
                        {unlocked ? t('avatar.earned') : t('avatar.unlock.' + option)}
                        {!unlocked && count && (
                          <span className="block">
                            {t('avatar.progress', { n: count.n, total: count.total })}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="text-caption text-muted">
        {t('avatar.free', { n: earned, total: AVATAR_REWARDS.length })}
      </p>
      <details className="rounded-2xl bg-surface p-4" data-testid="avatar-looks">
        <summary className="min-h-9 cursor-pointer text-body font-medium">
          {t('avatar.looks')}
        </summary>
        <p className="mt-2 text-caption text-muted">{t('avatar.looksHint')}</p>
        <div className="mt-3 space-y-3">
          {looks.map((look, index) => (
            <LookSlot
              key={`${index}:${look?.name ?? ''}`}
              look={look}
              index={index}
              busy={busy}
              onLoad={() => {
                if (look) {
                  preview(avatarOf(look.avatar));
                  setMessage(t('avatar.loaded'));
                }
              }}
              onSave={(name) =>
                void run(
                  () => saveLook(index, name || t('avatar.lookNumber', { n: index + 1 }), draft),
                  t('avatar.lookSaved'),
                )
              }
              onDelete={() => void run(() => deleteLook(index), t('avatar.lookDeleted'))}
            />
          ))}
        </div>
      </details>
      <PillButton variant="ghost" disabled={busy} onClick={() => navigateLearn('achievements')}>
        {t('avatar.achievements')}
      </PillButton>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-danger">
            {t('personal.error')}
          </p>
        )}
        {message && (
          <p role="status" className="text-body-sm text-accent">
            {message}
          </p>
        )}
      </div>
      <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 rounded-2xl bg-bg/95 py-3 backdrop-blur">
        <PillButton
          variant="primary"
          className="flex-1"
          disabled={busy}
          onClick={() => void run(() => saveAvatarLook(draft), undefined, true)}
        >
          {busy ? t('avatar.saving') : t('avatar.apply')}
        </PillButton>
        <PillButton disabled={busy} onClick={onDone}>
          {t('avatar.cancel')}
        </PillButton>
      </div>
    </div>
  );
}

function LookSlot({
  look,
  index,
  busy,
  onLoad,
  onSave,
  onDelete,
}: {
  look: SavedLook;
  index: number;
  busy: boolean;
  onLoad(): void;
  onSave(name: string): void;
  onDelete(): void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(look?.name ?? '');
  return (
    <div className="rounded-xl bg-bg p-3" data-testid={`avatar-look-${index}`}>
      <label className="block text-caption text-muted">
        {t('avatar.lookNumber', { n: index + 1 })}
        <input
          value={name}
          maxLength={24}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('avatar.lookName')}
          className="mt-1 min-h-11 w-full rounded-lg bg-surface px-3 text-body text-fg"
        />
      </label>
      {look && (
        <AvatarPreview profile={look.avatar} label={look.name} className="mt-2 h-24 w-full" />
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <PillButton size="sm" disabled={busy} onClick={() => onSave(name)}>
          {t(look ? 'avatar.replaceLook' : 'avatar.saveLook')}
        </PillButton>
        {look && (
          <>
            <PillButton size="sm" disabled={busy} onClick={onLoad}>
              {t('avatar.loadLook')}
            </PillButton>
            <PillButton size="sm" variant="ghost" disabled={busy} onClick={onDelete}>
              {t('avatar.deleteLook')}
            </PillButton>
          </>
        )}
      </div>
    </div>
  );
}
