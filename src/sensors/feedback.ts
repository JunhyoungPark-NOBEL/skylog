/**
 * 피드백 (task-02 §3.6): Android는 진동, iOS(진동 없음·무음 스위치)는 **시각 플래시가 1차**, 소리는 옵션.
 * Firefox Android 129+는 Vibration API가 제거됐다(G1) — 반환값을 진동 발생 증거로 보지 않는다.
 */
export interface FeedbackOptions {
  sound: boolean;
}

let audioCtx: AudioContext | null = null;

export function vibrate(pattern: number | number[]): boolean {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? navigator.vibrate(pattern)
      : false;
  } catch {
    return false;
  }
}

/** 화면 테두리 플래시(CSS 클래스 토글). 야간 모드에서도 테마 색을 따른다. */
export function flash(kind: 'ok' | 'warn' = 'ok', durationMs = 250): void {
  const el = globalThis.document?.documentElement;
  if (!el) return;
  el.classList.add(`flash-${kind}`);
  window.setTimeout(() => el.classList.remove(`flash-${kind}`), durationMs);
}

/** 짧은 비프(Web Audio). 사용자 제스처 이후에만 재생된다. */
export function beep(freq = 880, ms = 120): void {
  try {
    const Ctx = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch {
    /* 무시 */
  }
}

/** 공통 피드백: 성공(정렬 완료 등) */
export function feedbackOk(opts: FeedbackOptions): void {
  flash('ok');
  vibrate(30);
  if (opts.sound) beep(880, 100);
}

export function feedbackWarn(opts: FeedbackOptions): void {
  flash('warn', 400);
  vibrate([40, 60, 40]);
  if (opts.sound) beep(330, 200);
}
