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
      aria-label="주 탭"
      data-testid="tab-bar"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-inset)+env(safe-area-inset-bottom))] z-20 flex justify-center px-4"
    >
      <div
        role="tablist"
        className="glass squircle pointer-events-auto isolate flex h-[var(--tab-height)] w-full max-w-md items-stretch rounded-pill p-1.5 shadow-float"
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
              data-testid={`tab-${route}`}
              onClick={() => onSelect(route)}
              className="group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-pill text-label text-fg/70 transition-colors duration-150 ease-standard aria-selected:text-accent"
            >
              {/* 활성 인디케이터: 항상 렌더하고 transform·opacity만 스프링으로 전환 */}
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-1 bottom-1 -z-10 scale-75 rounded-pill bg-accent-soft opacity-0 transition-[transform,opacity] duration-[350ms] ease-spring-fast group-aria-selected:scale-100 group-aria-selected:opacity-100"
              />
              <span className="flex items-center justify-center transition-[filter] duration-150 ease-standard group-aria-selected:drop-shadow-[0_0_6px_var(--accent-glow)]">
                <Icon size={22} />
              </span>
              <span>{t(`tabs.${route}`)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
