import { useTranslation } from 'react-i18next';
import { LANGS, type Lang } from '@/app/i18n';
import { navigate } from '@/app/router';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { isWakeLockSupported } from '@/sensors/wakeLock';
import { useSettingsStore } from '@/state/settingsStore';
import { IconChevron } from '@/ui/icons';
import { Segmented } from '@/ui/Segmented';
import { Toggle } from '@/ui/Toggle';

const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' };

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </h2>
  );
}

function LinkRow({ label, onClick, testId }: { label: string; onClick(): void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex min-h-14 w-full items-center px-4 text-left text-[15px]"
    >
      <span className="flex-1">{label}</span>
      <IconChevron size={18} />
    </button>
  );
}

export function SettingsScreen({ onBack }: { onBack(): void }) {
  const { t } = useTranslation();
  const s = useSettingsStore();
  const wakeLockOk = isWakeLockSupported();

  return (
    <ScreenFrame title={t('settings.title')} onBack={onBack} testId="settings-screen">
      <SectionTitle>{t('settings.display')}</SectionTitle>
      <Toggle
        id="setting-night"
        label={t('settings.nightMode')}
        hint={t('settings.nightModeHint')}
        checked={s.theme === 'night'}
        onChange={(on) => s.setTheme(on ? 'night' : 'dark')}
      />
      <Segmented
        label={t('settings.language')}
        value={s.lang}
        options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
        onChange={(l) => s.setLang(l)}
      />
      <Toggle
        id="setting-keep-awake"
        label={t('settings.keepAwake')}
        hint={wakeLockOk ? t('settings.keepAwakeHint') : t('common.unsupported')}
        checked={s.keepAwake}
        disabled={!wakeLockOk}
        onChange={(on) => s.setKeepAwake(on)}
      />

      <SectionTitle>{t('settings.developer')}</SectionTitle>
      <Toggle
        id="setting-debug-hud"
        label={t('settings.debugHud')}
        hint={t('settings.debugHudHint')}
        checked={s.debugHud}
        onChange={(on) => s.setDebugHud(on)}
      />
      <LinkRow
        label={t('settings.debugData')}
        onClick={() => navigate('debug/data')}
        testId="link-debug-data"
      />
      <LinkRow label={t('settings.about')} onClick={() => navigate('about')} testId="link-about" />

      <p className="px-4 py-6 text-xs text-muted">
        {t('settings.version')} {__APP_VERSION__}
      </p>
    </ScreenFrame>
  );
}
