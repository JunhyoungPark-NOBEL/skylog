import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { HistoryLesson } from '@/learn/historyLessons';
import { renderHistoryMath, splitHistoryMath } from '@/learn/historyMath';
import 'katex/dist/katex.min.css';
import './historyTypography.css';

type Concept = HistoryLesson['concepts'][number];
type Glossary = {
  concepts: Concept[];
  lang: 'ko' | 'en';
  open: (concept: Concept, anchor: HTMLElement) => void;
};
const GlossaryContext = createContext<Glossary | null>(null);

export function HistoryGlossary({
  concepts,
  lang,
  children,
}: {
  concepts: Concept[];
  lang: 'ko' | 'en';
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Concept | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const backdropStarted = useRef(false);
  const close = () => {
    setSelected(null);
    anchor.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (selected) dialog.current?.focus();
  }, [selected]);
  return (
    <GlossaryContext.Provider
      value={{
        concepts,
        lang,
        open: (term, element) => {
          backdropStarted.current = false;
          anchor.current = element;
          setSelected(term);
        },
      }}
    >
      {children}
      {selected &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:items-center"
            onPointerDown={(event) => {
              backdropStarted.current = event.target === event.currentTarget;
            }}
            onClick={(event) => {
              // 길게 누른 원래 손가락을 떼며 생성된 클릭은 새 배경을 닫지 않는다.
              if (backdropStarted.current && event.target === event.currentTarget) close();
              backdropStarted.current = false;
            }}
          >
            <div
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-term-title"
              tabIndex={-1}
              data-testid="history-glossary-dialog"
              className="max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-hairline bg-surface p-5 text-fg shadow-card outline-none"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  close();
                }
                if (event.key === 'Tab') {
                  event.preventDefault();
                  dialog.current?.querySelector('button')?.focus();
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 id="history-term-title" className="pt-2 text-title">
                  {selected.term[lang]}
                </h3>
                <button
                  className="min-h-11 min-w-11 rounded-full bg-surface-2"
                  onClick={close}
                  aria-label={lang === 'ko' ? '용어 설명 닫기' : 'Close definition'}
                >
                  ✕
                </button>
              </div>
              <p className="mt-3 text-body-sm leading-7">
                <HistoryRichText text={selected.meaning[lang]} terms={false} />
              </p>
            </div>
          </div>,
          document.body,
        )}
    </GlossaryContext.Provider>
  );
}

function Term({
  concept,
  children,
  glossary,
}: {
  concept: Concept;
  children: string;
  glossary: Glossary;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => {
    // 스크롤바·트랙패드·다른 손가락이 스크롤해도 아직 진행 중인 홀드는 취소한다.
    window.addEventListener('scroll', cancel, true);
    window.addEventListener('blur', cancel);
    return () => {
      cancel();
      window.removeEventListener('scroll', cancel, true);
      window.removeEventListener('blur', cancel);
    };
  }, []);
  return (
    <span
      role="button"
      tabIndex={0}
      className="history-term"
      aria-haspopup="dialog"
      aria-label={glossary.lang === 'ko' ? `${children} 뜻 보기` : `Define ${children}`}
      aria-description={
        glossary.lang === 'ko'
          ? '꾹 누르거나 키보드 Enter 또는 Space를 누르세요.'
          : 'Press and hold, or use Enter or Space on a keyboard.'
      }
      onPointerDown={(event) => {
        cancel();
        if (event.button !== 0 || event.isPrimary === false) return;
        start.current = { x: event.clientX, y: event.clientY };
        const target = event.currentTarget;
        timer.current = setTimeout(() => {
          timer.current = null;
          glossary.open(concept, target);
        }, 450);
      }}
      onPointerMove={(event) => {
        if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 9) {
          cancel();
        }
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onBlur={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onClick={cancel}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          cancel();
          glossary.open(concept, event.currentTarget);
        }
      }}
    >
      {children}
    </span>
  );
}

function GlossaryWords({ text }: { text: string }) {
  const glossary = useContext(GlossaryContext);
  if (!glossary) return text;
  const words = glossary.concepts
    .flatMap((concept) =>
      [concept.term, ...(concept.aliases ?? [])].map((term) => ({
        word: term[glossary.lang],
        concept,
      })),
    )
    .filter((item) => item.word.length >= 2)
    .sort((a, b) => b.word.length - a.word.length);
  if (!words.length) return text;
  const escaped = words.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(
    glossary.lang === 'en' ? `\\b(?:${escaped.join('|')})\\b` : escaped.join('|'),
    'gi',
  );
  const result: ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    result.push(text.slice(offset, index));
    const concept = words.find(
      (v) => v.word.toLocaleLowerCase() === match[0].toLocaleLowerCase(),
    )!.concept;
    result.push(
      <Term key={index} concept={concept} glossary={glossary}>
        {match[0]}
      </Term>,
    );
    offset = index + match[0].length;
  }
  result.push(text.slice(offset));
  return result;
}

export function HistoryRichText({ text, terms = true }: { text: string; terms?: boolean }) {
  return (
    <>
      {splitHistoryMath(text).map((part, index) => {
        if (!part.math)
          return (
            <Fragment key={index}>
              {terms ? <GlossaryWords text={part.value} /> : part.value}
            </Fragment>
          );
        try {
          const markup = renderHistoryMath(part.value);
          return (
            <span
              key={index}
              className="skyard-math"
              data-testid="history-math"
              dangerouslySetInnerHTML={{ __html: markup }}
            />
          );
        } catch {
          return (
            <span key={index} className="font-serif italic" data-testid="history-math-fallback">
              {part.value}
            </span>
          );
        }
      })}
    </>
  );
}
