import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  canAccessPlus,
  purchasePlus,
  restorePlus,
  refreshEntitlements,
  useEntitlements,
} from '@/entitlements';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { returnToLearning } from './learnNavigation';

export function PlusNotice() {
  const { t } = useTranslation();
  const s = useEntitlements();
  return (
    <button
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-left text-caption text-accent"
      onClick={() => {
        window.location.hash = '#/plus';
      }}
      data-testid="plus-notice"
    >
      <span className="font-semibold">Skyard Plus</span>
      <span>
        {t(
          s.mode === 'preview' ? 'plus.previewShort' : s.hasPlus ? 'plus.active' : 'plus.discover',
        )}{' '}
        →
      </span>
    </button>
  );
}
export function PlusGate({ children }: { children: ReactNode }) {
  const s = useEntitlements();
  const { t } = useTranslation();
  if (canAccessPlus(s)) return children;
  return s.status === 'loading' ? (
    <p role="status" className="p-5">
      {t('common.loading')}
    </p>
  ) : (
    <PlusOffer />
  );
}
export function PlusOffer() {
  const { t } = useTranslation();
  const s = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const lock = useRef(false);
  const run = async (restore: boolean) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setResult(null);
    try {
      const r = await (restore ? restorePlus() : purchasePlus());
      setResult(r.status);
    } catch {
      setResult('error');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      className="space-y-5 break-keep rounded-3xl border border-hairline bg-surface p-5"
      data-testid="plus-offer"
    >
      <div>
        <p className="text-caption font-semibold text-accent">Skyard Plus</p>
        <h2 className="mt-2 text-headline">{t('plus.title')}</h2>
        <p className="mt-3 text-body-sm leading-6 text-muted">{t('plus.intro')}</p>
      </div>
      <ul className="space-y-3 text-body-sm leading-6">
        {['quiz', 'physics', 'courses', 'records'].map((k) => (
          <li key={k}>✦ {t('plus.features.' + k)}</li>
        ))}
      </ul>
      <div className="rounded-2xl bg-surface-2 p-4">
        <p className="text-title">
          {s.product && s.mode === 'live'
            ? t('plus.price', { price: s.product.formattedPrice })
            : t('plus.plannedPrice')}
        </p>
        <p className="mt-2 text-caption leading-5 text-muted">{t('plus.noAds')}</p>
      </div>
      {s.mode === 'preview' ? (
        <p className="text-body-sm leading-6 text-accent">{t('plus.preview')}</p>
      ) : s.hasPlus ? (
        <p role="status" className="text-accent">
          {t(s.source === 'grant' ? 'plus.granted' : 'plus.active')}
        </p>
      ) : (
        <>
          <p className="text-body-sm leading-6 text-muted">
            {t('plus.availability.' + s.availability)}
          </p>
          {s.availability === 'sign-in-required' && (
            <button
              className="min-h-12 w-full rounded-pill bg-accent px-5 text-accent-fg"
              onClick={() => {
                window.location.hash = '#/account';
              }}
            >
              {t('plus.signIn')}
            </button>
          )}
          {s.availability === 'android-play' && s.product && (
            <button
              disabled={busy}
              className="min-h-12 w-full rounded-pill bg-accent px-5 text-accent-fg disabled:opacity-50"
              onClick={() => void run(false)}
            >
              {t(busy ? 'plus.processing' : 'plus.buy', { price: s.product.formattedPrice })}
            </button>
          )}
        </>
      )}
      <p className="text-caption leading-5 text-muted">{t('plus.accountNote')}</p>
      <div className="flex flex-wrap gap-3">
        {s.restoreAvailable && (
          <button
            disabled={busy}
            className="min-h-11 rounded-pill border border-hairline px-4"
            onClick={() => void run(true)}
          >
            {t('plus.restore')}
          </button>
        )}
        <button
          disabled={busy}
          className="min-h-11 rounded-pill border border-hairline px-4"
          onClick={() => {
            setResult(null);
            void refreshEntitlements().catch(() => setResult('error'));
          }}
        >
          {t('plus.refresh')}
        </button>
      </div>
      {result && (
        <p role="status" className="text-body-sm leading-6">
          {t('plus.result.' + result)}
        </p>
      )}
      {s.error && !result && (
        <p role="status" className="text-body-sm text-muted">
          {t('plus.checkFailed')}
        </p>
      )}
    </section>
  );
}
export default function PlusScreen() {
  return (
    <ScreenFrame title="Skyard Plus" onBack={returnToLearning} testId="plus-screen">
      <div className="mx-auto max-w-2xl p-4">
        <PlusOffer />
      </div>
    </ScreenFrame>
  );
}
