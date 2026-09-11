import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryGlossary, HistoryRichText } from '@/features/learn/HistoryRichText';
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const mount = async () =>
  act(async () =>
    root.render(
      <HistoryGlossary
        lang="ko"
        concepts={[
          {
            term: { ko: '천정각', en: 'zenith angle' },
            meaning: { ko: '머리 위 방향에서 천체까지 잰 각도.', en: 'Angle from the zenith.' },
          },
        ]}
      >
        <HistoryRichText text="천정각이 0도라면?" />
      </HistoryGlossary>,
    ),
  );
const term = () => host.querySelector<HTMLElement>('.history-term')!;
const pointer = async (type: string, x: number, y: number) =>
  act(async () => {
    term().dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  });
describe('in-context long-press glossary', () => {
  it('does not open after a short touch or mouse click, including its synthetic click', async () => {
    await mount();
    await pointer('pointerdown', 10, 10);
    await act(async () => vi.advanceTimersByTime(200));
    await pointer('pointerup', 10, 10);
    await act(async () => term().click());
    await act(async () => vi.advanceTimersByTime(600));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('cancels when the page scrolls or the pointer is canceled before the hold threshold', async () => {
    await mount();
    for (const event of ['scroll', 'pointercancel']) {
      await pointer('pointerdown', 10, 10);
      await act(async () => vi.advanceTimersByTime(300));
      await act(async () => {
        (event === 'scroll' ? window : term()).dispatchEvent(new Event(event, { bubbles: true }));
      });
      await act(async () => vi.advanceTimersByTime(300));
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    }
  });
  it('keeps the definition open on hold release and closes only a fresh backdrop gesture', async () => {
    await mount();
    await pointer('pointerdown', 10, 10);
    await act(async () => vi.advanceTimersByTime(450));
    const backdrop = document.querySelector('[role="dialog"]')!.parentElement!;
    await act(async () => backdrop.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => {
      backdrop.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      backdrop.click();
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('opens after a hold, supports Escape, and restores focus to the term', async () => {
    await mount();
    await pointer('pointerdown', 10, 10);
    await act(async () => vi.advanceTimersByTime(450));
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('머리 위 방향');
    expect(document.activeElement).toBe(dialog);
    await act(async () =>
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(term());
  });
  it('lets a scrolling gesture cancel both a hold and its following click', async () => {
    await mount();
    await pointer('pointerdown', 10, 10);
    await pointer('pointermove', 10, 50);
    await act(async () => vi.advanceTimersByTime(600));
    await pointer('pointerup', 10, 50);
    await act(async () => term().click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('opens with a keyboard and keeps terms out of answer labels when requested', async () => {
    await mount();
    await act(async () =>
      term().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => root.render(<HistoryRichText text="천정각" terms={false} />));
    expect(host.querySelector('[role="button"]')).toBeNull();
  });
});
