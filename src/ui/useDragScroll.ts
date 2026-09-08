import { useCallback, useEffect, useRef, type RefCallback } from 'react';

/**
 * 마우스로 콘텐츠를 잡아 끌어도 스크롤되게 하는 훅(D-022).
 *
 * - 터치·펜은 브라우저의 네이티브 스크롤을 그대로 쓴다(포인터 타입 'mouse'만 처리).
 * - 6px 이상 움직여야 드래그로 인정한다 → 버튼 탭·텍스트 선택과 충돌하지 않는다.
 * - 첫 이동 방향으로 축을 고정한다. 가로면 가장 가까운 가로 스크롤러(칩 행 등)를, 세로면 이 컨테이너를 끈다.
 * - 놓으면 마지막 100ms 속도로 관성 스크롤(지수 감쇠, τ=325ms). 놓기 전 80ms 이상 멈춰 있었으면 관성 없음.
 *   새 포인터·휠이 오면 즉시 멈춘다.
 * - 드래그 직후 발생하는 click은 캡처 단계에서 삼킨다(끌다 놓았을 때 버튼이 눌리지 않게).
 * - 대상이 입력 요소이거나 `touch-action: none` 영역(하늘 캔버스·범위 링·시트 손잡이)이면 손대지 않는다.
 * - pointerup을 놓친 경우(컨테이너 밖 고정 요소 위에서 놓음)는 다음 pointermove의 `buttons`로 알아채 상태를 푼다.
 */

export const DRAG_THRESHOLD_PX = 6;
export const INERTIA_TAU_MS = 325;
/** 놓기 직전 이만큼 움직임이 없었으면 관성을 주지 않는다(CameraController와 같은 규칙) */
export const REST_BEFORE_RELEASE_MS = 80;
const MAX_VELOCITY = 4; // px/ms
const STOP_VELOCITY = 0.01; // px/ms
const SAMPLE_WINDOW_MS = 100;
const CLICK_SUPPRESS_MS = 150; // 브라우저는 pointerup 직후 같은 태스크에서 click을 보내므로 짧아도 충분

type Axis = 'x' | 'y';

const inertiaStops = new WeakMap<HTMLElement, () => void>();

/** 같은 본문을 움직이는 시트 제스처가 시작되면 기존 마우스 관성을 멈춘다. */
export function stopDragScrollInertia(container: HTMLElement) {
  inertiaStops.get(container)?.();
}

interface Sample {
  t: number;
  pos: number;
}

/** 관성 한 프레임: 현재 위치·속도(px/ms)·경과 ms → 다음 위치·속도. 순수 함수(단위 테스트용). */
export function inertiaStep(
  pos: number,
  velocity: number,
  dtMs: number,
  tauMs = INERTIA_TAU_MS,
): { pos: number; velocity: number } {
  const decay = Math.exp(-dtMs / tauMs);
  return { pos: pos - velocity * tauMs * (1 - decay), velocity: velocity * decay };
}

/** 최근 샘플로 속도(px/ms)를 구한다. 샘플이 부족하거나 마지막 샘플이 `now`보다 오래됐으면 0. */
export function velocityFrom(samples: readonly Sample[], now?: number): number {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || last.t <= first.t) return 0;
  if (now !== undefined && now - last.t > REST_BEFORE_RELEASE_MS) return 0;
  return (last.pos - first.pos) / (last.t - first.t);
}

function isOwnScrollTarget(el: Element, container: HTMLElement): boolean {
  let node: Element | null = el;
  while (node && node !== container) {
    if (node.matches('input, textarea, select, [contenteditable="true"], [data-drag-scroll="off"]'))
      return false;
    if (getComputedStyle(node).touchAction === 'none') return false;
    node = node.parentElement;
  }
  return true;
}

/** target에서 container까지 올라가며 실제로 가로 스크롤이 가능한 가장 가까운 요소 */
function horizontalScroller(el: Element, container: HTMLElement): HTMLElement | null {
  let node: Element | null = el;
  while (node && node !== container) {
    if (node instanceof HTMLElement) {
      const ox = getComputedStyle(node).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 1)
        return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function attachDragScroll(container: HTMLElement): () => void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startScroll = 0;
  let axis: Axis | null = null;
  let scroller: HTMLElement = container;
  let dragging = false;
  let draggedAt = -Infinity;
  let samples: Sample[] = [];
  let raf = 0;
  let prevUserSelect = '';
  let prevCursor = '';

  const stopInertia = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  inertiaStops.set(container, stopInertia);

  const get = () => (axis === 'x' ? scroller.scrollLeft : scroller.scrollTop);
  const set = (v: number) => {
    if (axis === 'x') scroller.scrollLeft = v;
    else scroller.scrollTop = v;
  };
  const max = () =>
    axis === 'x'
      ? scroller.scrollWidth - scroller.clientWidth
      : scroller.scrollHeight - scroller.clientHeight;

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    draggedAt = performance.now();
    container.style.userSelect = prevUserSelect;
    container.style.cursor = prevCursor;
    container.removeAttribute('data-drag-scrolling');
  };

  /** 포인터 추적을 완전히 푼다(관성 없음). 놓친 pointerup·새 pointerdown에서 사용. */
  const reset = () => {
    pointerId = null;
    axis = null;
    samples = [];
    endDrag();
  };

  const inertia = (v0: number) => {
    let v = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v0));
    let last = performance.now();
    const step = (now: number) => {
      raf = 0;
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      const next = inertiaStep(get(), v, dt);
      const clamped = Math.max(0, Math.min(max(), next.pos));
      set(clamped);
      v = next.velocity;
      if (Math.abs(v) < STOP_VELOCITY || clamped !== next.pos) return;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stopInertia();
    reset();
    if (!(e.target instanceof Element) || !isOwnScrollTarget(e.target, container)) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    scroller = container;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    if ((e.buttons & 1) === 0) {
      // 버튼이 이미 떼어졌는데 pointerup을 못 받은 경우(고정 요소 위에서 놓음) → 유령 드래그 방지
      reset();
      return;
    }
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!axis) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      const wantX = Math.abs(dx) > Math.abs(dy);
      const hx =
        wantX && e.target instanceof Element ? horizontalScroller(e.target, container) : null;
      if (hx) {
        axis = 'x';
        scroller = hx;
      } else if (container.scrollHeight > container.clientHeight + 1) {
        axis = 'y';
        scroller = container;
      } else {
        pointerId = null;
        return;
      }
      startScroll = get();
      startX = e.clientX;
      startY = e.clientY;
      dragging = true;
      prevUserSelect = container.style.userSelect;
      prevCursor = container.style.cursor;
      container.style.userSelect = 'none';
      container.style.cursor = 'grabbing';
      container.setAttribute('data-drag-scrolling', '1');
      getSelection()?.removeAllRanges();
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        /* jsdom 등 미구현 환경 */
      }
      return;
    }
    const delta = axis === 'x' ? e.clientX - startX : e.clientY - startY;
    set(startScroll - delta);
    const now = performance.now();
    samples.push({ t: now, pos: axis === 'x' ? e.clientX : e.clientY });
    while (samples.length > 1 && now - samples[0]!.t > SAMPLE_WINDOW_MS) samples.shift();
    e.preventDefault();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (pointerId !== e.pointerId) return;
    pointerId = null;
    try {
      if (container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!dragging) return;
    endDrag();
    const v = velocityFrom(samples, performance.now());
    samples = [];
    if (Math.abs(v) > 0.05) inertia(v);
  };

  const onClickCapture = (e: MouseEvent) => {
    if (dragging || performance.now() - draggedAt < CLICK_SUPPRESS_MS) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onDragStart = (e: DragEvent) => {
    if (pointerId !== null) e.preventDefault();
  };
  const onWheel = () => stopInertia();

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('click', onClickCapture, true);
  container.addEventListener('dragstart', onDragStart);
  container.addEventListener('wheel', onWheel, { passive: true });
  return () => {
    stopInertia();
    inertiaStops.delete(container);
    reset();
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerup', onPointerUp);
    container.removeEventListener('pointercancel', onPointerUp);
    container.removeEventListener('click', onClickCapture, true);
    container.removeEventListener('dragstart', onDragStart);
    container.removeEventListener('wheel', onWheel);
  };
}

/**
 * 스크롤 컨테이너에 ref로 붙이면 마우스 드래그 스크롤이 켜진다.
 * 콜백 ref라서 조건부로 마운트되는 요소(마법사 단계 목록 등)에도 붙였다 뗐다 한다.
 */
export function useDragScroll<T extends HTMLElement>(): RefCallback<T> {
  const detach = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      detach.current?.();
      detach.current = null;
    },
    [],
  );
  return useCallback((el: T | null) => {
    detach.current?.();
    detach.current = el ? attachDragScroll(el) : null;
  }, []);
}
