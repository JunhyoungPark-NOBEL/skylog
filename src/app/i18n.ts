import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/en.json';
import ko from '@/i18n/ko.json';

export type Lang = 'ko' | 'en';
export const LANGS: readonly Lang[] = ['ko', 'en'];

const partials = import.meta.glob<Record<string, unknown>>('../i18n/partials/*.json', {
  eager: true,
  import: 'default',
});
function merge(
  base: Record<string, unknown>,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const old = out[key];
    out[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      old &&
      typeof old === 'object' &&
      !Array.isArray(old)
        ? merge(old as Record<string, unknown>, value as Record<string, unknown>)
        : value;
  }
  return out;
}
const resource = (lang: Lang, base: Record<string, unknown>) =>
  Object.entries(partials)
    .filter(([file]) => file.endsWith('.' + lang + '.json'))
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((result, [, value]) => merge(result, value), base);
let initialized = false;

/** i18next 초기화. 리소스는 번들에 포함(오프라인). 기본 언어는 한국어. */
export async function initI18n(lang: Lang = 'ko'): Promise<typeof i18next> {
  if (initialized) {
    if (i18next.language !== lang) await i18next.changeLanguage(lang);
    return i18next;
  }
  await i18next.use(initReactI18next).init({
    resources: { ko: { translation: resource('ko', ko) }, en: { translation: resource('en', en) } },
    lng: lang,
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  initialized = true;
  return i18next;
}

export async function setLanguage(lang: Lang): Promise<void> {
  if (!initialized) {
    await initI18n(lang);
    return;
  }
  await i18next.changeLanguage(lang);
  if (globalThis.document) document.documentElement.lang = lang;
}

export { i18next };
