import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizHost } from '@/features/learn/QuizHost';
import { useLearnUiStore } from '@/state/learnUiStore';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  record: vi.fn(),
  access: vi.fn(),
  quizAccess: vi.fn(),
  questions: [1, 2].map((n) => ({
    id: `q${n}`,
    type: 'mc',
    question: { ko: `Question ${n}` },
    choices: [{ ko: 'A' }, { ko: 'B' }],
    answer: 1,
    explanation: { ko: 'Explanation' },
  })),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/learn/runtime', () => ({
  readLearning: mocks.read,
  recordStageAnswer: mocks.record,
  recordAnswer: vi.fn(),
  selectQuiz: vi.fn(),
}));
vi.mock('@/learn/stages', () => ({
  QUIZ_STAGES: [{ id: 'paid-stage', chapter: 2, theme: 'stars' }],
  stageQuestions: () => mocks.questions,
  nextStage: () => undefined,
  stageNumber: () => 1,
}));
vi.mock('@/learn/access', () => ({ ensureQuizAccess: mocks.quizAccess }));
vi.mock('@/entitlements', () => ({
  PlusAccessError: class extends Error {},
  ensurePlusAccess: mocks.access,
  canAccessPlus: () => true,
  getEntitlementsSnapshot: () => ({}),
}));
vi.mock('@/features/learn/PlusAccess', () => ({ PlusOffer: () => <div>Plus offer</div> }));
import { PlusAccessError } from '@/entitlements';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.read.mockReset().mockResolvedValue({
    data: { quiz: mocks.questions },
    journey: [{ stage: { id: 'paid-stage' }, unlocked: true }],
  });
  mocks.record.mockReset().mockResolvedValue({ correct: true, result: null });
  mocks.access.mockReset().mockResolvedValue(undefined);
  mocks.quizAccess.mockReset().mockResolvedValue(undefined);
  useLearnUiStore.getState().openQuiz({ stageId: 'paid-stage' });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  useLearnUiStore.getState().closeQuiz();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () => root.render(<QuizHost />));
}
async function clickText(label: string) {
  const button = [...host.querySelectorAll('button')].find((b) => b.textContent === label);
  if (!button) throw new Error(`Missing ${label}`);
  await act(async () => button.click());
}
async function choose() {
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[data-testid="quiz-choice-1"]')!.click(),
  );
}
async function submit() {
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')];
  await act(async () => buttons.at(-1)!.click());
}

describe('퀴즈 제출 중 이용권 오류 복구', () => {
  it('권한 재확인 실패는 잠금을 유지하고, 성공하면 같은 문제·선택·runId로 이어 간다', async () => {
    await mount();
    await choose();
    await submit();
    await submit(); // 첫 문제의 다음 버튼
    expect(host.textContent).toContain('Question 2');
    await choose();
    mocks.record.mockRejectedValueOnce(new PlusAccessError('ENTITLEMENTS_UNAVAILABLE'));
    await submit();
    expect(host.textContent).toContain('Plus offer');
    expect(host.querySelector('[data-testid="quiz-card"]')).toBeNull();
    mocks.access.mockRejectedValueOnce(new PlusAccessError('PLUS_REQUIRED'));
    await clickText('study.retry');
    expect(host.textContent).toContain('Plus offer');
    expect(mocks.record).toHaveBeenCalledTimes(2);
    await clickText('study.retry');
    expect(host.textContent).toContain('Question 2');
    expect(host.textContent).not.toContain('Plus offer');
    expect(host.querySelector('[data-testid="quiz-choice-1"]')?.getAttribute('aria-checked')).toBe(
      'true',
    );
    await submit();
    expect(mocks.read).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledTimes(3);
    const calls = mocks.record.mock.calls;
    expect(calls.map((c) => c[1])).toEqual([calls[0]![1], calls[0]![1], calls[0]![1]]);
    expect(calls.map((c) => c[2])).toEqual([0, 1, 1]);
    expect(mocks.quizAccess).toHaveBeenCalledWith(mocks.questions[1], undefined);
  });
  it('처음 열린 잠금 화면도 재확인 후 문제를 불러올 수 있다', async () => {
    mocks.access.mockRejectedValueOnce(new PlusAccessError('PLUS_REQUIRED'));
    await mount();
    expect(host.textContent).toContain('Plus offer');
    await clickText('study.retry');
    expect(host.textContent).toContain('Question 1');
    expect(mocks.record).not.toHaveBeenCalled();
  });
});
