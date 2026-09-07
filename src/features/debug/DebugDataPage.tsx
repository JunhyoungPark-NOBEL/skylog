import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadManifest, type DataManifest } from '@/catalog/manifest';
import { ScreenFrame } from '@/features/settings/ScreenFrame';

type State = { status: 'loading' } | { status: 'none' } | { status: 'ok'; manifest: DataManifest };

/**
 * /debug/data — 데이터 팩 점검 표 (task-00 §2).
 * T0a에서는 manifest만 읽어 팩 목록을 보여주고, T0b가 별·별자리·DSO 요약을 채운다.
 */
export function DebugDataPage({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((m) => {
        if (!cancelled) setState(m ? { status: 'ok', manifest: m } : { status: 'none' });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'none' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScreenFrame title={t('debug.title')} onBack={onBack} testId="debug-data">
      {state.status === 'loading' && (
        <p className="px-5 pt-6 text-body-sm text-muted">{t('common.loading')}</p>
      )}
      {state.status === 'none' && (
        <p className="px-5 pt-6 text-body-sm text-muted" data-testid="debug-no-data">
          {t('debug.noData')}
        </p>
      )}
      {state.status === 'ok' && (
        <>
          <div className="mx-4 mt-4 overflow-hidden rounded-lg bg-surface squircle">
            <dl
              className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2 [&>dd+dt]:hairline-t [&>dd+dt+dd]:hairline-t"
              data-testid="debug-summary"
            >
              <dt className="flex min-h-10 items-center text-body-sm text-muted">
                {t('debug.stars')} (≤6.5)
              </dt>
              <dd
                className="flex min-h-10 items-center justify-end text-body-sm tabular-nums"
                data-testid="count-stars"
              >
                {state.manifest.summary?.starsBright ?? '–'}
              </dd>
              <dt className="flex min-h-10 items-center text-body-sm text-muted">
                {t('debug.constellations')}
              </dt>
              <dd
                className="flex min-h-10 items-center justify-end text-body-sm tabular-nums"
                data-testid="count-constellations"
              >
                {state.manifest.summary?.constellations ?? '–'}
              </dd>
              <dt className="flex min-h-10 items-center text-body-sm text-muted">
                {t('debug.dso')}
              </dt>
              <dd
                className="flex min-h-10 items-center justify-end text-body-sm tabular-nums"
                data-testid="count-dso"
              >
                {state.manifest.summary?.dso ?? '–'}
              </dd>
              <dt className="flex min-h-10 items-center text-body-sm text-muted">
                {t('debug.messier')}
              </dt>
              <dd
                className="flex min-h-10 items-center justify-end text-body-sm tabular-nums"
                data-testid="count-messier"
              >
                {state.manifest.summary?.messier ?? '–'}
              </dd>
              <dt className="flex min-h-10 items-center text-body-sm text-muted">
                {t('debug.caldwell')}
              </dt>
              <dd
                className="flex min-h-10 items-center justify-end text-body-sm tabular-nums"
                data-testid="count-caldwell"
              >
                {state.manifest.summary?.caldwell ?? '–'}
              </dd>
            </dl>
          </div>

          <div className="mx-4 mt-3 overflow-x-auto rounded-md bg-surface-2">
            <table className="w-full text-caption tabular-nums">
              <thead className="text-left text-muted">
                <tr>
                  <th className="px-3.5 py-2 font-medium">{t('debug.pack')}</th>
                  <th className="py-2 pr-2 font-medium">{t('debug.version')}</th>
                  <th className="py-2 pr-2 font-medium">{t('debug.records')}</th>
                  <th className="py-2 pr-3.5 font-medium">{t('debug.bytes')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(state.manifest.packs).map(([name, p]) => (
                  <tr key={name} className="[&>td]:hairline-t">
                    <td className="px-3.5 py-2 font-mono text-fg">{name}</td>
                    <td className="py-2 pr-2">{p.version}</td>
                    <td className="py-2 pr-2">{p.records ?? '–'}</td>
                    <td className="py-2 pr-3.5">{(p.bytes / 1024).toFixed(1)} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 pt-3 text-caption text-muted tabular-nums">
            {t('debug.generatedAt')}: {state.manifest.generatedAt}
          </p>
        </>
      )}
    </ScreenFrame>
  );
}
