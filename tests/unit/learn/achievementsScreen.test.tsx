import { readFileSync } from 'node:fs';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initI18n } from '@/app/i18n';
import { AchievementsScreen } from '@/features/learn/AchievementsScreen';
import type { LearningState } from '@/learn/runtime';
import type { Badge } from '@/learn/schema';
import { useSettingsStore } from '@/state/settingsStore';

const badges = JSON.parse(readFileSync('public/data/learn/v2/badges.json', 'utf8')) as Badge[];
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
let host: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom에는 native dialog의 top layer가 없다. 실제 초점·Escape는 Chromium에서 검증한다.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.open) return;
      this.removeAttribute('open');
      queueMicrotask(() => this.dispatchEvent(new Event('close')));
    },
  });
  useSettingsStore.setState({ lang: 'ko' });
  await initI18n('ko');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  for (const [key, descriptor] of [
    ['showModal', showModal],
    ['close', close],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
  vi.unstubAllGlobals();
});
// 화면에서 읽는 데이터만 제공한다. 판정 엔진은 badges.test.ts에서 독립 검증한다.
function value(earned: string[] = []): LearningState {
  return {
    data: { badges },
    snap: { earnedBadges: new Set(earned) },
    badgeProgress: new Map(
      badges.map((badge) => [
        badge.id,
        { n: 0, total: 'n' in badge.rule ? badge.rule.n : 1, done: false },
      ]),
    ),
  } as unknown as LearningState;
}

it('모은 업적만 보기에서도 분모48·분류별 전체수는 유지하고 실제 보유만 센다', async () => {
  await act(async () =>
    root.render(
      <AchievementsScreen
        value={value(['badge-first-look', 'badge-first-sketch', 'removed-badge'])}
      />,
    ),
  );
  expect(host.querySelector('[data-testid="achievement-total"]')!.textContent).toBe('2 / 48 달성');
  expect(host.querySelectorAll('article')).toHaveLength(48);
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-pressed]')!.click());
  expect(host.querySelectorAll('article')).toHaveLength(2);
  expect(host.querySelector('[data-testid="achievement-total"]')!.textContent).toBe('2 / 48 달성');
  expect(
    [...host.querySelectorAll('[data-testid="achievement-group-count"]')].map(
      (node) => node.textContent,
    ),
  ).toEqual(['1 / 11', '1 / 9']);
});

it('StrictMode에서도 선택한 조건이 유지되고 닫은 뒤 다른 업적의 조건으로 새로 연다', async () => {
  await act(async () =>
    root.render(
      <StrictMode>
        <AchievementsScreen value={value()} />
      </StrictMode>,
    ),
  );
  expect(host.textContent).not.toContain('처음 푸는 문제 3개 연속 정답');
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-testid="badge-badge-quiz-3"] button')!.click(),
  );
  let dialog = document.querySelector('dialog')!;
  expect(dialog.open).toBe(true);
  expect(dialog.textContent).toContain('처음 푸는 문제 3개 연속 정답');
  expect(dialog.textContent).toContain('이어지는 세 정답');
  await act(async () => dialog.querySelector<HTMLButtonElement>('button')!.click());
  expect(document.querySelector('dialog')).toBeNull();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>(
        '[data-testid="badge-challenge-observation-nights-3"] button',
      )!
      .click(),
  );
  dialog = document.querySelector('dialog')!;
  expect(dialog.textContent).toContain('연속일 필요는 없어요');
  expect(dialog.textContent).not.toContain('처음 푸는 문제');
});
