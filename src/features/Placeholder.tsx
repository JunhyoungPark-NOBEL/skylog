import { useTranslation } from 'react-i18next';

interface PlaceholderProps {
  titleKey: string;
  task: number;
  children?: React.ReactNode;
}

/** 아직 구현되지 않은 탭의 자리표시자. 상·하 여백은 App의 TabScreen 래퍼가 잡는다. */
export function Placeholder({ titleKey, task, children }: PlaceholderProps) {
  const { t } = useTranslation();
  return (
    <section className="flex min-h-full flex-col px-5">
      <h1 className="text-headline">{t(titleKey)}</h1>
      {children}
      <p className="mt-2 text-body text-muted">{t('common.comingSoon', { task })}</p>
    </section>
  );
}
