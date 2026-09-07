import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachDragScroll,
  DRAG_THRESHOLD_PX,
  INERTIA_TAU_MS,
  inertiaStep,
  REST_BEFORE_RELEASE_MS,
  velocityFrom,
} from '@/ui/useDragScroll';

/** jsdom은 레이아웃이 없으므로 스크롤 치수·scrollTop을 직접 흉내 낸다 */
function makeScroller(content = 2000, height = 500): HTMLDivElement {
  const el = document.createElement('div');
  let top = 0;
  Object.defineProperty(el, 'clientHeight', { value: height });
  Object.defineProperty(el, 'scrollHeight', { value: content });
  Object.defineProperty(el, 'scrollTop', {
    get: () => top,
    set: (v: number) => {
      top = Math.max(0, Math.min(content - height, v));
    },
  });
  document.body.appendChild(el);
  return el;
}

function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  init: PointerEventInit,
): PointerEvent {
  const e = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    ...init,
  });
  target.dispatchEvent(e);
  return e;
}

let clock = 1000;
let detach: (() => void) | null = null;

afterEach(() => {
  detach?.();
  detach = null;
  document.body.innerHTML = '';
});

function setup(content?: number, height?: number) {
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const el = makeScroller(content, height);
  const button = document.createElement('button');
  button.textContent = 'tap';
  el.appendChild(button);
  const clicked = vi.fn();
  button.addEventListener('click', clicked);
  detach = attachDragScroll(el);
  return { el, button, clicked };
}

/** 임계값을 넘겨 축을 고정하고 이어서 120px 더 끄는 표준 드래그(끝은 놓지 않음) */
function dragDown(target: Element, from = 400): void {
  pointer(target, 'pointerdown', { clientX: 100, clientY: from });
  pointer(target, 'pointermove', { clientX: 100, clientY: from - DRAG_THRESHOLD_PX - 1 });
  clock += 16;
  pointer(target, 'pointermove', { clientX: 100, clientY: from - DRAG_THRESHOLD_PX - 1 - 120 });
}

describe('attachDragScroll: 마우스 드래그 스크롤', () => {
  it('임계값(6px)을 넘겨 끌면 scrollTop이 따라오고, 끌다 놓은 자리의 click은 삼킨다', () => {
    const { el, button, clicked } = setup();
    pointer(button, 'pointerdown', { clientX: 100, clientY: 400 });
    pointer(button, 'pointermove', { clientX: 100, clientY: 397 }); // 3px: 아직 아님
    expect(el.scrollTop).toBe(0);
    expect(el.getAttribute('data-drag-scrolling')).toBeNull();
    pointer(button, 'pointermove', { clientX: 100, clientY: 400 - DRAG_THRESHOLD_PX - 1 }); // 축 결정
    expect(el.getAttribute('data-drag-scrolling')).toBe('1');
    expect(el.style.userSelect).toBe('none');
    clock += 16;
    pointer(button, 'pointermove', { clientX: 100, clientY: 400 - DRAG_THRESHOLD_PX - 1 - 120 });
    expect(el.scrollTop).toBe(120);
    clock += 16;
    pointer(button, 'pointerup', { clientX: 100, clientY: 273 });
    expect(el.getAttribute('data-drag-scrolling')).toBeNull();
    expect(el.style.userSelect).toBe('');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).not.toHaveBeenCalled();
    clock += 300;
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('임계값 미만의 움직임은 스크롤하지 않고 click도 정상', () => {
    const { el, button, clicked } = setup();
    pointer(button, 'pointerdown', { clientX: 100, clientY: 400 });
    pointer(button, 'pointermove', { clientX: 102, clientY: 397 });
    pointer(button, 'pointerup', { clientX: 102, clientY: 397 });
    expect(el.scrollTop).toBe(0);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('터치·펜 포인터는 건드리지 않는다(네이티브 스크롤)', () => {
    const { el, button } = setup();
    for (const pointerType of ['touch', 'pen']) {
      pointer(button, 'pointerdown', { clientX: 100, clientY: 400, pointerType });
      pointer(button, 'pointermove', { clientX: 100, clientY: 380, pointerType });
      pointer(button, 'pointermove', { clientX: 100, clientY: 200, pointerType });
      // 놓기 전에 확인해야 의미가 있다(놓으면 endDrag가 상태를 되돌린다)
      expect(el.getAttribute('data-drag-scrolling')).toBeNull();
      expect(el.style.userSelect).toBe('');
      expect(el.scrollTop).toBe(0);
      pointer(button, 'pointerup', { clientX: 100, clientY: 200, pointerType });
    }
  });

  it('입력 요소·data-drag-scroll="off"·touch-action:none 영역에서 시작한 드래그는 무시한다', () => {
    const { el } = setup();
    const input = document.createElement('input');
    input.type = 'range';
    el.appendChild(input);
    const ring = document.createElement('div');
    ring.setAttribute('data-drag-scroll', 'off');
    const inner = document.createElement('span');
    ring.appendChild(inner);
    el.appendChild(ring);
    const canvasLike = document.createElement('div');
    canvasLike.style.touchAction = 'none'; // SkyRangePicker의 `touch-none`과 같은 계산값
    const handle = document.createElement('span');
    canvasLike.appendChild(handle);
    el.appendChild(canvasLike);
    expect(getComputedStyle(canvasLike).touchAction).toBe('none');
    for (const target of [input, inner, handle]) {
      dragDown(target);
      expect(el.getAttribute('data-drag-scrolling')).toBeNull();
      expect(el.scrollTop).toBe(0);
      pointer(target, 'pointerup', { clientX: 100, clientY: 200 });
    }
  });

  it('스크롤할 내용이 없으면 드래그 상태로 들어가지 않는다', () => {
    const { el, button } = setup(400, 500);
    dragDown(button);
    expect(el.getAttribute('data-drag-scrolling')).toBeNull();
    expect(el.style.userSelect).toBe('');
  });

  it('가로로 끌면 가장 가까운 가로 스크롤러(칩 행)를 움직인다', () => {
    const { el } = setup();
    const row = document.createElement('div');
    row.style.overflowX = 'auto';
    let left = 0;
    Object.defineProperty(row, 'clientWidth', { value: 300 });
    Object.defineProperty(row, 'scrollWidth', { value: 900 });
    Object.defineProperty(row, 'scrollLeft', {
      get: () => left,
      set: (v: number) => {
        left = Math.max(0, Math.min(600, v));
      },
    });
    const chip = document.createElement('button');
    row.appendChild(chip);
    el.appendChild(row);
    pointer(chip, 'pointerdown', { clientX: 200, clientY: 400 });
    pointer(chip, 'pointermove', { clientX: 190, clientY: 401 }); // 가로 축
    clock += 16;
    pointer(chip, 'pointermove', { clientX: 140, clientY: 401 });
    expect(row.scrollLeft).toBe(50);
    expect(el.scrollTop).toBe(0);
    pointer(chip, 'pointerup', { clientX: 140, clientY: 401 });
  });

  it('pointerup을 놓쳤으면(버튼 뗀 채 움직임) 유령 드래그 없이 상태를 푼다', () => {
    const { el, button, clicked } = setup();
    dragDown(button);
    expect(el.getAttribute('data-drag-scrolling')).toBe('1');
    const before = el.scrollTop;
    // 고정 요소 위에서 놓아 pointerup이 컨테이너에 오지 않은 뒤, 버튼 없이 hover 이동
    pointer(button, 'pointermove', { clientX: 100, clientY: 100, buttons: 0 });
    expect(el.getAttribute('data-drag-scrolling')).toBeNull();
    expect(el.style.userSelect).toBe('');
    expect(el.scrollTop).toBe(before);
    pointer(button, 'pointermove', { clientX: 100, clientY: 50, buttons: 0 });
    expect(el.scrollTop).toBe(before);
    clock += 300;
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('새 pointerdown은 이전 드래그 상태를 초기화한다', () => {
    const { el, button } = setup();
    dragDown(button);
    expect(el.getAttribute('data-drag-scrolling')).toBe('1');
    pointer(button, 'pointerdown', { clientX: 100, clientY: 300 });
    expect(el.getAttribute('data-drag-scrolling')).toBeNull();
    expect(el.style.userSelect).toBe('');
  });

  it('놓으면 최근 100ms 속도로 관성 스크롤이 이어진다 · 휠·새 pointerdown이면 멈춘다', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const { el, button } = setup(5000, 500);
    pointer(button, 'pointerdown', { clientX: 100, clientY: 400 });
    pointer(button, 'pointermove', { clientX: 100, clientY: 380 });
    for (let i = 1; i <= 5; i++) {
      clock += 16;
      pointer(button, 'pointermove', { clientX: 100, clientY: 380 - i * 16 }); // 1 px/ms 위로
    }
    const before = el.scrollTop;
    pointer(button, 'pointerup', { clientX: 100, clientY: 300 });
    expect(frames.length).toBe(1);
    clock += 16;
    frames.shift()!(clock);
    expect(el.scrollTop).toBeGreaterThan(before);
    expect(frames.length).toBe(1); // 다음 프레임 예약
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    el.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    expect(cancel).toHaveBeenCalledTimes(1);
    frames.length = 0; // 취소된 프레임은 버린다
    // 관성 중 새 pointerdown도 취소한다
    pointer(button, 'pointerdown', { clientX: 100, clientY: 400 });
    pointer(button, 'pointermove', { clientX: 100, clientY: 380 });
    for (let i = 1; i <= 3; i++) {
      clock += 16;
      pointer(button, 'pointermove', { clientX: 100, clientY: 380 - i * 16 });
    }
    pointer(button, 'pointerup', { clientX: 100, clientY: 332 });
    expect(frames.length).toBe(1);
    pointer(button, 'pointerdown', { clientX: 100, clientY: 400 });
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('놓기 전 80ms 이상 멈춰 있었으면 관성이 없다', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const { el, button } = setup(5000, 500);
    pointer(button, 'pointerdown', { clientX: 100, clientY: 400 });
    pointer(button, 'pointermove', { clientX: 100, clientY: 380 });
    for (let i = 1; i <= 5; i++) {
      clock += 16;
      pointer(button, 'pointermove', { clientX: 100, clientY: 380 - i * 16 });
    }
    clock += REST_BEFORE_RELEASE_MS + 20; // 잠깐 멈춤
    const before = el.scrollTop;
    pointer(button, 'pointerup', { clientX: 100, clientY: 300 });
    expect(frames.length).toBe(0);
    expect(el.scrollTop).toBe(before);
  });
});

describe('관성 수학', () => {
  it('inertiaStep: 위치는 v·τ·(1−e^(−dt/τ))만큼, 속도는 e^(−dt/τ)배', () => {
    const r = inertiaStep(1000, 1, 100);
    const decay = Math.exp(-100 / INERTIA_TAU_MS);
    expect(r.pos).toBeCloseTo(1000 - INERTIA_TAU_MS * (1 - decay), 6);
    expect(r.velocity).toBeCloseTo(decay, 6);
    expect(inertiaStep(50, 0, 16).pos).toBe(50);
  });
  it('velocityFrom: 샘플 2개 이상일 때만, 같은 시각이면 0, 오래된 샘플이면 0', () => {
    expect(velocityFrom([])).toBe(0);
    expect(velocityFrom([{ t: 0, pos: 0 }])).toBe(0);
    expect(velocityFrom([{ t: 0, pos: 0 }, { t: 0, pos: 10 }])).toBe(0);
    expect(velocityFrom([{ t: 0, pos: 100 }, { t: 50, pos: 0 }])).toBe(-2);
    expect(velocityFrom([{ t: 0, pos: 100 }, { t: 50, pos: 0 }], 50 + REST_BEFORE_RELEASE_MS)).toBe(-2);
    expect(velocityFrom([{ t: 0, pos: 100 }, { t: 50, pos: 0 }], 50 + REST_BEFORE_RELEASE_MS + 1)).toBe(0);
  });
});
