import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { TAB_ROUTES, type Route, type TabRoute } from '@/app/router';
import { IconLearn, IconLog, IconSearch, IconSky, IconTonight } from '@/ui/icons';

const ICONS: Record<TabRoute, ComponentType<{ size?: number }>> = {
  sky: IconSky,
  search: IconSearch,
  tonight: IconTonight,
  log: IconLog,
  learn: IconLearn,
};

interface TabBarProps {
  active: Route;
  onSelect(route: TabRoute): void;
}

/**
 * 하단 탭 5개: 하늘 · 검색 · 오늘 밤 · 기록 · 배우기 (마스터 플랜 §4.1).
 * 떠 있는 유리 pill(D-021) — 하늘·리스트가 아래로 이어지므로 콘텐츠 화면은 `pb-tab`으로 여백을 확보한다.
 */
export function TabBar({ active, onSelect }: TabBarProps) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('tabs.navigation')}
      data-testid="tab-bar"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-inset)+env(safe-area-inset-bottom))] z-20 flex justify-center px-[12px]"
    >
      <div
        role="tablist"
        className={`${active === 'sky' ? 'glass-hud' : 'glass-sm'} pointer-events-auto isolate flex h-[var(--tab-height)] w-full max-w-md items-stretch rounded-pill p-[4px] shadow-card`}
      >
        {TAB_ROUTES.map((route) => {
          const Icon = ICONS[route];
          const selected = active === route;
          return (
            <button
              key={route}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={t(`tabs.${route}`)}
              title={t(`tabs.${route}`)}
              data-testid={`tab-${route}`}
              onClick={() => onSelect(route)}
              className="group relative flex min-h-[44px] min-w-0 basis-1/5 flex-col items-center justify-center rounded-pill text-[0.6875rem] leading-[1rem] text-fg/80 transition-colors duration-150 ease-standard aria-selected:font-semibold aria-selected:text-accent"
            >
              {/* 활성 표시를 같은 자리에 유지하고 불투명도만 짧게 전환한다. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-1 inset-y-0.5 -z-10 rounded-pill bg-accent-soft opacity-0 transition-opacity duration-150 ease-standard group-aria-selected:opacity-100"
              />
              <span className="flex h-[20px] shrink-0 items-center justify-center">
                <Icon size={20} />
              </span>
              <span className="max-w-full truncate px-[2px]">{t(`tabs.${route}`)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
