import { useTranslation } from 'react-i18next';

interface PlaceholderProps {
  titleKey: string;
  task: number;
  children?: React.ReactNode;
}

/** 아직 구현되지 않은 탭의 자리표시자. */
export function Placeholder({ titleKey, task, children }: PlaceholderProps) {
  const { t } = useTranslation();
  return (
    <section className="flex h-full flex-col px-4 pt-4">
      <h1 className="text-lg font-semibold">{t(titleKey)}</h1>
      {children}
      <p className="mt-3 text-sm text-muted">{t('common.comingSoon', { task })}</p>
    </section>
  );
}
