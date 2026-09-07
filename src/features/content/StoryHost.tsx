import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadCatalog, type Catalog } from '@/catalog/catalog';
import { loadContentEntry } from '@/content/loader';
import type { ContentEntry } from '@/content/schema';
import { StoryView } from '@/features/content/StoryView';
import { ScreenFrame } from '@/features/settings/ScreenFrame';
import { useContentUiStore } from '@/state/contentUiStore';
import { useSettingsStore } from '@/state/settingsStore';

/**
 * 스토리 전체 화면 호스트(T6): App에 한 번 마운트. `openStory(id)`로 열린다(오늘의 천체·시트 "전체 화면").
 * 상세 시트(z-30)·기록 폼(z-40)보다 위에 놓이지 않도록 z-30 — 시트에서 열면 시트를 닫고 연다.
 */
export function StoryHost() {
  const { t } = useTranslation();
  const id = useContentUiStore((s) => s.storyId);
  const close = useContentUiStore((s) => s.closeStory);
  const lang = useSettingsStore((s) => s.lang);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [entry, setEntry] = useState<{ id: string; value: ContentEntry | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    void loadCatalog().then((c) => {
      if (alive) setCat(c);
    });
    void loadContentEntry(id).then((e) => {
      if (alive) setEntry({ id, value: e });
    });
    return () => {
      alive = false;
    };
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, close]);
  if (!id) return null;
  const loaded = entry && entry.id === id ? entry.value : undefined;
  return (
    <div className="fixed inset-0 z-30 bg-bg text-fg" data-testid="story-host">
      <ScreenFrame
        title={(lang === 'en' ? loaded?.title.en : loaded?.title.ko) ?? t('content.title')}
        onBack={close}
        testId="story-screen"
      >
        <div className="px-4 pt-2">
          {loaded === undefined && (
            <p className="py-6 text-body-sm text-muted">{t('common.loading')}</p>
          )}
          {loaded === null && <p className="py-6 text-body-sm text-muted">{t('content.none')}</p>}
          {loaded && (
            <StoryView
              key={loaded.id}
              entry={loaded}
              cat={cat}
              lang={lang}
              onBeforeShowInSky={close}
            />
          )}
        </div>
      </ScreenFrame>
    </div>
  );
}
