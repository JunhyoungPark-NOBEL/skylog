/**
 * 간격 반복(task-07 §3.3, D-025): SM-2 단순화.
 * 간격 사다리 1 → 3 → 7 → 14 → 30 → 60일. 틀리면 1일로 돌아가고 ease를 0.2 내린다(1.3~2.5).
 * ease는 사다리 위 단계(reps ≥ 6)에서만 간격을 늘리는 데 쓴다(60 × ease). 하루 복습 상한 10문항.
 */
export interface SrState {
  quizId: string;
  ease: number;
  intervalDays: number;
  /** ISO — 이 시각 이후 복습 대상 */
  due: string;
  reps: number;
  lapses: number;
  lastAt: string;
}

export const SR_LADDER = [1, 3, 7, 14, 30, 60] as const;
export const SR_EASE_MIN = 1.3;
export const SR_EASE_MAX = 2.5;
export const SR_DAILY_LIMIT = 10;
const DAY_MS = 86_400_000;

export function initialSr(quizId: string, now: Date): SrState {
  return {
    quizId,
    ease: SR_EASE_MAX,
    intervalDays: 0,
    due: now.toISOString(),
    reps: 0,
    lapses: 0,
    lastAt: now.toISOString(),
  };
}

/** 정답/오답 반영. 순수 함수. */
export function reviewSr(state: SrState, correct: boolean, now: Date): SrState {
  if (!correct) {
    return {
      ...state,
      ease: Math.max(SR_EASE_MIN, +(state.ease - 0.2).toFixed(2)),
      intervalDays: 1,
      reps: 0,
      lapses: state.lapses + 1,
      due: new Date(now.getTime() + DAY_MS).toISOString(),
      lastAt: now.toISOString(),
    };
  }
  const reps = state.reps + 1;
  const ladder = SR_LADDER[Math.min(reps - 1, SR_LADDER.length - 1)]!;
  const intervalDays =
    reps > SR_LADDER.length ? Math.round(state.intervalDays * state.ease) : ladder;
  return {
    ...state,
    ease: Math.min(SR_EASE_MAX, +(state.ease + 0.05).toFixed(2)),
    intervalDays,
    reps,
    due: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    lastAt: now.toISOString(),
  };
}

/** 오늘 복습할 문항(만료 순), 상한 적용. */
export function dueForReview(
  states: Iterable<SrState>,
  now: Date,
  limit = SR_DAILY_LIMIT,
): SrState[] {
  const t = now.getTime();
  return [...states]
    .filter((s) => Date.parse(s.due) <= t && s.reps >= 0 && s.lapses + s.reps > 0)
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
    .slice(0, limit);
}
