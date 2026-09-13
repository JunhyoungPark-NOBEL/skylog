import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { TAB_ROUTES, type Route, type TabRoute } from '@/app/router';
import { IconChevron, IconLearn, IconLog, IconSearch, IconSky, IconTonight } from '@/ui/icons';

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
 * 하늘에서는 왼쪽 접이식 메뉴, 콘텐츠 화면에서는 하단 탭 5개.
 * 떠 있는 유리 pill(D-021) — 하늘·리스트가 아래로 이어지므로 콘텐츠 화면은 `pb-tab`으로 여백을 확보한다.
 */
export function TabBar({ active, onSelect }: TabBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const compact = active === 'sky';
  useEffect(() => {
    if (!open || !compact) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, compact]);
  if (compact)
    return (
      <nav
        ref={root}
        aria-label={t('tabs.navigation')}
        data-testid="sky-navigation"
        className="fixed left-[12px] top-[calc(env(safe-area-inset-top)+60px)] z-20"
      >
        <button
          type="button"
          data-testid="nav-toggle"
          aria-expanded={open}
          aria-controls="sky-navigation-links"
          aria-label={t(open ? 'compactSky.closeMenu' : 'compactSky.openMenu')}
          onClick={() => setOpen(!open)}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full glass-hud"
        >
          <IconChevron
            size={21}
            className={`transition-transform duration-150 motion-reduce:transition-none ${open ? '-rotate-90' : 'rotate-90'}`}
          />
        </button>
        <div
          id="sky-navigation-links"
          hidden={!open}
          data-testid="tab-bar"
          role="tablist"
          aria-orientation="vertical"
          aria-label={t('tabs.navigation')}
          onKeyDown={(e) => {
            const buttons = [
              ...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
            ];
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              e.key === 'ArrowDown'
                ? (index + 1) % buttons.length
                : e.key === 'ArrowUp'
                  ? (index - 1 + buttons.length) % buttons.length
                  : e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? buttons.length - 1
                      : -1;
            if (next >= 0) {
              e.preventDefault();
              buttons[next]?.focus();
            }
          }}
          className="mt-2 max-h-[calc(100dvh-120px-env(safe-area-inset-top))] w-40 max-w-[75vw] overflow-y-auto origin-top rounded-2xl border border-hairline bg-surface p-1 shadow-float"
        >
          {TAB_ROUTES.map((route) => {
            const Icon = ICONS[route];
            return (
              <button
                type="button"
                role="tab"
                key={route}
                data-testid={`tab-${route}`}
                aria-current={active === route ? 'page' : undefined}
                aria-selected={active === route}
                onClick={() => {
                  setOpen(false);
                  onSelect(route);
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-body-sm aria-selected:bg-accent-soft aria-selected:text-accent"
              >
                <Icon size={19} />
                <span>{t(`tabs.${route}`)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  return (
    <nav
      aria-label={t('tabs.navigation')}
      data-testid="tab-bar"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-inset)+env(safe-area-inset-bottom))] z-20 flex justify-center px-[12px]"
    >
      <div
        role="tablist"
        className="glass-sm pointer-events-auto isolate flex h-[var(--tab-height)] w-full max-w-md items-stretch rounded-pill p-[4px] shadow-card"
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
