import type { ReactNode } from 'react';
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

/** 섹션 헤더 — 문장 케이스, uppercase 없음 */
function SectionTitle({ children }: { children: string }) {
  return <h2 className="px-5 pb-2 pt-6 text-body-sm font-semibold text-muted">{children}</h2>;
}

/** 인셋 그룹 — 행 사이는 헤어라인(box-shadow)으로만 나눈다 */
function Group({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 overflow-hidden rounded-lg bg-surface squircle [&>*+*]:hairline-t">
      {children}
    </div>
  );
}

function LinkRow({ label, onClick, testId }: { label: string; onClick(): void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 active:bg-surface-2"
    >
      <span className="min-w-0 flex-1 truncate text-body">{label}</span>
      <IconChevron size={18} className="shrink-0 text-muted-2" />
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
      <Group>
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
      </Group>

      <SectionTitle>{t('settings.observing')}</SectionTitle>
      <Group>
        <LinkRow label={t('sites.title')} onClick={() => navigate('sites')} testId="link-sites" />
      </Group>

      <SectionTitle>{t('settings.developer')}</SectionTitle>
      <Group>
        <LinkRow
          label={t('sensor.debug.title')}
          onClick={() => navigate('debug/sensors')}
          testId="link-debug-sensors"
        />
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
        <LinkRow
          label={t('settings.about')}
          onClick={() => navigate('about')}
          testId="link-about"
        />
      </Group>

      <p className="px-5 pt-6 text-caption text-muted tabular-nums">
        {t('settings.version')} {__APP_VERSION__}
      </p>
    </ScreenFrame>
  );
}
