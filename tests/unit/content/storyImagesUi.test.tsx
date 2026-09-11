import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Catalog } from '@/catalog/catalog';
import type * as CatalogModule from '@/catalog/catalog';
import { loadCatalog } from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { getObjectPhoto } from '@/catalog/objectPhotos';
import type { ObservingNight } from '@/astro/night';
import { loadContentIndex } from '@/content/loader';
import type { ContentEntry, ContentIndex } from '@/content/schema';
import { pickTodayObject } from '@/content/today';
import type { LearningState } from '@/learn/runtime';
import { StoryImage, StoryThumbnail } from '@/features/content/StoryThumbnail';
import { StoryView } from '@/features/content/StoryView';
import { TodayCard } from '@/features/content/TodayCard';
import { StoriesScreen } from '@/features/learn/StoriesScreen';
import { useSettingsStore } from '@/state/settingsStore';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/tonight/useNight', () => ({ useObservingNight: () => null }));
vi.mock('@/features/sky/skyApi', () => ({ getSkyScene: () => null, flyToObject: vi.fn() }));
vi.mock('@/catalog/catalog', async () => ({
  ...(await vi.importActual<typeof CatalogModule>('@/catalog/catalog')),
  loadCatalog: vi.fn(),
}));
vi.mock('@/content/loader', () => ({ loadContentIndex: vi.fn() }));
vi.mock('@/content/today', () => ({ maxAltitudeInWindow: () => 60, pickTodayObject: vi.fn() }));
vi.mock('@/db/repos/progress', () => ({
  getProgress: async () => null,
  setProgress: async () => undefined,
  listProgress: async () => new Map(),
}));

const read = <T,>(path: string): T => JSON.parse(readFileSync('public/data/' + path, 'utf8')) as T;
const stars = read<Catalog['stars']>('stars-bright.v1.json');
const dso = read<Catalog['dso']>('dso.v1.json');
const bodies = read<Catalog['bodies']>('bodies.v1.json');
const cat: Catalog = {
  stars,
  dso,
  bodies,
  starById: new Map(stars.map((s) => [s.id, s])),
  dsoById: new Map(dso.map((d) => [d.id, d])),
  bodyById: new Map(bodies.map((b) => [b.id, b])),
  starVectors: new Float32Array(),
  dsoVectors: new Float32Array(),
  constellations: read('constellations.v1.json'),
};
const index = read<ContentIndex>('content/v1/index.json');
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(loadCatalog).mockResolvedValue(cat);
  vi.mocked(loadContentIndex).mockResolvedValue(index);
  useSettingsStore.setState({ lang: 'ko', theme: 'night' });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('목록은 실제 사진·별자리 도해·별 위치 도해와 기존 읽음 표시를 함께 보여 준다', async () => {
  // 이 화면에서 읽는 두 값만 제공하는 명시적인 테스트 대역이다.
  const value = {
    cat,
    snap: { readSet: new Set<ObjectId>(['planet:saturn']) },
  } as unknown as LearningState;
  await act(async () => root.render(<StoriesScreen value={value} />));
  const row = (id: ObjectId) => host.querySelector(`[data-testid="story-${id}"]`)!;
  expect(row('planet:saturn').querySelector('img')!.dataset.objectId).toBe('planet:saturn');
  expect(row('planet:saturn').querySelector('[data-testid="story-image-read"]')).not.toBeNull();
  expect(row('planet:saturn').textContent).toContain('journey.read');
  expect(row('const:Ori').querySelector('[data-testid="story-sky-chart"]')).not.toBeNull();
  const lines = row('const:Ori').querySelector('[data-testid="story-chart-lines"]')!;
  expect(lines.getAttribute('stroke-width')).toBe('2.2');
  expect(lines.getAttribute('stroke-opacity')).toBe('.94');
  expect(lines.getAttribute('stroke-linecap')).toBe('round');
  expect(row('star:HIP91262').querySelector('[data-testid="story-chart-target"]')).not.toBeNull();
  expect(row('star:HIP91262').querySelector('img')).toBeNull();
  expect(
    host.querySelector('[data-testid="photo-credit"], [data-testid="story-chart-credit"]'),
  ).toBeNull();
});

it('썸네일 실패에도 읽음 배지를 보존하고 다른 대상은 원래 사진으로 표시한다', async () => {
  await act(async () => root.render(<StoryThumbnail id="planet:saturn" cat={cat} read />));
  expect(host.querySelector('img')!.classList.contains('object-photo-protected')).toBe(true);
  await act(async () => host.querySelector('img')!.dispatchEvent(new Event('error')));
  expect(host.querySelector('[data-testid="story-image-fallback"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="story-image-read"]')).not.toBeNull();
  await act(async () => root.render(<StoryThumbnail id="planet:jupiter" cat={cat} />));
  expect(host.querySelector('img')!.dataset.objectId).toBe('planet:jupiter');
});

it('도해는 화면 가까이에서 한 번 렌더링하며 관찰자를 정리한다', async () => {
  let notify!: IntersectionObserverCallback;
  const disconnect = vi.fn();
  class Observer {
    constructor(callback: IntersectionObserverCallback) {
      notify = callback;
    }
    observe = vi.fn();
    disconnect = disconnect;
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  await act(async () => root.render(<StoryThumbnail id="const:Ori" cat={cat} />));
  expect(host.querySelector('[data-testid="story-sky-chart"]')).toBeNull();
  await act(async () =>
    notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver),
  );
  expect(host.querySelector('[data-testid="story-sky-chart"]')).not.toBeNull();
  expect(disconnect).toHaveBeenCalled();
});

it('이야기 상세의 실제 사진에 전체 출처·야간 원래 색 선택이 있고 도해는 정직한 설명과 출처를 가진다', async () => {
  await act(async () => root.render(<StoryImage id="planet:saturn" cat={cat} />));
  expect(host.querySelector('[data-testid="photo-credit"]')!.textContent).toContain(
    getObjectPhoto('planet:saturn')!.credit,
  );
  expect(
    host
      .querySelector('[data-testid="object-photo-hero"]')!
      .classList.contains('object-photo-protected'),
  ).toBe(true);
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-testid="photo-original"]')!.click(),
  );
  expect(
    host
      .querySelector('[data-testid="object-photo-hero"]')!
      .classList.contains('object-photo-original'),
  ).toBe(true);
  await act(async () => root.render(<StoryImage id="dso:NGC869" cat={cat} />));
  expect(host.textContent).toContain('storyImages.sharedNotice');
  expect(host.querySelector<HTMLImageElement>('img')!.dataset.objectId).toBe('dso:C14');
  await act(async () => root.render(<StoryImage id="const:Ori" cat={cat} />));
  expect(host.querySelector('img')).toBeNull();
  expect(host.textContent).toContain('storyImages.constellationNotice');
  expect(host.querySelector('[data-testid="story-chart-credit"]')!.textContent).toContain(
    'CC BY-SA 4.0',
  );
  expect(host.querySelector('[data-testid="story-sky-chart"]')!.classList.contains('text-fg')).toBe(
    true,
  );
  expect(
    host.querySelector('[data-testid="story-chart-lines"]')!.getAttribute('stroke-width'),
  ).toBe('1.05');
  expect(host.querySelector('[data-testid="story-chart-lines"]')!.getAttribute('stroke')).toBe(
    'currentColor',
  );
});

it('태양 안전 경고를 큰 사진보다 앞에 유지한다', async () => {
  const entry = read<ContentEntry>('content/v1/' + index.entries.find((e) => e.id === 'sun')!.file);
  await act(async () => root.render(<StoryView entry={entry} cat={cat} lang="ko" />));
  const safety = host.querySelector('[data-testid="story-safety"]')!;
  const image = host.querySelector('[data-testid="story-image"]')!;
  expect(safety).not.toBeNull();
  expect(safety.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  expect(host.querySelector('[data-testid="story-mark-read"]')).not.toBeNull();
});

it('오늘의 이야기에서도 선정된 대상의 사진을 표시하며 읽기·하늘 버튼을 유지한다', async () => {
  vi.mocked(pickTodayObject).mockReturnValue({ id: 'planet:saturn', unread: true, altMaxDeg: 60 });
  const now = new Date('2026-09-11T12:00:00Z');
  const night = {
    key: 'story-image-test',
    darkSpan: { from: now, to: new Date(now.getTime() + 3600000) },
  } as ObservingNight;
  await act(async () => root.render(<TodayCard night={night} now={now} />));
  await act(async () => new Promise<void>((resolve) => window.setTimeout(resolve, 10)));
  expect(
    host.querySelector<HTMLImageElement>('[data-testid="today-card"] img')!.dataset.objectId,
  ).toBe('planet:saturn');
  expect(host.querySelector('[data-testid="today-read"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="today-sky"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="photo-credit"]')).toBeNull();
});
