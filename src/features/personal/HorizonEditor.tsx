import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { navigateLearn } from '@/features/learn/learnNavigation';
import { DECORATIONS, GROUND_STYLES, type DecorationId, type Personal } from '@/personal/catalog';
import { HORIZON_SLOTS } from '@/personal/horizonArt';
import type { saveGarden } from '@/personal/store';
import { PillButton } from '@/ui/PillButton';
import { DecorationArt } from './GardenArt';
import { BackdropPicker } from './BackdropPicker';

const GROUPS = ['all', 'equipment', 'furniture', 'nature'] as const;
type Group = (typeof GROUPS)[number];
const EQUIPMENT: ReadonlySet<string> = new Set([
  'telescope',
  'binocular-mount',
  'refractor-long',
  'reflector',
  'dobsonian',
  'sct',
  'radio-dish',
  'observatory-dome',
]);
const FURNITURE: ReadonlySet<string> = new Set([
  'bench',
  'picnic-table',
  'pavilion',
  'sketchbook',
  'signpost',
  'lantern',
  'books',
  'house',
  'observing-deck',
]);

function groupFor(id: DecorationId): Group {
  return EQUIPMENT.has(id) ? 'equipment' : FURNITURE.has(id) ? 'furniture' : 'nature';
}

export function HorizonEditor({
  profile,
  owned,
  ownedGround,
  ownedBackdrop,
  progress,
  busy,
  slot,
  onSlot,
  onSave,
}: {
  profile: Personal;
  owned: ReadonlySet<string>;
  ownedGround: ReadonlySet<string>;
  ownedBackdrop: ReadonlySet<string>;
  progress?: ReadonlyMap<string, { n: number; total: number }>;
  busy: boolean;
  slot: number;
  onSlot(slot: number): void;
  onSave(next: Parameters<typeof saveGarden>[0]): Promise<void>;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [tab, setTab] = useState<'placement' | 'background' | 'ground' | 'view'>('placement');
  const [collection, setCollection] = useState<'owned' | 'rewards'>('owned');
  const [group, setGroup] = useState<Group>('all');
  const items = DECORATIONS.filter(
    (item) =>
      (collection === 'owned' ? owned.has(item.id) : !owned.has(item.id)) &&
      (group === 'all' || groupFor(item.id) === group),
  );
  const selected = profile.slots[slot];
  return (
    <div className="space-y-4" data-testid="horizon-editor">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-xs text-body-sm text-muted">{t('horizon.intro')}</p>
        <PillButton
          disabled={busy}
          size="sm"
          className="min-h-11 px-3"
          onClick={() => navigate('sky')}
        >
          {t('horizon.openSky')}
        </PillButton>
      </div>
      <div
        className="grid grid-cols-4 gap-1 rounded-2xl bg-surface p-1"
        aria-label={t('horizon.sections')}
      >
        {(['placement', 'background', 'ground', 'view'] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className="min-h-11 min-w-0 rounded-xl px-2 text-body-sm font-medium aria-pressed:bg-accent-soft aria-pressed:text-accent"
          >
            {t('horizon.tabs.' + key)}
          </button>
        ))}
      </div>
      {tab === 'placement' && (
        <>
          <fieldset className="min-w-0" disabled={busy}>
            <legend className="mb-2 text-body-sm font-medium">{t('personal.pickSlot')}</legend>
            <div className="grid grid-cols-5 gap-1" aria-label={t('personal.slots')}>
              {HORIZON_SLOTS.map((position, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={slot === i}
                  aria-label={t('personal.slot', { n: i + 1 })}
                  aria-describedby={`${id}-direction-${i}`}
                  onClick={() => onSlot(i)}
                  className="min-h-14 min-w-0 rounded-xl border border-fg/10 bg-surface px-1 py-2 aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
                >
                  <span className="block text-body-sm font-semibold">{i + 1}</span>
                  <span id={`${id}-direction-${i}`} className="block text-[11px] leading-snug">
                    {t('horizon.directions.' + i)}
                    <br />
                    {position.azDeg}°
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
              <p className="min-w-0 text-body-sm text-muted">
                {t('horizon.currentSpot', { n: slot + 1 })} ·{' '}
                {selected ? t('personal.items.' + selected) : t('horizon.emptySpot')}
              </p>
              <button
                type="button"
                disabled={!selected}
                className="min-h-11 shrink-0 px-2 text-body-sm text-accent disabled:text-muted disabled:opacity-50"
                onClick={() =>
                  void onSave({ slots: profile.slots.map((item, i) => (i === slot ? null : item)) })
                }
              >
                {t('personal.remove')}
              </button>
            </div>
          </fieldset>
          <div
            className="flex gap-2 border-b border-fg/10 pb-2"
            aria-label={t('horizon.collection')}
          >
            {(['owned', 'rewards'] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={collection === key}
                onClick={() => setCollection(key)}
                className="min-h-11 min-w-0 rounded-xl px-3 text-body-sm font-medium text-muted aria-pressed:bg-accent-soft aria-pressed:text-accent"
              >
                {t(key === 'owned' ? 'personal.owned' : 'personal.newRewards')}
                <span className="ml-1.5 text-caption">
                  {
                    DECORATIONS.filter((item) =>
                      key === 'owned' ? owned.has(item.id) : !owned.has(item.id),
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1" aria-label={t('horizon.groupsLabel')}>
            {GROUPS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={group === key}
                onClick={() => setGroup(key)}
                className="min-h-11 rounded-xl px-3 text-body-sm text-muted aria-pressed:bg-surface-3 aria-pressed:text-fg"
              >
                {t('horizon.groups.' + key)}
              </button>
            ))}
          </div>
          {items.length === 0 ? (
            <p className="rounded-2xl bg-surface p-4 text-body-sm text-muted">
              {t(collection === 'owned' ? 'horizon.noOwned' : 'horizon.noLocked')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="horizon-items">
              {items.map((item) => {
                const unlocked = owned.has(item.id);
                const count = item.badge ? progress?.get(item.badge) : undefined;
                const placed = profile.slots.indexOf(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy || !unlocked}
                    aria-label={t('personal.items.' + item.id)}
                    aria-pressed={selected === item.id}
                    aria-describedby={`${id}-item-${item.id}`}
                    className="min-w-0 rounded-2xl border-2 border-transparent bg-surface p-3 text-body-sm aria-pressed:border-accent aria-pressed:bg-accent-soft disabled:opacity-65"
                    onClick={() =>
                      void onSave({
                        slots: profile.slots.map((entry, i) =>
                          i === slot ? item.id : entry === item.id ? null : entry,
                        ),
                      })
                    }
                  >
                    <svg
                      viewBox="-64 -112 128 128"
                      className="personal-art mx-auto h-20 w-20"
                      aria-hidden="true"
                    >
                      <DecorationArt id={item.id} />
                    </svg>
                    <span className="mt-1 block font-medium">{t('personal.items.' + item.id)}</span>
                    <span
                      id={`${id}-item-${item.id}`}
                      className="mt-1 block text-caption text-muted"
                    >
                      {unlocked
                        ? placed >= 0
                          ? t('horizon.placedAt', { n: placed + 1 })
                          : t('horizon.ready')
                        : t('personal.unlock.' + item.id)}
                      {!unlocked && count && (
                        <span className="mt-1 block tabular-nums">
                          {t('avatar.progress', { n: count.n, total: count.total })}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {collection === 'rewards' && (
            <PillButton variant="ghost" onClick={() => navigateLearn('achievements')}>
              {t('avatar.achievements')}
            </PillButton>
          )}
          <p className="text-caption text-muted">{t('horizon.moveHint')}</p>
        </>
      )}
      {tab === 'ground' && (
        <fieldset disabled={busy} className="min-w-0 space-y-3">
          <legend className="mb-2 text-body-sm font-medium">{t('horizon.groundTitle')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {GROUND_STYLES.map((ground) => {
              const unlocked = ownedGround.has(ground.id);
              const count = ground.badge ? progress?.get(ground.badge) : undefined;
              return (
                <button
                  key={ground.id}
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={profile.ground === ground.id}
                  aria-label={t('horizon.ground.' + ground.id)}
                  aria-describedby={`${id}-ground-${ground.id}`}
                  className="min-w-0 overflow-hidden rounded-2xl border-2 border-transparent bg-surface p-3 text-body-sm aria-pressed:border-accent aria-pressed:bg-accent-soft disabled:opacity-65"
                  onClick={() => void onSave({ ground: ground.id })}
                >
                  <span
                    className={`horizon-ground-swatch horizon-ground-${ground.id} mb-2 block h-14 rounded-xl`}
                    aria-hidden="true"
                  />
                  <span className="block font-medium">{t('horizon.ground.' + ground.id)}</span>
                  <span
                    id={`${id}-ground-${ground.id}`}
                    className="mt-1 block text-caption text-muted"
                  >
                    {t(unlocked ? 'horizon.ready' : 'horizon.groundUnlock.' + ground.id)}
                    {!unlocked && count && (
                      <span className="mt-1 block tabular-nums">
                        {t('avatar.progress', { n: count.n, total: count.total })}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-caption text-muted">{t('horizon.groundHint')}</p>
        </fieldset>
      )}
      {tab === 'background' && (
        <BackdropPicker
          profile={profile}
          owned={ownedBackdrop}
          busy={busy}
          onSelect={(backdrop) => onSave({ backdrop })}
        />
      )}
      {tab === 'view' && (
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3">
            <span>
              <span className="block text-body font-medium">{t('horizon.showScenery')}</span>
              <span className="mt-1 block text-caption text-muted">{t('horizon.showHint')}</span>
            </span>
            <input
              type="checkbox"
              checked={profile.sceneryEnabled}
              onChange={(event) => void onSave({ sceneryEnabled: event.target.checked })}
              className="h-6 w-6 shrink-0 accent-accent"
            />
          </label>
          <fieldset className="min-w-0 rounded-2xl bg-surface p-4">
            <legend className="px-1 text-body-sm font-medium">{t('horizon.scaleTitle')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['small', 'medium'] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  aria-pressed={profile.sceneryScale === scale}
                  className="min-h-12 min-w-0 rounded-xl border border-fg/10 px-2 text-body-sm aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
                  onClick={() => void onSave({ sceneryScale: scale })}
                >
                  {t('horizon.scale.' + scale)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-caption text-muted">{t('horizon.scaleHint')}</p>
          </fieldset>
          <p className="text-caption text-muted">{t('horizon.skyHint')}</p>
        </fieldset>
      )}
    </div>
  );
}
