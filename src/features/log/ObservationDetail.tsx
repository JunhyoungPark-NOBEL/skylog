import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/app/i18n';
import { navigate } from '@/app/router';
import { nightKey } from '@/astro/time';
import { displayName, secondaryName, type Catalog } from '@/catalog/catalog';
import { kindOf } from '@/catalog/objectId';
import { fovForTarget, resolveTarget } from '@/catalog/objectTarget';
import { deleteObservation, restoreObservation } from '@/db/repos/observations';
import type { Observation } from '@/db/types';
import { formatLocalDateTime, nightLabel, siteLabel } from '@/features/log/logUtils';
import { tagLabelKey } from './tagPresets';
import { useBlobUrl } from '@/features/log/useObservations';
import { openObject } from '@/features/object/objectApi';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { flyToObject, getSkyScene } from '@/features/sky/skyApi';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { openObservationForm, showToast } from '@/state/logUiStore';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { formatAlt, formatAzimuth, formatSeparation } from '@/ui/format';
import { PillButton } from '@/ui/PillButton';
import { getBlob } from '@/db/repos/blobs';
import { downloadBlob } from '@/native/files';
import { prepareSketchDraft } from '@/community/sketchDraft';

const UNDO_MS = 5000;

interface ObservationDetailProps {
  observation: Observation;
  cat: Catalog | null;
  lang: Lang;
  onClose(): void;
}

function Row({ label, value, testId }: { label: string; value: ReactNode; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-caption text-muted">{label}</span>
      <span
        className="min-w-0 text-right text-body-sm font-semibold tabular-nums"
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}

/** 저장된 blob 이미지(스케치·사진). 누르면 크게 본다. */
function BlobImage({
  blobId,
  label,
  onOpen,
}: {
  blobId: string;
  label: string;
  onOpen(id: string): void;
}) {
  const url = useBlobUrl(blobId);
  if (!url)
    return (
      <div className="aspect-square w-full animate-pulse rounded-md bg-surface-3" aria-hidden />
    );
  return (
    <button
      type="button"
      onClick={() => onOpen(blobId)}
      aria-label={label}
      className="block w-full overflow-hidden rounded-md bg-surface-3 transition-transform duration-150 ease-standard active:scale-[0.98]"
      data-testid="detail-image"
    >
      <img src={url} alt={label} className="block max-h-80 w-full object-contain" />
    </button>
  );
}

/** 전체 화면 이미지 뷰어 — 아무 데나 누르면 닫힌다 */
function ImageViewer({ blobId, onClose }: { blobId: string; onClose(): void }) {
  const { t } = useTranslation();
  const url = useBlobUrl(blobId);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
      onClick={onClose}
      role="dialog"
      aria-modal
      data-testid="detail-image-viewer"
    >
      {url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="safe-top absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-pill bg-surface-3/80 text-body-lg text-fg"
        data-testid="detail-image-close"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * 기록 상세(task-04 §3.4): 전체 화면 오버레이(포털·z-30). 모든 필드 + 스케치/사진 뷰어 +
 * "하늘에서 다시 보기" · "편집" · "삭제(확인 → 실행 취소 토스트)".
 * `main`의 스태킹 컨텍스트 밖(document.body)에 그려야 떠 있는 탭 pill(z-20) 위에 올라간다.
 */
export function ObservationDetail({ observation: o, cat, lang, onClose }: ObservationDetailProps) {
  const { t } = useTranslation();
  const site = useLocationStore((s) => s.site);
  const [confirming, setConfirming] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareSketch = async (community: boolean) => {
    if (!o.sketchBlobId || sharing) return;
    setSharing(true);
    try {
      const stored = await getBlob(o.sketchBlobId);
      if (!stored) {
        showToast(t('field.sketchMissing'));
        return;
      }
      if (community) {
        await prepareSketchDraft(o.objectId, stored.data);
        onClose();
        navigate('community');
      } else await downloadBlob(stored.data, `skyard-sketch-${o.nightKey}.png`);
    } catch {
      showToast(t('field.sketchShareFailed'));
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (viewer) setViewer(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, onClose]);

  const name = cat ? displayName(cat, o.objectId, lang) : o.objectId;
  const secondary = cat ? secondaryName(cat, o.objectId, lang) : undefined;
  const seen = o.outcome === 'seen';
  const c = o.conditions;
  const currentYear = Number(nightKey(useClockStore.getState().now()).slice(0, 4));
  const hasConditions =
    c &&
    (c.moonIllum !== undefined ||
      c.moonSepDeg !== undefined ||
      c.altDeg !== undefined ||
      c.cloudCover !== undefined ||
      c.tempC !== undefined ||
      c.humidity !== undefined ||
      c.bortle !== undefined);
  const photos = o.photoBlobIds ?? [];

  const showInSky = () => {
    const now = useClockStore.getState().now();
    const target = cat
      ? resolveTarget(cat, o.objectId, now, site, getSkyScene()?.objectJ2000(o.objectId) ?? null)
      : null;
    flyToObject(o.objectId, target ? fovForTarget(target) : undefined);
    onClose();
    navigate('sky');
    openObject(o.objectId, 'half');
  };
  const edit = () => openObservationForm({ objectId: o.objectId, observationId: o.id });
  const remove = () => {
    const id = o.id;
    onClose();
    void deleteObservation(id).then(() => {
      showToast(
        t('log.tab.deleted'),
        { label: t('log.tab.undo'), onClick: () => void restoreObservation(id) },
        UNDO_MS,
      );
    });
  };

  const body = (
    <div className="fixed inset-0 z-30 bg-bg text-fg" data-observation-id={o.id}>
      <ScreenFrame title={t('log.detail.title')} onBack={onClose} testId="observation-detail">
        <div className="flex flex-col gap-3 px-4 pt-2">
          <div className="flex items-center gap-3 px-1">
            <span
              className={`text-display leading-none ${seen ? 'text-marker' : 'text-muted'}`}
              aria-hidden
            >
              ★
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-title" data-testid="detail-name">
                {name}
              </h2>
              <p className="truncate text-caption text-muted">
                {[t(`sky.kind.${kindOf(o.objectId)}`), secondary].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <PillButton size="sm" variant="primary" onClick={showInSky} testId="detail-show-in-sky">
              {t('log.detail.showInSky')}
            </PillButton>
            <PillButton size="sm" onClick={edit} testId="detail-edit">
              {t('log.detail.edit')}
            </PillButton>
          </div>

          <Card title={t('log.detail.when')}>
            <Row
              label={t('log.detail.time')}
              value={`${nightLabel(o.nightKey, lang, currentYear)} · ${formatLocalDateTime(o.observedAt)}`}
              testId="detail-time"
            />
            <Row label={t('log.detail.site')} value={siteLabel(o.site)} testId="detail-site" />
            <Row
              label={t('log.detail.outcome')}
              value={
                <span className={seen ? 'text-marker' : 'text-muted'}>
                  {seen ? t('log.detail.seen') : t('log.detail.notSeen')}
                </span>
              }
              testId="detail-outcome"
            />
          </Card>

          <Card title={t('log.detail.how')}>
            <Row
              label={t('log.detail.equipment')}
              value={o.equipment ? t(`log.tab.equip.${o.equipment.kind}`) : '—'}
              testId="detail-equipment"
            />
            {o.equipment?.magnification !== undefined && (
              <Row label={t('log.detail.magnification')} value={`×${o.equipment.magnification}`} />
            )}
          </Card>

          {hasConditions && c && (
            <Card title={t('log.detail.conditions')} testId="detail-conditions">
              {c.moonIllum !== undefined && (
                <Row
                  label={t('log.detail.moonIllum')}
                  value={`${Math.round(c.moonIllum * 100)}%`}
                />
              )}
              {c.moonSepDeg !== undefined && (
                <Row label={t('log.detail.moonSep')} value={formatSeparation(c.moonSepDeg)} />
              )}
              {c.altDeg !== undefined && (
                <Row
                  label={t('log.detail.altAz')}
                  value={
                    c.azDeg !== undefined
                      ? `${formatAlt(c.altDeg, 0)} · ${formatAzimuth(c.azDeg, lang)}`
                      : formatAlt(c.altDeg, 0)
                  }
                />
              )}
              {c.cloudCover !== undefined && (
                <Row label={t('log.detail.cloud')} value={`${Math.round(c.cloudCover)}%`} />
              )}
              {c.tempC !== undefined && (
                <Row label={t('log.detail.temp')} value={`${Math.round(c.tempC)}°C`} />
              )}
              {c.humidity !== undefined && (
                <Row label={t('log.detail.humidity')} value={`${Math.round(c.humidity)}%`} />
              )}
              {c.bortle !== undefined && (
                <Row
                  label={t('log.detail.bortleLabel')}
                  value={t('log.detail.bortle', { n: c.bortle })}
                />
              )}
            </Card>
          )}

          {(o.tags.length > 0 || o.notes.trim()) && (
            <Card title={t('log.detail.notes')} testId="detail-notes">
              {o.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {o.tags.map((tag) => (
                    <Chip key={tag} tone="muted" selected>
                      {t(tagLabelKey(tag), { defaultValue: tag })}
                    </Chip>
                  ))}
                </div>
              )}
              {o.notes.trim() && (
                <p className={`whitespace-pre-wrap text-body ${o.tags.length ? 'mt-3' : ''}`}>
                  {o.notes}
                </p>
              )}
            </Card>
          )}

          {(o.sketchBlobId || photos.length > 0) && (
            <Card
              title={t('log.detail.images')}
              aside={t('log.detail.viewerHint')}
              testId="detail-images"
            >
              <div className="flex flex-col gap-2">
                {o.sketchBlobId && (
                  <BlobImage
                    blobId={o.sketchBlobId}
                    label={t('log.detail.sketch')}
                    onOpen={setViewer}
                  />
                )}
                {photos.map((id) => (
                  <BlobImage
                    key={id}
                    blobId={id}
                    label={t('log.detail.photo')}
                    onOpen={setViewer}
                  />
                ))}
              </div>
              {o.sketchBlobId && (
                <details className="mt-3" data-testid="sketch-share">
                  <summary className="min-h-11 cursor-pointer py-3 text-body-sm font-semibold">
                    {t('field.shareSketch')}
                  </summary>
                  <p className="mb-2 text-caption text-muted">{t('field.sketchShareHint')}</p>
                  <div className="flex flex-wrap gap-2">
                    <PillButton
                      size="sm"
                      disabled={sharing}
                      onClick={() => void shareSketch(false)}
                      testId="sketch-export"
                    >
                      {t('field.saveSketch')}
                    </PillButton>
                    <PillButton
                      size="sm"
                      disabled={sharing}
                      onClick={() => void shareSketch(true)}
                      testId="sketch-community"
                    >
                      {t('field.communitySketch')}
                    </PillButton>
                  </div>
                </details>
              )}
            </Card>
          )}

          <div className="pt-2">
            {confirming ? (
              <div
                className="squircle flex items-center gap-2 rounded-lg bg-danger-soft p-3"
                data-testid="detail-delete-confirm-bar"
              >
                <span className="min-w-0 flex-1 text-body-sm text-danger">
                  {t('log.detail.confirmDelete')}
                </span>
                <PillButton
                  size="sm"
                  variant="danger"
                  onClick={remove}
                  testId="detail-delete-confirm"
                >
                  {t('log.detail.delete')}
                </PillButton>
                <PillButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                  testId="detail-delete-cancel"
                >
                  {t('log.detail.cancel')}
                </PillButton>
              </div>
            ) : (
              <PillButton
                variant="danger"
                className="w-full"
                onClick={() => setConfirming(true)}
                testId="detail-delete"
              >
                {t('log.detail.delete')}
              </PillButton>
            )}
          </div>
        </div>
      </ScreenFrame>
      {viewer && <ImageViewer blobId={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
  return createPortal(body, document.body);
}
