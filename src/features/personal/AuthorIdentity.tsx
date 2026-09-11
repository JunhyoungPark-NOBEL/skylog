import { useTranslation } from 'react-i18next';
import type { CommunityIdentity } from '@/community/identity';
import { DEFAULT_AVATAR } from '@/personal/avatar';
import { AvatarPortrait } from './AvatarArt';
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PERSONAL } from '@/personal/catalog';

const ProfileArt = lazy(() =>
  import('./GardenArt').then((module) => ({ default: module.GardenArt })),
);

export function AuthorIdentity({
  identity,
  compact = false,
}: {
  identity?: CommunityIdentity;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const name = identity?.name || t('social.observer');
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const title = useId();
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    // 그림을 누르면 body로 초점이 옮겨져도 열린 프로필의 키 조작을 유지한다.
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        anchor.current?.focus({ preventScroll: true });
      } else if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        closeButton.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [open]);
  const close = () => {
    setOpen(false);
    anchor.current?.focus({ preventScroll: true });
  };
  const portrait = (
    <>
      <AvatarPortrait
        profile={identity?.avatar ?? DEFAULT_AVATAR}
        label={t('communityIdentity.avatarLabel', { name })}
        className={compact ? 'h-8 w-8' : 'h-11 w-11'}
      />
      <span className="min-w-0 break-words text-body-sm text-muted">{name}</span>
    </>
  );
  // 사진 목록 전체가 버튼인 축약형에는 중첩 버튼을 만들지 않는다.
  if (compact || !identity)
    return (
      <span className="flex min-w-0 items-center gap-2" data-testid="author-identity">
        {portrait}
      </span>
    );
  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('communityIdentity.view', { name })}
        className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl text-left"
        data-testid="author-identity"
      >
        {portrait}
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={title}
              data-testid="public-horizon-profile"
              className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-hairline bg-surface p-4 text-fg shadow-card"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id={title} className="text-title">
                  {name}
                </h2>
                <button
                  ref={closeButton}
                  type="button"
                  className="min-h-11 min-w-11 rounded-full bg-surface-2"
                  aria-label={t('communityIdentity.close')}
                  onClick={close}
                >
                  ✕
                </button>
              </div>
              <Suspense fallback={<p role="status">{t('common.loading')}</p>}>
                <ProfileArt
                  profile={{
                    ...DEFAULT_PERSONAL,
                    ...identity.avatar,
                    ...(identity.horizon ?? { slots: [null, null, null, null, null] }),
                    name,
                  }}
                  label={t('communityIdentity.profileLabel', { name })}
                />
              </Suspense>
              {!identity.horizon && (
                <p className="mt-3 text-caption text-muted">{t('communityIdentity.noHorizon')}</p>
              )}
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
