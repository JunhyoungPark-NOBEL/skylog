import { useTranslation } from 'react-i18next';

/**
 * 하늘 뷰 자리. Task 1에서 Three.js 렌더러가 이 캔버스를 차지한다.
 * 지금은 검은 캔버스 + 안내 문구만.
 */
export function SkyView() {
  const { t } = useTranslation();
  return (
    <div className="relative h-full w-full bg-bg" data-testid="sky-view">
      <canvas className="block h-full w-full" aria-hidden="true" />
      <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-muted">
        {t('sky.placeholder')}
      </p>
    </div>
  );
}
