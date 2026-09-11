import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HistoryPreparation } from '@/features/learn/HistoryPreparation';
import { HISTORY_LESSONS, HISTORY_LESSONS_VERSION } from '@/learn/historyLessons';
import type * as PreparationModule from '@/learn/historyPreparation';
import {
  answerPreparation,
  readPreparation,
  type PreparationProgress,
} from '@/learn/historyPreparation';

vi.mock('@/features/learn/HistoryDiagram', () => ({ default: () => <div>DIAGRAM</div> }));
vi.mock('@/learn/historyPreparation', async () => ({
  ...(await vi.importActual<typeof PreparationModule>('@/learn/historyPreparation')),
  readPreparation: vi.fn(),
  answerPreparation: vi.fn(),
}));

const questionId = 'eratosthenes-circumference';
const lesson = HISTORY_LESSONS[questionId]!;
const first = lesson.warmups[0]!;
const second = lesson.warmups[1]!;
const empty = (): PreparationProgress => ({ version: HISTORY_LESSONS_VERSION, answers: {} });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

function MainDraft() {
  const [answer, setAnswer] = useState('40000');
  const [note, setNote] = useState('저장된 메모');
  return (
    <section>
      <h3 tabIndex={-1}>본 문제</h3>
      <input aria-label="본 문제 답" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <textarea aria-label="풀이 메모" value={note} onChange={(e) => setNote(e.target.value)} />
    </section>
  );
}

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(readPreparation).mockReset().mockResolvedValue(empty());
  vi.mocked(answerPreparation).mockReset().mockResolvedValue(empty());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const mount = async (resume = false) => {
  await act(async () =>
    root.render(
      <HistoryPreparation
        questionId={questionId}
        questId="eratosthenes-earth"
        lang="ko"
        resume={resume}
        allowed
      >
        <MainDraft />
      </HistoryPreparation>,
    ),
  );
};
const prep = () => host.querySelector<HTMLElement>('[data-testid="history-preparation"]')!;
const main = () => host.querySelector<HTMLElement>('[data-testid="history-main-content"]')!;
const heading = () => prep().querySelector<HTMLHeadingElement>('h3')!;
const radios = () => [...prep().querySelectorAll<HTMLInputElement>('input[type="radio"]')];
function button(text: string) {
  const found = [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    b.textContent?.startsWith(text),
  );
  if (!found) throw new Error('Missing button: ' + text);
  return found;
}
const click = async (text: string) => {
  await act(async () => button(text).click());
};
const choose = async (index: number) => {
  await act(async () => radios()[index]!.click());
};

it('첫 조회 실패 뒤 선택하고 재조회해도 그 선택은 동일한 준비 문제에 남는다', async () => {
  vi.mocked(readPreparation).mockRejectedValueOnce(new Error('read unavailable'));
  await mount();
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  const title = heading().textContent;
  await choose(0);
  const selected = radios()[0]!;
  const retry = deferred<PreparationProgress>();
  vi.mocked(readPreparation).mockReturnValueOnce(retry.promise);
  await click('다시 불러오기');
  expect(selected.checked).toBe(true);
  await act(async () =>
    retry.resolve({
      version: HISTORY_LESSONS_VERSION,
      answers: { [first.id]: [first.answerId] },
    }),
  );
  expect(heading().textContent).toBe(title);
  expect(radios()[0]).toBe(selected);
  expect(selected.name).toBe('prep-' + first.id);
  expect(selected.checked).toBe(true);
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(main().hidden).toBe(true);
  expect(answerPreparation).not.toHaveBeenCalled();
  await click('생각 확인하기');
  expect(answerPreparation).toHaveBeenCalledExactlyOnceWith(
    questionId,
    first.id,
    first.choices[0]!.id,
  );
});

it('다음 준비 문제의 새 제목으로 초점을 옮기며 이전 선택과 피드백을 지운다', async () => {
  await mount();
  const oldTitle = heading().textContent;
  await choose(first.choices.findIndex((choice) => choice.id === first.answerId));
  await click('생각 확인하기');
  expect(prep().querySelector('[data-testid="preparation-feedback"]')).not.toBeNull();
  const focusedTitles: (string | null)[] = [];
  const nativeFocus = HTMLElement.prototype.focus;
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
    this: HTMLElement,
    options?: FocusOptions,
  ) {
    if (this.tagName === 'H3' && this.closest('[data-testid="history-preparation"]'))
      focusedTitles.push(this.textContent);
    nativeFocus.call(this, options);
  });
  await click('다음으로');
  expect(heading().textContent).not.toBe(oldTitle);
  // 초점을 받는 바로 그 순간에 새 질문이 있어야 한다. 같은 h3 노드라는 사실만 검사하지 않는다.
  expect(focusedTitles).toEqual([heading().textContent]);
  expect(document.activeElement).toBe(heading());
  expect(radios().every((radio) => radio.name === 'prep-' + second.id && !radio.checked)).toBe(
    true,
  );
  expect(prep().querySelector('[data-testid="preparation-feedback"]')).toBeNull();
  expect(button('생각 확인하기').disabled).toBe(true);
});

it('본 문제를 작성하다 준비 문제를 다시 보고 돌아와도 저장 전 답과 메모의 컴포넌트를 유지한다', async () => {
  await mount(true);
  const input = main().querySelector<HTMLInputElement>('input')!;
  const note = main().querySelector<HTMLTextAreaElement>('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '41000');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      note,
      '아직 저장하지 않은 새 풀이',
    );
    note.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('1단계');
  expect(main().hidden).toBe(true);
  expect(main().querySelector('input')).toBe(input);
  expect(input.value).toBe('41000');
  expect(note.value).toBe('아직 저장하지 않은 새 풀이');
  await click('3단계');
  expect(main().hidden).toBe(false);
  expect(main().querySelector('input')).toBe(input);
  expect(main().querySelector('textarea')).toBe(note);
  expect(input.value).toBe('41000');
  expect(note.value).toBe('아직 저장하지 않은 새 풀이');
  expect(document.activeElement).toBe(main().querySelector('h3'));
  expect(answerPreparation).not.toHaveBeenCalled();
});

it('하나의 카드에서 서로 다른 장면과 9단계 위치를 이어 주고 복습은 기존 완료를 지우지 않는다', async () => {
  await mount();
  const card = host.querySelector('[data-testid="history-story-step"]')!;
  const scene = () => host.querySelector('[data-testid="history-scene"]')!.textContent;
  const count = () => host.querySelector('[data-testid="history-step-count"]')!.textContent;
  const opening = scene();
  expect(count()).toContain('1 / 9');
  expect(host.textContent).not.toMatch(/준비 문제|선행 문제|본문제로/);
  await choose(first.choices.findIndex((choice) => choice.id === first.answerId));
  await click('생각 확인하기');
  await click('다음으로');
  const middle = scene();
  expect(middle).not.toBe(opening);
  expect(count()).toContain('2 / 9');
  await choose(second.choices.findIndex((choice) => choice.id === second.answerId));
  await click('생각 확인하기');
  await click('다음으로');
  expect(count()).toContain('3 / 9');
  expect(scene()).not.toBe(middle);
  expect(main().hidden).toBe(false);
  expect(host.querySelector('[data-testid="history-story-step"]')).toBe(card);
  await click('1단계');
  expect(count()).toContain('1 / 9');
  await click('다음으로');
  expect(count()).toContain('2 / 9');
  expect(answerPreparation).toHaveBeenCalledTimes(2);
});
