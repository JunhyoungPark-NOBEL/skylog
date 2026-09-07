import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { putBlob } from '@/db/repos/blobs';
import { PHOTO_MAX_PX, resizeImage, useBlobUrl } from '@/features/log/imageUtils';
import { PillButton } from '@/ui/PillButton';

export interface PhotoChange {
  added?: string;
  removed?: string;
}

interface PhotoInputProps {
  /** 저장된 사진 blob id 목록 */
  ids: readonly string[];
  /** 목록이 바뀔 때(추가/삭제). 폼은 `change`로 이 세션에서 만든 blob을 추적한다. */
  onChange(ids: string[], change: PhotoChange): void;
}

/**
 * 사진 첨부(task-04 §3.2): 카메라(`capture="environment"`) 또는 앨범 → 긴 변 1600px로 줄여 `blobs`에 저장.
 * 리사이즈에 실패하면 원본을 넣지 않고 안내만 보여 준다. 썸네일은 저장된 blob에서 다시 읽는다.
 */
export function PhotoInput({ ids, onChange }: PhotoInputProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setNotice(null);
    let next = [...ids];
    let failed = 0;
    for (const file of files) {
      try {
        const r = await resizeImage(file, PHOTO_MAX_PX);
        const rec = await putBlob('photo', r.blob, { width: r.width, height: r.height });
        next = [...next, rec.id];
        onChange(next, { added: rec.id });
      } catch {
        failed += 1;
      }
    }
    if (failed > 0) setNotice(t('log.form.photoUnreadable'));
    setBusy(false);
  };

  const remove = (id: string) => {
    onChange(
      ids.filter((x) => x !== id),
      { removed: id },
    );
  };

  return (
    <div className="px-4 py-3" data-testid="obs-photos">
      <div className="mb-2 text-caption text-muted">{t('log.form.photos')}</div>
      {ids.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {ids.map((id, i) => (
            <PhotoThumb key={id} id={id} index={i} onRemove={() => remove(id)} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <PillButton
          size="sm"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          testId="obs-photo-camera-btn"
        >
          📷 {t('log.form.photoCamera')}
        </PillButton>
        <PillButton
          size="sm"
          disabled={busy}
          onClick={() => libraryRef.current?.click()}
          testId="obs-photo-library-btn"
        >
          🖼 {t('log.form.photoLibrary')}
        </PillButton>
      </div>
      {busy && <p className="mt-2 text-caption text-muted">{t('log.form.photoProcessing')}</p>}
      {notice && (
        <p className="mt-2 text-caption text-danger" data-testid="obs-photo-notice">
          {notice}
        </p>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void onFiles(e)}
        data-testid="obs-photo-input"
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void onFiles(e)}
        data-testid="obs-photo-library"
      />
    </div>
  );
}

function PhotoThumb({ id, index, onRemove }: { id: string; index: number; onRemove(): void }) {
  const { t } = useTranslation();
  const url = useBlobUrl(id);
  return (
    <li className="relative h-20 w-20 overflow-hidden rounded-sm bg-surface-2">
      {url ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          data-testid={`obs-photo-${index}`}
        />
      ) : (
        <div className="h-full w-full" data-testid={`obs-photo-${index}`} />
      )}
      <button
        type="button"
        aria-label={t('log.form.photoRemove')}
        onClick={onRemove}
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-bl-sm bg-bg/70 text-body-sm text-fg"
        data-testid={`obs-photo-remove-${index}`}
      >
        ✕
      </button>
    </li>
  );
}
