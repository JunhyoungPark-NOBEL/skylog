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

/** 하단 탭 5개: 하늘 · 검색 · 오늘 밤 · 기록 · 배우기 (마스터 플랜 §4.1) */
export function TabBar({ active, onSelect }: TabBarProps) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label="주 탭"
      data-testid="tab-bar"
      className="safe-bottom flex shrink-0 border-t border-border bg-surface"
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
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]"
            style={{
              minHeight: 'var(--tab-height)',
              color: selected ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            <Icon size={22} />
            <span>{t(`tabs.${route}`)}</span>
          </button>
        );
      })}
    </nav>
  );
}
