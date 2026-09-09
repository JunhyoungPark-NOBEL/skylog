import { useTranslation } from 'react-i18next';
import dataLicenses from '../../../docs/DATA-LICENSES.md?raw';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { OBJECT_PHOTOS } from '@/catalog/objectPhotos';
import { PhotoCredit } from '@/features/object/ObjectPhoto';
import { useSettingsStore } from '@/state/settingsStore';

/**
 * 정보/라이선스 화면 골격. docs/DATA-LICENSES.md를 그대로 렌더한다(T8에서 다듬음).
 * 데이터 팩(CC BY-SA 4.0)·Open-Meteo(CC BY 4.0)·7Timer 고지가 여기 포함된다.
 */
export function AboutScreen({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  const lang = useSettingsStore((s) => s.lang);
  return (
    <ScreenFrame title={t('about.title')} onBack={onBack} testId="about-screen">
      <div className="mx-4 mt-4 overflow-hidden rounded-lg bg-surface squircle [&>*+*]:hairline-t">
        <p className="px-4 py-3 text-body font-semibold">{t('app.name')}</p>
        <p className="px-4 py-3 text-body-sm">{t('about.codeLicense')}</p>
        <p className="px-4 py-3 text-body-sm">{t('about.dataLicense')}</p>
        <div className="flex flex-wrap gap-3 px-4 py-3 text-body-sm text-accent">
          <a
            className="min-h-11 py-2 underline"
            href="https://junhyoungpark-nobel.github.io/skylog/privacy.html"
            target="_blank"
            rel="noreferrer"
          >
            {t('mobile.privacy')}
          </a>
          <a
            className="min-h-11 py-2 underline"
            href="https://junhyoungpark-nobel.github.io/skylog/support.html"
            target="_blank"
            rel="noreferrer"
          >
            {t('mobile.support')}
          </a>
        </div>
        <p className="px-4 py-3 text-body-sm leading-6">{t('mobile.localData')}</p>
      </div>

      <section className="mx-4 mt-6 rounded-lg bg-surface p-4" data-testid="object-photo-licenses">
        <h2 className="text-body font-semibold">{t('objectPhoto.sources')}</h2>
        <p className="mt-2 text-body-sm leading-relaxed text-muted">
          {t('objectPhoto.licenseNote')}
        </p>
        <ul className="mt-3 space-y-4">
          {OBJECT_PHOTOS.map((photo) => (
            <li key={photo.objectId}>
              <h3 className="text-body-sm font-medium">
                {photo.title[lang]} · {photo.objectId}
              </h3>
              <PhotoCredit photo={photo} className="mt-1" />
              <p className="mt-1 text-caption leading-relaxed text-muted">
                {photo.modifications[lang]}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <h2 className="px-5 pb-2 pt-6 text-body-sm font-semibold text-muted">{t('about.sources')}</h2>
      <div className="mx-4 rounded-lg bg-surface p-1.5 squircle">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-surface-2/70 px-3.5 py-3 font-mono text-caption leading-relaxed text-fg">
          {dataLicenses}
        </pre>
      </div>
    </ScreenFrame>
  );
}
