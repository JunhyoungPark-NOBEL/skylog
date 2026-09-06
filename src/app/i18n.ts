import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/en.json';
import ko from '@/i18n/ko.json';

export type Lang = 'ko' | 'en';
export const LANGS: readonly Lang[] = ['ko', 'en'];

let initialized = false;

/** i18next 초기화. 리소스는 번들에 포함(오프라인). 기본 언어는 한국어. */
export async function initI18n(lang: Lang = 'ko'): Promise<typeof i18next> {
  if (initialized) {
    if (i18next.language !== lang) await i18next.changeLanguage(lang);
    return i18next;
  }
  await i18next.use(initReactI18next).init({
    resources: { ko: { translation: ko }, en: { translation: en } },
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
