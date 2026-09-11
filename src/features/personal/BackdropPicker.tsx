import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BACKDROP_STYLES, type HorizonBackdrop, type Personal } from '@/personal/catalog';
import { horizonPanoramaSvg } from '@/personal/horizonArt';
import { GardenArt } from './GardenArt';
import { PersonalArtNightFilter } from './AvatarArt';
import { personalArtNightStyle } from './personalArtStyle';

export function BackdropPicker({
  profile,
  owned,
  busy,
  onSelect,
}: {
  profile: Personal;
  owned: ReadonlySet<string>;
  busy: boolean;
  onSelect(backdrop: HorizonBackdrop): Promise<void>;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<HorizonBackdrop | null>(null);
  const id = useId();
  const opener = useRef<HTMLButtonElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = () => {
    setPreview(null);
    opener.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!preview) return;
    closeButton.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPreview(null);
        opener.current?.focus({ preventScroll: true });
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => document.removeEventListener('keydown', keyboard, true);
  }, [preview]);
  return (
    <div className="space-y-3" data-testid="horizon-backdrops">
      <p className="text-body-sm text-muted">{t('horizon.backdropHint')}</p>
      <div className="grid grid-cols-2 gap-3">
        {BACKDROP_STYLES.map((item) => {
          const night = id + item.id;
          const unlocked = owned.has(item.id);
          return (
            <article
              key={item.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-fg/10 bg-surface"
            >
              <button
                type="button"
                className="block min-h-20 w-full overflow-hidden bg-surface-2"
                aria-label={t('horizon.previewBackdrop', {
                  name: t('horizon.backdrop.' + item.id),
                })}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setPreview(item.id);
                }}
              >
                <svg
                  viewBox="0 0 1200 320"
                  className="personal-art personal-art-tone block w-full"
                  aria-hidden="true"
                  style={personalArtNightStyle(night)}
                >
                  <defs>
                    <PersonalArtNightFilter id={night} />
                  </defs>
                  <rect width="1200" height="320" fill="#45636e" />
                  <svg
                    x="0"
                    y="40"
                    width="1200"
                    height="280"
                    viewBox="0 0 1200 280"
                    dangerouslySetInnerHTML={{
                      __html: horizonPanoramaSvg(
                        { ...profile, slots: [], backdrop: item.id },
                        { idPrefix: night },
                      ),
                    }}
                  />
                </svg>
              </button>
              <div className="space-y-1 p-2">
                <button
                  type="button"
                  disabled={busy || !unlocked}
                  aria-pressed={(profile.backdrop ?? 'field') === item.id}
                  aria-label={t('horizon.backdrop.' + item.id)}
                  aria-describedby={`${id}-${item.id}-unlock`}
                  onClick={() => void onSelect(item.id)}
                  className="min-h-11 w-full rounded-xl px-2 text-body-sm font-medium aria-pressed:bg-accent-soft aria-pressed:text-accent disabled:text-muted"
                >
                  {t('horizon.backdrop.' + item.id)}
                </button>
                <p id={`${id}-${item.id}-unlock`} className="px-1 pb-1 text-caption text-muted">
                  {t(unlocked ? 'horizon.ready' : 'horizon.backdropUnlock.' + item.id)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      {preview &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4"
            onClick={(event) => {
              if (event.currentTarget === event.target) close();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-preview-title`}
              data-testid="horizon-backdrop-preview"
              className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-hairline bg-surface p-4 text-fg"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id={`${id}-preview-title`} className="text-title">
                  {t('horizon.backdrop.' + preview)}
                </h2>
                <button
                  type="button"
                  ref={closeButton}
                  onClick={close}
                  className="min-h-11 min-w-11 rounded-full bg-surface-2"
                  aria-label={t('horizon.closePreview')}
                >
                  ✕
                </button>
              </div>
              <GardenArt
                profile={{ ...profile, backdrop: preview, sceneryEnabled: true }}
                label={t('horizon.backdrop.' + preview)}
              />
              <p className="mt-3 text-body-sm text-muted">{t('horizon.previewOnly')}</p>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
