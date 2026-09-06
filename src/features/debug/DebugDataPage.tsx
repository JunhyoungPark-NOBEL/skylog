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
      <div className="p-4 text-sm">
        {state.status === 'loading' && <p className="text-muted">{t('common.loading')}</p>}
        {state.status === 'none' && (
          <p className="text-muted" data-testid="debug-no-data">
            {t('debug.noData')}
          </p>
        )}
        {state.status === 'ok' && (
          <>
            <dl className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1" data-testid="debug-summary">
              <dt className="text-muted">{t('debug.stars')} (≤6.5)</dt>
              <dd data-testid="count-stars">{state.manifest.summary?.starsBright ?? '–'}</dd>
              <dt className="text-muted">{t('debug.constellations')}</dt>
              <dd data-testid="count-constellations">
                {state.manifest.summary?.constellations ?? '–'}
              </dd>
              <dt className="text-muted">{t('debug.dso')}</dt>
              <dd data-testid="count-dso">{state.manifest.summary?.dso ?? '–'}</dd>
              <dt className="text-muted">{t('debug.messier')}</dt>
              <dd data-testid="count-messier">{state.manifest.summary?.messier ?? '–'}</dd>
              <dt className="text-muted">{t('debug.caldwell')}</dt>
              <dd data-testid="count-caldwell">{state.manifest.summary?.caldwell ?? '–'}</dd>
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-1 pr-2">{t('debug.pack')}</th>
                    <th className="py-1 pr-2">{t('debug.version')}</th>
                    <th className="py-1 pr-2">{t('debug.records')}</th>
                    <th className="py-1">{t('debug.bytes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(state.manifest.packs).map(([name, p]) => (
                    <tr key={name} className="border-t border-border">
                      <td className="py-1 pr-2 font-mono">{name}</td>
                      <td className="py-1 pr-2">{p.version}</td>
                      <td className="py-1 pr-2">{p.records ?? '–'}</td>
                      <td className="py-1">{(p.bytes / 1024).toFixed(1)} KB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              {t('debug.generatedAt')}: {state.manifest.generatedAt}
            </p>
          </>
        )}
      </div>
    </ScreenFrame>
  );
}
