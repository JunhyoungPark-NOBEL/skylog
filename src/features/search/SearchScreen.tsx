import { useTranslation } from 'react-i18next';
import { Placeholder } from '@/features/Placeholder';

export function SearchScreen() {
  const { t } = useTranslation();
  return (
    <Placeholder titleKey="search.title" task={3}>
      <input
        type="search"
        placeholder={t('search.placeholder')}
        disabled
        className="mt-3 min-h-11 w-full rounded-full border border-border bg-surface px-4 text-fg placeholder:text-muted"
      />
    </Placeholder>
  );
}
