import { useTranslation } from 'react-i18next';
import dataLicenses from '../../../docs/DATA-LICENSES.md?raw';
import { ScreenFrame } from '@/features/settings/ScreenFrame';

/**
 * 정보/라이선스 화면 골격. docs/DATA-LICENSES.md를 그대로 렌더한다(T8에서 다듬음).
 * 데이터 팩(CC BY-SA 4.0)·Open-Meteo(CC BY 4.0)·7Timer 고지가 여기 포함된다.
 */
export function AboutScreen({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  return (
    <ScreenFrame title={t('about.title')} onBack={onBack} testId="about-screen">
      <div className="space-y-3 p-4 text-sm">
        <p className="font-semibold">{t('app.name')}</p>
        <p>{t('about.codeLicense')}</p>
        <p>{t('about.dataLicense')}</p>
        <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {t('about.sources')}
        </h2>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-surface p-3 text-xs leading-relaxed text-fg">
          {dataLicenses}
        </pre>
      </div>
    </ScreenFrame>
  );
}
