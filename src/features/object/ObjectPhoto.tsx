import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getObjectPhoto, type ObjectPhoto } from '@/catalog/objectPhotos';
import type { ObjectId } from '@/catalog/objectId';
import { useSettingsStore } from '@/state/settingsStore';

/** 사진마다 원문 크레딧과 활성 링크를 바로 옆에 유지한다. */
export function PhotoCredit({ photo, className = '' }: { photo: ObjectPhoto; className?: string }) {
  const { t } = useTranslation();
  return (
    <p
      className={`break-words text-caption leading-relaxed text-muted ${className}`}
      data-testid="photo-credit"
    >
      <span>{t('objectPhoto.credit')} </span>
      {photo.creditParts.map((part, index) =>
        part.url ? (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {part.text}
          </a>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
      {' · '}
      <a
        href={photo.sourceURL}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {t('objectPhoto.source')}
      </a>
      {' · '}
      <a
        href={photo.licenseURL}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {photo.license}
      </a>
      <span className="block">{t('objectPhoto.adaptation')}</span>
    </p>
  );
}

function PhotoMedia({
  photo,
  small = false,
  original = false,
  fallback,
}: {
  photo: ObjectPhoto;
  small?: boolean;
  original?: boolean;
  fallback?: ReactNode;
}) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const filterId = `object-photo-${useId().replace(/:/g, '')}`;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const asset = small ? photo.thumb : photo.hero;
  if (failed)
    return small ? (
      <>{fallback}</>
    ) : (
      <div
        className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 p-4 text-body-sm text-muted"
        role="status"
        data-testid="photo-unavailable"
      >
        <span>{t('objectPhoto.unavailable')}</span>
        <button
          type="button"
          className="min-h-11 rounded-pill bg-surface-3 px-4 text-fg"
          onClick={() => {
            setAttempt((n) => n + 1);
            setFailed(false);
          }}
        >
          {t('objectPhoto.retry')}
        </button>
      </div>
    );
  return (
    <span
      className={
        small
          ? 'relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bg'
          : 'relative block overflow-hidden rounded-xl bg-bg'
      }
    >
      <svg width="0" height="0" aria-hidden="true" className="absolute pointer-events-none">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values=".21 .41 .08 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
      <img
        key={attempt}
        src={`${import.meta.env.BASE_URL}${asset.path}`}
        width={asset.width}
        height={asset.height}
        alt={small ? '' : `${photo.title[lang]} — ${photo.caption[lang]}`}
        draggable={false}
        loading={small ? 'lazy' : 'eager'}
        decoding="async"
        onError={() => setFailed(true)}
        className={`${small ? 'h-full w-full' : 'max-h-64 w-full'} object-contain ${original ? 'object-photo-original' : 'object-photo-protected'}`}
        style={{ '--object-photo-night-filter': `url("#${filterId}")` } as CSSProperties}
        data-testid={small ? 'object-photo-thumb' : 'object-photo-hero'}
        data-object-id={photo.objectId}
      />
    </span>
  );
}

export function PhotoThumbnail({ photo, fallback }: { photo: ObjectPhoto; fallback: ReactNode }) {
  return <PhotoMedia key={photo.objectId} photo={photo} small fallback={fallback} />;
}

function PhotoCard({ photo }: { photo: ObjectPhoto }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  const night = useSettingsStore((s) => s.theme === 'night');
  const [original, setOriginal] = useState(false);
  return (
    <figure
      className="my-3 rounded-xl bg-surface-2/60 p-2.5"
      data-testid="object-photo-card"
      data-object-id={photo.objectId}
    >
      <PhotoMedia photo={photo} original={original} />
      <figcaption className="px-0.5 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-body-sm font-medium">{photo.title[lang]}</span>
          <span className="text-caption text-muted">
            {t(`objectPhoto.band.${photo.spectralBand}`)}
          </span>
        </div>
        <p className="mt-1 text-caption leading-relaxed text-muted">{photo.caption[lang]}</p>
        <p className="mt-1 text-caption leading-relaxed text-muted">{t('objectPhoto.reference')}</p>
        {night && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-caption text-muted">
            <span>{original ? t('objectPhoto.originalNotice') : t('objectPhoto.nightNotice')}</span>
            <button
              type="button"
              className="min-h-11 rounded-pill bg-surface-3 px-3 text-fg"
              aria-pressed={original}
              data-testid="photo-original"
              onClick={() => setOriginal((value) => !value)}
            >
              {original ? t('objectPhoto.protect') : t('objectPhoto.original')}
            </button>
          </div>
        )}
        <PhotoCredit photo={photo} className="mt-2" />
        <p className="mt-1 text-caption leading-relaxed text-muted">{photo.modifications[lang]}</p>
      </figcaption>
    </figure>
  );
}

export function ObjectPhotoCard({ id }: { id: ObjectId }) {
  const theme = useSettingsStore((s) => s.theme);
  const photo = getObjectPhoto(id);
  // 다른 천체·다른 테마로 바뀌면 밝은 원본 보기와 이미지 오류 상태를 초기화한다.
  return photo ? <PhotoCard key={`${id}:${theme}`} photo={photo} /> : null;
}
