import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ObjectPhotoCard, PhotoCredit, PhotoThumbnail } from '@/features/object/ObjectPhoto';
import { getObjectPhoto } from '@/catalog/objectPhotos';
import { useSettingsStore } from '@/state/settingsStore';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  useSettingsStore.setState({ theme: 'night', lang: 'ko' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it('사진 오류·밝은 원본 허용은 다른 천체로 전달되지 않고 테마 전환 시 야간 보호를 복원한다', async () => {
  await act(async () => root.render(<ObjectPhotoCard id="planet:saturn" />));
  const originalButton = () =>
    container.querySelector<HTMLButtonElement>('[data-testid="photo-original"]')!;
  const hero = () =>
    container.querySelector<HTMLImageElement>('[data-testid="object-photo-hero"]')!;
  expect(hero().classList.contains('object-photo-protected')).toBe(true);
  await act(async () => originalButton().click());
  expect(hero().classList.contains('object-photo-protected')).toBe(false);
  await act(async () => hero().dispatchEvent(new Event('error')));
  expect(container.querySelector('[data-testid="photo-unavailable"]')).not.toBeNull();
  await act(async () => root.render(<ObjectPhotoCard id="planet:jupiter" />));
  expect(hero().dataset.objectId).toBe('planet:jupiter');
  expect(hero().classList.contains('object-photo-protected')).toBe(true);
  await act(async () => originalButton().click());
  await act(async () => useSettingsStore.setState({ theme: 'dark' }));
  await act(async () => useSettingsStore.setState({ theme: 'night' }));
  expect(originalButton().getAttribute('aria-pressed')).toBe('false');
  expect(hero().classList.contains('object-photo-protected')).toBe(true);
});

it('없는 사진은 다른 천체 사진을 대신 쓰지 않으며 썸네일 읽기 실패 시 종류 아이콘으로 돌아간다', async () => {
  await act(async () => root.render(<ObjectPhotoCard id="const:Ori" />));
  expect(container.textContent).toBe('');
  const photo = getObjectPhoto('planet:saturn')!;
  await act(async () =>
    root.render(<PhotoThumbnail photo={photo} fallback={<span>planet-icon</span>} />),
  );
  await act(async () => container.querySelector('img')!.dispatchEvent(new Event('error')));
  expect(container.querySelector('img')).toBeNull();
  expect(container.textContent).toBe('planet-icon');
});

it('전체 원문 크레딧과 저작자·출처·라이선스 링크를 변경하거나 숨기지 않는다', async () => {
  const photo = getObjectPhoto('planet:saturn')!;
  await act(async () => root.render(<PhotoCredit photo={photo} />));
  expect(container.textContent).toContain(photo.credit);
  for (const url of [
    ...photo.creditParts.flatMap((part) => (part.url ? [part.url] : [])),
    photo.sourceURL,
    photo.licenseURL,
  ]) {
    expect([...container.querySelectorAll('a')].some((link) => link.href === url)).toBe(true);
  }
  expect(container.querySelector('details, [hidden], .truncate')).toBeNull();
});
