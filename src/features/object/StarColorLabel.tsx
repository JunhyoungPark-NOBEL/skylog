import { useTranslation } from 'react-i18next';
import { STAR_COLOR_CSS, type StarColor } from '@/catalog/starColor';
import { useSettingsStore } from '@/state/settingsStore';

export function StarColorLabel({ color }: { color: StarColor }) {
  const { t } = useTranslation();
  const night = useSettingsStore((s) => s.theme === 'night');
  return (
    <span className="inline-flex items-center gap-2" data-testid="star-color">
      {color !== 'unknown' && (
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: night ? 'var(--accent)' : STAR_COLOR_CSS[color] }}
        />
      )}{' '}
      {t(`field.colors.${color}`)}
    </span>
  );
}
