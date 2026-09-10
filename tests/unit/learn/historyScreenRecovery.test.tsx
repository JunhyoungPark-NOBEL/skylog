import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitDbChange } from '@/db/events';
import HistoryQuestsScreen from '@/features/learn/HistoryQuestsScreen';
import { HISTORY_QUESTS } from '@/learn/historyQuests';
import type * as HistoryProgressModule from '@/learn/historyProgress';
import {
  emptyHistoryProgress,
  readHistoryProgress,
  updateHistoryProgress,
  type HistoryProgress,
} from '@/learn/historyProgress';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/entitlements', () => ({ useEntitlements: () => ({}), canAccessPlus: () => true }));
vi.mock('@/features/learn/PlusAccess', () => ({
  PlusOffer: () => <div>PLUS_OFFER</div>,
  PlusNotice: () => <button>PLUS_NOTICE</button>,
}));
vi.mock('@/state/settingsStore', () => ({
  useSettingsStore: (select: (state: { lang: 'ko' }) => unknown) => select({ lang: 'ko' }),
}));
vi.mock('@/learn/historyProgress', async () => {
  const actual = await vi.importActual<typeof HistoryProgressModule>('@/learn/historyProgress');
  return { ...actual, readHistoryProgress: vi.fn(), updateHistoryProgress: vi.fn() };
});

const quest = HISTORY_QUESTS[0]!;
const question = quest.questions[0]!;
const snapshot = () => new Map<string, HistoryProgress>([[question.id, emptyHistoryProgress()]]);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(readHistoryProgress).mockReset().mockResolvedValue(snapshot());
  vi.mocked(updateHistoryProgress).mockReset().mockResolvedValue(emptyHistoryProgress());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
const mount = async () => {
  await act(async () => root.render(<HistoryQuestsScreen questId={quest.id} />));
};
function button(label: string) {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent === label,
  );
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}
const input = () => host.querySelector<HTMLInputElement>('[data-testid="history-numeric"]')!;
const note = () => host.querySelector<HTMLTextAreaElement>('textarea')!;
async function editDraft() {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), '4e4');
    input().dispatchEvent(new Event('input', { bubbles: true }));
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      note(),
      '아직 저장하지 않은 풀이: 둘레 = 800 × 360 / 7.2',
    );
    note().dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const changed = async () => {
  await act(async () => emitDbChange('progress'));
};
const click = async (name: string) => {
  await act(async () => button(name).click());
};
function expectDraft() {
  expect(input().value).toBe('4e4');
  expect(note().value).toBe('아직 저장하지 않은 풀이: 둘레 = 800 × 360 / 7.2');
}

describe('역사 탐구의 읽기 실패와 작성 중인 풀이 보존', () => {
  it('이전 읽기의 늦은 실패가 최신 성공이나 미저장 입력을 덮지 않는다', async () => {
    await mount();
    await editDraft();
    const originalInput = input();
    const older = deferred<Map<string, HistoryProgress>>();
    const newer = deferred<Map<string, HistoryProgress>>();
    vi.mocked(readHistoryProgress)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    await changed();
    await changed();
    expect(readHistoryProgress).toHaveBeenCalledTimes(3);
    await act(async () => newer.resolve(snapshot()));
    await act(async () => older.reject(new Error('late IndexedDB failure')));
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(input()).toBe(originalInput);
    expectDraft();
    expect(input().matches(':disabled')).toBe(false);
    expect(updateHistoryProgress).not.toHaveBeenCalled();
  });

  it('최신 읽기가 실패하면 초안을 유지한 채 잠그고 재조회 성공 뒤 같은 초안을 저장한다', async () => {
    await mount();
    await editDraft();
    const originalInput = input();
    const originalNote = note();
    const failedRead = deferred<Map<string, HistoryProgress>>();
    vi.mocked(readHistoryProgress).mockReturnValueOnce(failedRead.promise);
    await changed();
    await act(async () => failedRead.reject(new Error('temporary IndexedDB failure')));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('history.loadError');
    expect(input()).toBe(originalInput);
    expect(note()).toBe(originalNote);
    expectDraft();
    expect(input().matches(':disabled')).toBe(true);
    expect(note().matches(':disabled')).toBe(true);
    expect(button('history.save').matches(':disabled')).toBe(true);
    expect(button('history.nextHint').matches(':disabled')).toBe(true);
    expect(button('study.retry').matches(':disabled')).toBe(false);
    expect(updateHistoryProgress).not.toHaveBeenCalled();

    const retry = deferred<Map<string, HistoryProgress>>();
    vi.mocked(readHistoryProgress).mockReturnValueOnce(retry.promise);
    await click('study.retry');
    expectDraft();
    expect(input().matches(':disabled')).toBe(true);
    await act(async () => retry.reject(new Error('still unavailable')));
    expect(input()).toBe(originalInput);
    expectDraft();
    expect(input().matches(':disabled')).toBe(true);

    const recovery = deferred<Map<string, HistoryProgress>>();
    vi.mocked(readHistoryProgress).mockReturnValueOnce(recovery.promise);
    await click('study.retry');
    expect(input().matches(':disabled')).toBe(true);
    await act(async () => recovery.resolve(snapshot()));
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(input()).toBe(originalInput);
    expect(note()).toBe(originalNote);
    expectDraft();
    expect(input().matches(':disabled')).toBe(false);
    await click('history.save');
    expect(updateHistoryProgress).toHaveBeenCalledExactlyOnceWith(quest.id, question.id, 1, {
      type: 'draft',
      input: '4e4',
      note: '아직 저장하지 않은 풀이: 둘레 = 800 × 360 / 7.2',
    });
  });

  it('이전 읽기의 늦은 성공은 최신 읽기 실패의 편집 잠금을 해제하지 않는다', async () => {
    await mount();
    await editDraft();
    const older = deferred<Map<string, HistoryProgress>>();
    const newer = deferred<Map<string, HistoryProgress>>();
    vi.mocked(readHistoryProgress)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    await changed();
    await changed();
    await act(async () => newer.reject(new Error('newest read failed')));
    await act(async () => older.resolve(snapshot()));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('history.loadError');
    expectDraft();
    expect(input().matches(':disabled')).toBe(true);
    expect(updateHistoryProgress).not.toHaveBeenCalled();
  });

  it('첫 조회 실패에는 빈 진도를 편집시키지 않고 재조회한 저장값으로 연다', async () => {
    vi.mocked(readHistoryProgress).mockRejectedValueOnce(new Error('initial read failed'));
    await mount();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('history.loadError');
    expect(input()).toBeNull();
    const recovered = snapshot();
    recovered.set(question.id, {
      ...emptyHistoryProgress(),
      input: '40000',
      note: '기존 저장 메모',
    });
    vi.mocked(readHistoryProgress).mockResolvedValueOnce(recovered);
    await click('study.retry');
    expect(input().value).toBe('40000');
    expect(note().value).toBe('기존 저장 메모');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(updateHistoryProgress).not.toHaveBeenCalled();
  });
});
