import { useCallback, useRef, useState } from 'react';
import { inertiaStep, stopDragScrollInertia, velocityFrom } from '@/ui/useDragScroll';

type Stage = 'half' | 'full';
type Motion = { offset: number; dragging: boolean };
type Gesture = {
  id: number;
  x: number;
  y: number;
  offset: number;
  inBody: boolean;
  onHandle: boolean;
  atTop: boolean;
  body: HTMLElement | null;
  scrollStart: number;
  samples: { t: number; pos: number }[];
  mode: 'pending' | 'sheet' | 'body' | 'native';
};

const DIRECTION_THRESHOLD = 6;
const SNAP_DISTANCE = 70;

/**
 * 시트 전체에서 시작하는 세로 제스처. 본문 스크롤과 시트 이동 중 하나만 소유한다.
 * 터치 스크롤·핀치는 브라우저에 남기고 시트 이동으로 결정된 touchmove만 취소한다.
 */
function attachSheetGesture(
  sheet: HTMLDivElement,
  stage: Stage,
  setStage: (stage: Stage) => void,
  close: () => void,
  updateMotion: (motion: Motion) => void,
  clickGuard: { current: number },
) {
  let gesture: Gesture | null = null;
  let capturedPointer: number | null = null;
  let inertiaFrame = 0;
  const stopInertia = () => {
    cancelAnimationFrame(inertiaFrame);
    inertiaFrame = 0;
  };
  const scrollWithInertia = (body: HTMLElement, initialVelocity: number) => {
    let velocity = Math.max(-4, Math.min(4, initialVelocity));
    let previous = performance.now();
    const step = (now: number) => {
      const next = inertiaStep(body.scrollTop, velocity, Math.min(64, now - previous));
      previous = now;
      const top = Math.max(0, Math.min(body.scrollHeight - body.clientHeight, next.pos));
      body.scrollTop = top;
      velocity = next.velocity;
      inertiaFrame = 0;
      if (Math.abs(velocity) > 0.01 && top === next.pos) inertiaFrame = requestAnimationFrame(step);
    };
    inertiaFrame = requestAnimationFrame(step);
  };

  const releaseCapture = () => {
    if (capturedPointer !== null && sheet.hasPointerCapture(capturedPointer)) {
      sheet.releasePointerCapture(capturedPointer);
    }
    capturedPointer = null;
  };
  const cancel = () => {
    const wasDragging = gesture?.mode === 'sheet';
    if (gesture?.mode === 'body') clickGuard.current = performance.now() + 500;
    gesture = null;
    releaseCapture();
    if (wasDragging) {
      clickGuard.current = performance.now() + 500;
      updateMotion({ offset: 0, dragging: false });
    }
  };
  const begin = (id: number, x: number, y: number, target: EventTarget | null) => {
    stopInertia();
    cancel();
    clickGuard.current = 0;
    if (!(target instanceof Element)) return;
    // 버튼은 탭과 드래그를 구분하되, 입력·선택 등 자체 조작은 가로채지 않는다.
    if (target.closest('input, textarea, select, [contenteditable], [data-sheet-gesture="off"]'))
      return;
    const body = sheet.querySelector<HTMLElement>('[data-sheet-body]');
    if (body) stopDragScrollInertia(body);
    gesture = {
      id,
      x,
      y,
      offset: 0,
      inBody: body?.contains(target) ?? false,
      onHandle: target.closest('[data-sheet-handle]') !== null,
      atTop: !body || body.scrollTop <= 1,
      body,
      scrollStart: body?.scrollTop ?? 0,
      samples: [],
      mode: 'pending',
    };
  };
  const move = (x: number, y: number, event: Event) => {
    if (!gesture || gesture.mode === 'native') return false;
    const dx = x - gesture.x;
    const dy = y - gesture.y;
    if (gesture.mode === 'pending') {
      if (Math.hypot(dx, dy) < DIRECTION_THRESHOLD) return false;
      // 가로 칩 행·내용 중간에서 시작한 아래 스크롤은 끝까지 원래 영역이 담당한다.
      if (
        Math.abs(dx) >= Math.abs(dy) ||
        (gesture.inBody && ((dy > 0 && !gesture.atTop) || (dy < 0 && stage === 'full'))) ||
        !event.cancelable
      ) {
        gesture.mode = 'native';
        return false;
      }
      // 전체 화면에서는 제목·액션 행에서 쓸어도 본문을 읽을 수 있다.
      gesture.mode =
        !gesture.inBody &&
        !gesture.onHandle &&
        stage === 'full' &&
        (dy < 0 || !gesture.atTop) &&
        gesture.body
          ? 'body'
          : 'sheet';
      window.getSelection()?.removeAllRanges();
    }
    gesture.offset = dy;
    event.preventDefault();
    // ScrollArea의 마우스 드래그와 뒤 하늘 뷰가 같은 이동을 처리하지 않게 한다.
    event.stopPropagation();
    if (gesture.mode === 'body' && gesture.body) {
      gesture.body.scrollTop = gesture.scrollStart - dy;
      const now = performance.now();
      gesture.samples.push({ t: now, pos: y });
      while (gesture.samples.length > 1 && now - gesture.samples[0]!.t > 100)
        gesture.samples.shift();
    } else updateMotion({ offset: dy, dragging: true });
    return true;
  };
  const finish = () => {
    if (!gesture) return;
    const completed = gesture;
    gesture = null;
    releaseCapture();
    if (completed.mode !== 'sheet' && completed.mode !== 'body') return;
    clickGuard.current = performance.now() + 500;
    if (completed.mode === 'body' && completed.body) {
      scrollWithInertia(completed.body, velocityFrom(completed.samples, performance.now()));
      return;
    }
    updateMotion({ offset: 0, dragging: false });
    if (completed.offset > SNAP_DISTANCE) {
      if (stage === 'full') setStage('half');
      else close();
    } else if (completed.offset < -SNAP_DISTANCE && stage === 'half') {
      setStage('full');
    }
  };

  const pointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    if (!event.isPrimary || event.button !== 0) {
      cancel();
      return;
    }
    begin(event.pointerId, event.clientX, event.clientY, event.target);
  };
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || gesture?.id !== event.pointerId) return;
    if ((event.buttons & 1) === 0) {
      cancel();
      return;
    }
    if (move(event.clientX, event.clientY, event) && capturedPointer === null) {
      sheet.setPointerCapture(event.pointerId);
      capturedPointer = event.pointerId;
    }
  };
  const pointerUp = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' && gesture?.id === event.pointerId) finish();
  };
  const pointerCancel = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' && gesture?.id === event.pointerId) cancel();
  };
  const touchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || !touch) {
      cancel();
      return;
    }
    begin(touch.identifier, touch.clientX, touch.clientY, event.target);
  };
  const touchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (event.touches.length !== 1 || !touch) {
      cancel();
      return;
    }
    if (gesture?.id === touch.identifier) move(touch.clientX, touch.clientY, event);
  };
  const touchEnd = (event: TouchEvent) => {
    if (event.touches.length === 0) finish();
    else cancel();
  };
  const click = (event: MouseEvent) => {
    // 새 pointerdown은 억제를 해제한다. 드래그 직후 합성 click만 막고 키보드는 허용한다.
    if (event.detail !== 0 && performance.now() < clickGuard.current) {
      clickGuard.current = 0;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  sheet.addEventListener('pointerdown', pointerDown, true);
  // 첫 이동이 시트 밖으로 나가도 추적한다. 탭은 캡처하지 않아 버튼의 클릭을 보존한다.
  window.addEventListener('pointermove', pointerMove, true);
  window.addEventListener('pointerup', pointerUp, true);
  window.addEventListener('pointercancel', pointerCancel, true);
  sheet.addEventListener('lostpointercapture', pointerCancel, true);
  sheet.addEventListener('touchstart', touchStart, { passive: true });
  sheet.addEventListener('touchmove', touchMove, { passive: false, capture: true });
  sheet.addEventListener('touchend', touchEnd);
  sheet.addEventListener('touchcancel', cancel);
  sheet.addEventListener('click', click, true);
  sheet.addEventListener('wheel', stopInertia, { passive: true });
  return () => {
    stopInertia();
    cancel();
    sheet.removeEventListener('pointerdown', pointerDown, true);
    window.removeEventListener('pointermove', pointerMove, true);
    window.removeEventListener('pointerup', pointerUp, true);
    window.removeEventListener('pointercancel', pointerCancel, true);
    sheet.removeEventListener('lostpointercapture', pointerCancel, true);
    sheet.removeEventListener('touchstart', touchStart);
    sheet.removeEventListener('touchmove', touchMove, true);
    sheet.removeEventListener('touchend', touchEnd);
    sheet.removeEventListener('touchcancel', cancel);
    sheet.removeEventListener('click', click, true);
    sheet.removeEventListener('wheel', stopInertia);
  };
}

export function useSheetGesture(stage: Stage, setStage: (stage: Stage) => void, close: () => void) {
  const [motion, setMotion] = useState<Motion>({ offset: 0, dragging: false });
  const clickGuard = useRef(0);
  const ref = useCallback(
    (sheet: HTMLDivElement | null) => {
      if (sheet) return attachSheetGesture(sheet, stage, setStage, close, setMotion, clickGuard);
    },
    [stage, setStage, close],
  );
  return { ref, ...motion };
}
