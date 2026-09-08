import { downloadBlob } from '@/native/files';
import { emitSkill } from '@/learn/runtime';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/app/router';
import { displayName, loadCatalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import {
  bundleToJson,
  clearAllData,
  exportBundle,
  getLastBackupAt,
  importBundle,
  markBackedUp,
  observationsToCsv,
  parseBundle,
  previewImport,
  type BundleError,
  type ImportPolicy,
  type ImportPreview,
} from '@/db/exportImport';
import { listObservations } from '@/db/repos/observations';
import type { ExportBundle } from '@/db/types';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { showToast } from '@/state/logUiStore';
import { useSettingsStore } from '@/state/settingsStore';
import { DEFAULT_TZ } from '@/ui/format';
import { PillButton } from '@/ui/PillButton';
import { Segmented } from '@/ui/Segmented';
import { Toggle } from '@/ui/Toggle';

/* ------------------------------------------------------------------ 유틸 */

const CONFIRM_WINDOW_MS = 5000;

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error ?? new Error('FileReader failed'));
    r.readAsText(file);
  });
}

/** 'YYYY-MM-DD'(현지) — 파일명용 */
function todayStamp(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatWhen(iso: string, lang: 'ko' | 'en'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: DEFAULT_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/* ------------------------------------------------------------------ 레이아웃 조각(SettingsScreen과 같은 레시피) */

function SectionTitle({ children }: { children: string }) {
  return <h2 className="px-5 pb-2 pt-6 text-body-sm font-semibold text-muted">{children}</h2>;
}

function Group({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div
      className="mx-4 overflow-hidden rounded-lg bg-surface squircle [&>*+*]:hairline-t"
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`px-4 text-caption text-muted ${className}`}>{children}</p>;
}

/* ------------------------------------------------------------------ 화면 */

type Busy = 'json' | 'csv' | 'import' | 'clear' | null;

interface StorageInfo {
  usage?: number;
  quota?: number;
}

interface ImportState {
  fileName: string;
  fileSize: number;
  bundle: ExportBundle | null;
  preview: ImportPreview | null;
  error: BundleError | null;
}

export function BackupScreen({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);

  const [busy, setBusy] = useState<Busy>(null);
  const [roundCoords, setRoundCoords] = useState(false);
  const [includeBlobs, setIncludeBlobs] = useState(true);
  const [lastAt, setLastAt] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [imp, setImp] = useState<ImportState | null>(null);
  const [policy, setPolicy] = useState<ImportPolicy>('newest');
  const [importFailed, setImportFailed] = useState(false);

  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [persistAsked, setPersistAsked] = useState(false);

  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef<number | null>(null);

  const ios = isIOS();

  useEffect(() => {
    let alive = true;
    void getLastBackupAt().then((v) => {
      if (alive) setLastAt(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const st = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!st) return;
    let alive = true;
    if (typeof st.estimate === 'function') {
      void st
        .estimate()
        .then((e) => {
          if (alive) setStorage({ usage: e.usage, quota: e.quota });
        })
        .catch(() => {});
    }
    if (typeof st.persisted === 'function') {
      void st
        .persisted()
        .then((p) => {
          if (alive) setPersisted(p);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  /* ---- 내보내기 */

  async function onExportJson() {
    if (busy) return;
    setBusy('json');
    try {
      const bundle = await exportBundle({ includeBlobs, roundCoords });
      const json = bundleToJson(bundle);
      await downloadBlob(
        new Blob([json], { type: 'application/json' }),
        `skylog-backup-${todayStamp()}.json`,
      );
      await markBackedUp();
      setLastAt(await getLastBackupAt());
      await emitSkill('backup', { format: 'json', stage: 'download-requested' });
      showToast(t('backup.export.doneJson'));
    } catch {
      showToast(t('guide.error'));
    } finally {
      setBusy(null);
    }
  }

  async function onExportCsv() {
    if (busy) return;
    setBusy('csv');
    try {
      const rows = await listObservations();
      let nameOf: ((id: ObjectId) => string) | undefined;
      try {
        const cat = await loadCatalog();
        nameOf = (id) => displayName(cat, id, lang);
      } catch {
        // 카탈로그를 못 읽어도 이름 없이 내보낸다
      }
      const csv = observationsToCsv(rows, null, { lang, nameOf });
      await downloadBlob(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        `skylog-observations-${todayStamp()}.csv`,
      );
      showToast(t('backup.export.doneCsv', { n: rows.length }));
    } catch {
      showToast(t('guide.error'));
    } finally {
      setBusy(null);
    }
  }

  /* ---- 가져오기 */

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFailed(false);
    setReading(true);
    const next: ImportState = {
      fileName: file.name,
      fileSize: file.size,
      bundle: null,
      preview: null,
      error: null,
    };
    try {
      const text = await readFileText(file);
      const res = parseBundle(text);
      if (res.error) next.error = res.error;
      else {
        next.bundle = res.bundle;
        next.preview = await previewImport(res.bundle);
      }
    } catch {
      next.error = { code: 'json' };
    } finally {
      setImp(next);
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onImport() {
    if (busy || !imp?.bundle) return;
    setBusy('import');
    setImportFailed(false);
    try {
      const r = await importBundle(imp.bundle, { policy });
      showToast(
        t('backup.import.done', { added: r.added, replaced: r.replaced, skipped: r.skipped }),
      );
      setImp(null);
    } catch (err) {
      console.error('[skylog] import failed', err);
      setImportFailed(true);
    } finally {
      setBusy(null);
    }
  }

  /* ---- 저장 공간 */

  async function onPersist() {
    setPersistAsked(true);
    try {
      const ok = await navigator.storage.persist();
      setPersisted(ok);
    } catch {
      setPersisted(false);
    }
  }

  /* ---- 위험 */

  function onClearTap() {
    if (busy) return;
    setConfirmClear(true);
    if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => {
      confirmTimer.current = null;
      setConfirmClear(false);
    }, CONFIRM_WINDOW_MS);
  }

  function onClearCancel() {
    if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = null;
    setConfirmClear(false);
  }

  async function onClearConfirm() {
    if (busy) return;
    onClearCancel();
    setBusy('clear');
    try {
      await clearAllData();
      showToast(t('backup.danger.done'));
      navigate('sky');
    } finally {
      setBusy(null);
    }
  }

  /* ---- 렌더 */

  const errorText = imp?.error
    ? t(`backup.import.error.${imp.error.code}`, { detail: imp.error.detail ?? '' })
    : importFailed
      ? t('backup.import.failed')
      : null;

  const usagePct =
    storage?.usage !== undefined && storage.quota
      ? Math.min(100, Math.max(0, (storage.usage / storage.quota) * 100))
      : null;

  return (
    <ScreenFrame title={t('backup.title')} onBack={onBack} testId="backup-screen">
      {/* 내보내기 */}
      <SectionTitle>{t('backup.export.section')}</SectionTitle>
      <Group testId="export-group">
        <div className="px-4 pb-1 pt-3">
          <p className="text-body-sm text-muted">{t('backup.export.desc')}</p>
          <p className="mt-1 text-caption text-fg/80" data-testid="export-privacy">
            {t('backup.export.privacy')}
          </p>
        </div>
        <Toggle
          id="backup-round-coords"
          label={t('backup.export.roundCoords')}
          hint={t('backup.export.roundCoordsHint')}
          checked={roundCoords}
          onChange={setRoundCoords}
        />
        <Toggle
          id="backup-include-blobs"
          label={t('backup.export.includeBlobs')}
          hint={t('backup.export.includeBlobsHint')}
          checked={includeBlobs}
          onChange={setIncludeBlobs}
        />
        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <PillButton
              variant="primary"
              testId="export-json"
              disabled={busy !== null}
              onClick={() => void onExportJson()}
            >
              {t('backup.export.json')}
            </PillButton>
            <PillButton
              variant="secondary"
              testId="export-csv"
              disabled={busy !== null}
              onClick={() => void onExportCsv()}
            >
              {t('backup.export.csv')}
            </PillButton>
          </div>
          <p className="mt-2 text-caption text-muted">{t('backup.export.csvHint')}</p>
          {ios && <p className="mt-1 text-caption text-muted">{t('backup.export.iosHint')}</p>}
          <p className="mt-2 text-caption text-muted tabular-nums" data-testid="backup-last-at">
            {lastAt
              ? t('backup.export.lastAt', { when: formatWhen(lastAt, lang) })
              : t('backup.export.never')}
          </p>
        </div>
      </Group>

      {/* 가져오기 */}
      <SectionTitle>{t('backup.import.section')}</SectionTitle>
      <Group testId="import-group">
        <p className="px-4 pt-3 text-body-sm text-muted">{t('backup.import.desc')}</p>
        <div className="flex min-h-14 items-center gap-3 px-4 py-3">
          <PillButton
            variant="secondary"
            testId="import-choose"
            disabled={busy !== null || reading}
            onClick={() => fileRef.current?.click()}
          >
            {t('backup.import.choose')}
          </PillButton>
          <span
            className="min-w-0 flex-1 truncate text-body-sm text-muted"
            data-testid="import-file-name"
          >
            {reading
              ? t('common.loading')
              : imp
                ? `${imp.fileName} · ${formatBytes(imp.fileSize)}`
                : t('backup.import.noFile')}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            data-testid="import-file"
            onChange={(e) => void onFileChange(e)}
          />
        </div>
      </Group>
      {errorText && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-lg bg-danger-soft p-4 text-body-sm text-danger squircle"
          data-testid="import-error"
        >
          {errorText}
        </div>
      )}
      {imp?.bundle && imp.preview && (
        <div
          className="mx-4 mt-3 overflow-hidden rounded-lg bg-surface squircle [&>*+*]:hairline-t"
          data-testid="import-preview"
        >
          <div className="px-4 py-3">
            <p className="text-body" data-testid="import-counts">
              {t('backup.import.counts', {
                observations: imp.preview.counts.observations,
                bookmarks: imp.preview.counts.bookmarks,
                sites: imp.preview.counts.sites,
                equipment:
                  imp.preview.counts.telescopes +
                  imp.preview.counts.eyepieces +
                  imp.preview.counts.binoculars,
                blobs: imp.preview.counts.blobs,
              })}
            </p>
            <p className="mt-1 text-caption text-muted" data-testid="import-conflicts">
              {imp.preview.conflicts > 0
                ? t('backup.import.conflicts', {
                    n: imp.preview.conflicts,
                    newer: imp.preview.newer,
                  })
                : t('backup.import.noConflicts')}
            </p>
          </div>
          <div>
            <Segmented<ImportPolicy>
              label={t('backup.import.policy')}
              value={policy}
              options={[
                { value: 'newest', label: t('backup.import.policyNewest') },
                { value: 'addAll', label: t('backup.import.policyAddAll') },
              ]}
              onChange={setPolicy}
            />
            <Note className="pb-3">
              {policy === 'newest'
                ? t('backup.import.policyNewestHint')
                : t('backup.import.policyAddAllHint')}
            </Note>
          </div>
          <div className="px-4 py-3">
            <PillButton
              variant="primary"
              testId="import-run"
              disabled={busy !== null}
              onClick={() => void onImport()}
            >
              {t('backup.import.run')}
            </PillButton>
          </div>
        </div>
      )}

      {/* 저장 공간 */}
      <SectionTitle>{t('backup.storage.section')}</SectionTitle>
      <Group testId="storage-group">
        {storage && storage.usage !== undefined && storage.quota !== undefined && (
          <div className="px-4 py-3">
            <p className="text-body tabular-nums" data-testid="storage-usage">
              {t('backup.storage.usage', {
                used: formatBytes(storage.usage),
                quota: formatBytes(storage.quota),
              })}
            </p>
            {usagePct !== null && (
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-surface-3"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(usagePct)}
              >
                <div
                  className="h-full rounded-pill bg-accent"
                  style={{ width: `${Math.max(1, usagePct)}%` }}
                />
              </div>
            )}
          </div>
        )}
        {persisted !== null && (
          <div className="flex min-h-14 items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-body">{t('backup.storage.persist')}</p>
              <p className="mt-0.5 text-caption text-muted">
                {persisted
                  ? t('backup.storage.persistHint')
                  : persistAsked
                    ? t('backup.storage.persistDenied')
                    : t('backup.storage.persistHint')}
              </p>
            </div>
            {persisted ? (
              <span
                className="inline-flex min-h-7 items-center rounded-pill bg-success-soft px-2.5 text-label font-semibold text-success"
                data-testid="storage-persisted"
              >
                ✓ {t('backup.storage.persistOn')}
              </span>
            ) : (
              <PillButton
                variant="secondary"
                size="sm"
                testId="storage-persist"
                onClick={() => void onPersist()}
              >
                {t('backup.storage.persistRequest')}
              </PillButton>
            )}
          </div>
        )}
        <Note className="py-3">
          {ios ? t('backup.storage.iosNote') : t('backup.storage.generalNote')}
        </Note>
      </Group>

      {/* 위험 */}
      <SectionTitle>{t('backup.danger.section')}</SectionTitle>
      <div className="px-4">
        {confirmClear ? (
          <div
            className="rounded-lg bg-surface p-4 shadow-card squircle"
            role="alertdialog"
            aria-labelledby="clear-all-title"
            data-testid="clear-all-confirm-card"
          >
            <p id="clear-all-title" className="text-body font-semibold text-danger">
              {t('backup.danger.confirmTitle')}
            </p>
            <p className="mt-1 text-caption text-muted">{t('backup.danger.confirmHint')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PillButton
                variant="danger"
                testId="clear-all-confirm"
                disabled={busy !== null}
                onClick={() => void onClearConfirm()}
              >
                {t('backup.danger.confirm')}
              </PillButton>
              <PillButton variant="ghost" testId="clear-all-cancel" onClick={onClearCancel}>
                {t('backup.danger.cancel')}
              </PillButton>
            </div>
          </div>
        ) : (
          <PillButton
            variant="danger"
            testId="clear-all"
            disabled={busy !== null}
            onClick={onClearTap}
          >
            {t('backup.danger.clearAll')}
          </PillButton>
        )}
      </div>
    </ScreenFrame>
  );
}
