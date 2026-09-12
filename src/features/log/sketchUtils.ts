/**
 * 스케치 캔버스의 순수 함수(task-04 §3.5). DOM에 의존하지 않는 부분(좌표 변환·원형 판정·경로 생성·렌더 순서)은
 * Vitest로 검증하고, 캔버스 API가 필요한 부분(`canvasToBlob`·`makeThumbnail`)은 브라우저 전용 헬퍼로 따로 둔다.
 *
 * 좌표계: 스케치 내부 해상도는 항상 SKETCH_SIZE×SKETCH_SIZE(800) 정사각. 화면 캔버스는 devicePixelRatio를 반영해
 * 더 크거나 작게 잡고 `ctx.setTransform(scale)`로 내부 좌표를 그대로 쓴다.
 */

export const SKETCH_SIZE = 800;
export const THUMB_SIZE = 160;
/** 원형 시야 반지름: 캔버스 가장자리에서 살짝 안쪽(링이 잘리지 않게) */
export const FIELD_INSET = 4;
/** 이보다 가까운 점은 버린다(내부 px) — 떨림 억제 + 경로 길이 절약 */
export const MIN_POINT_DIST = 1.5;

export type PenColor =
  'white' | 'gray' | 'blueWhite' | 'blue' | 'yellowWhite' | 'yellow' | 'orange' | 'red';
export type PenWidth = 'thin' | 'medium' | 'thick';
export type StrokeTool = 'pen' | 'eraser';

/** 내부 좌표(0..SKETCH_SIZE) */
export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  tool: StrokeTool;
  color: PenColor;
  width: PenWidth;
  points: Point[];
}

/** 펜 색(시야는 항상 #000 — 야간 모드와 무관하게 접안렌즈 안 느낌을 유지) */
export const PEN_COLORS: Record<PenColor, string> = {
  white: '#ffffff',
  gray: '#9aa3b5',
  blueWhite: '#c7dcff',
  blue: '#78a7ff',
  yellowWhite: '#fff3c5',
  yellow: '#ffe066',
  orange: '#ffa05c',
  red: '#ff6666',
};
/** 굵기(내부 px, 800 기준) */
export const PEN_WIDTH_PX: Record<PenWidth, number> = { thin: 3, medium: 6, thick: 12 };
/** 지우개는 검은 붓: 배경(이어 그리기 이미지)까지 함께 지워져 "검은 시야로 되돌리기"가 된다 */
export const ERASER_WIDTH_PX = 28;
export const FIELD_COLOR = '#000000';

export const PEN_COLOR_LIST: readonly PenColor[] = [
  'white',
  'gray',
  'blueWhite',
  'blue',
  'yellowWhite',
  'yellow',
  'orange',
  'red',
];
export const PEN_WIDTH_LIST: readonly PenWidth[] = ['thin', 'medium', 'thick'];

/* ------------------------------------------------------------------ 좌표 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** CSS px(클라이언트 좌표) → 내부 px. 캔버스 CSS 크기가 정사각이 아니어도 각 축을 따로 환산한다. */
export function toCanvasPoint(
  clientX: number,
  clientY: number,
  rect: Rect,
  size = SKETCH_SIZE,
): Point {
  const sx = rect.width > 0 ? size / rect.width : 0;
  const sy = rect.height > 0 ? size / rect.height : 0;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

/** 시야 원의 중심·반지름 */
export function fieldCircle(
  size = SKETCH_SIZE,
  inset = FIELD_INSET,
): { cx: number; cy: number; r: number } {
  const c = size / 2;
  return { cx: c, cy: c, r: Math.max(0, c - inset) };
}

/** 점이 시야 원 안(경계 포함)에 있는가. `margin`>0이면 그만큼 안쪽으로 좁혀 판정한다. */
export function insideCircle(p: Point, size = SKETCH_SIZE, margin = 0): boolean {
  const { cx, cy, r } = fieldCircle(size);
  const rr = r - margin;
  if (rr < 0) return false;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return dx * dx + dy * dy <= rr * rr;
}

/** 마지막 점과 충분히 떨어졌을 때만 추가한다. 추가했으면 true. (배열을 제자리에서 바꾼다) */
export function appendPoint(points: Point[], p: Point, minDist = MIN_POINT_DIST): boolean {
  const last = points[points.length - 1];
  if (last) {
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    if (dx * dx + dy * dy < minDist * minDist) return false;
  }
  points.push(p);
  return true;
}

/* ------------------------------------------------------------------ 스트로크 */

export function strokeWidthPx(stroke: Pick<Stroke, 'tool' | 'width'>): number {
  return stroke.tool === 'eraser' ? ERASER_WIDTH_PX : PEN_WIDTH_PX[stroke.width];
}

export function strokeColor(stroke: Pick<Stroke, 'tool' | 'color'>): string {
  return stroke.tool === 'eraser' ? FIELD_COLOR : PEN_COLORS[stroke.color];
}

/** 마지막 스트로크 제거(실행 취소). 새 배열을 돌려준다. */
export function undoStroke(strokes: readonly Stroke[]): Stroke[] {
  return strokes.slice(0, -1);
}

export type PathCommand =
  | { type: 'moveTo'; x: number; y: number }
  | { type: 'lineTo'; x: number; y: number }
  | { type: 'quadraticCurveTo'; cpx: number; cpy: number; x: number; y: number };

/**
 * 점열 → 부드러운 경로 명령. 이웃 점의 중점을 끝점, 원래 점을 제어점으로 하는 quadratic 곡선 연결.
 * - 0점: 빈 배열 · 1점: moveTo+lineTo(같은 점 — round cap이 점을 찍는다) · 2점: 직선
 * - n≥3: moveTo p0 → 첫 중점까지 직선 → 중간 점마다 quadraticCurveTo(p_i, mid(p_i, p_{i+1})) → 마지막 점까지 직선
 */
export function smoothStroke(points: readonly Point[]): PathCommand[] {
  const first = points[0];
  if (!first) return [];
  const n = points.length;
  if (n === 1)
    return [
      { type: 'moveTo', ...first },
      { type: 'lineTo', ...first },
    ];
  const last = points[n - 1] as Point;
  if (n === 2)
    return [
      { type: 'moveTo', ...first },
      { type: 'lineTo', ...last },
    ];
  const cmds: PathCommand[] = [{ type: 'moveTo', x: first.x, y: first.y }];
  const second = points[1] as Point;
  cmds.push({ type: 'lineTo', x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
  for (let i = 1; i < n - 1; i += 1) {
    const p = points[i] as Point;
    const q = points[i + 1] as Point;
    cmds.push({
      type: 'quadraticCurveTo',
      cpx: p.x,
      cpy: p.y,
      x: (p.x + q.x) / 2,
      y: (p.y + q.y) / 2,
    });
  }
  cmds.push({ type: 'lineTo', x: last.x, y: last.y });
  return cmds;
}

/* ------------------------------------------------------------------ 렌더 */

/** 렌더가 쓰는 캔버스 컨텍스트의 최소 계약(테스트에서 vi.fn 목으로 대체) */
export interface SketchContext2D {
  save(): void;
  restore(): void;
  beginPath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  clip(): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  stroke(): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
}

/** 경로 명령을 컨텍스트에 그대로 옮긴다(beginPath/stroke는 호출자 몫) */
export function tracePath(ctx: SketchContext2D, cmds: readonly PathCommand[]): void {
  for (const c of cmds) {
    if (c.type === 'moveTo') ctx.moveTo(c.x, c.y);
    else if (c.type === 'lineTo') ctx.lineTo(c.x, c.y);
    else ctx.quadraticCurveTo(c.cpx, c.cpy, c.x, c.y);
  }
}

/** 시야 원으로 클립(save 없이 — 호출자가 save/restore로 감싼다) */
export function clipToCircle(ctx: SketchContext2D, size = SKETCH_SIZE): void {
  const { cx, cy, r } = fieldCircle(size);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
}

/** 스트로크 하나: beginPath → 경로 → stroke. 빈 점열은 아무것도 그리지 않는다. */
export function drawStroke(ctx: SketchContext2D, stroke: Stroke): void {
  if (stroke.points.length === 0) return;
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = strokeWidthPx(stroke);
  ctx.strokeStyle = strokeColor(stroke);
  tracePath(ctx, smoothStroke(stroke.points));
  ctx.stroke();
}

export interface RenderOptions {
  /** 이어 그리기: 기존 스케치 이미지를 검은 시야 위, 스트로크 아래에 깐다 */
  background?: CanvasImageSource | null;
}

/**
 * 전체 재그리기: 지우기 → 원형 클립 → 검은 시야 → (배경) → 스트로크 순.
 * 원 밖은 투명으로 남는다(화면에서는 앱 배경이 비치고, 저장 PNG는 투명).
 * `ctx`는 내부 좌표(size)로 그리도록 변환이 잡혀 있어야 한다.
 */
export function renderStrokes(
  ctx: SketchContext2D,
  strokes: readonly Stroke[],
  size = SKETCH_SIZE,
  opts: RenderOptions = {},
): void {
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  clipToCircle(ctx, size);
  ctx.fillStyle = FIELD_COLOR;
  ctx.fillRect(0, 0, size, size);
  if (opts.background) ctx.drawImage(opts.background, 0, 0, size, size);
  for (const s of strokes) drawStroke(ctx, s);
  ctx.restore();
}

/* ------------------------------------------------------------------ 썸네일 */

/** 긴 변이 `maxSide` 이하가 되도록 줄인 크기(확대는 안 함) */
export function thumbnailSize(
  width: number,
  height: number,
  maxSide = THUMB_SIZE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxSide / longest);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/* ---------------------------------------------- 브라우저 전용(테스트 제외) */

/** `canvas.toBlob`을 Promise로. null이면 거부한다. */
export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, type);
  });
}

/** Blob → 그릴 수 있는 이미지(createImageBitmap 우선, 없으면 <img>) */
export async function loadImageSource(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image decode failed'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sourceSize(src: CanvasImageSource): { width: number; height: number } {
  if (src instanceof HTMLImageElement)
    return { width: src.naturalWidth, height: src.naturalHeight };
  if ('width' in src && 'height' in src) {
    const w = src.width;
    const h = src.height;
    return {
      width: typeof w === 'number' ? w : w.baseVal.value,
      height: typeof h === 'number' ? h : h.baseVal.value,
    };
  }
  return { width: SKETCH_SIZE, height: SKETCH_SIZE };
}

/** 긴 변 ≤ maxSide PNG 썸네일. 캔버스·비트맵·Blob 어느 것이든 받는다. */
export async function makeThumbnail(
  source: HTMLCanvasElement | ImageBitmap | Blob,
  maxSide = THUMB_SIZE,
): Promise<Blob> {
  const img: CanvasImageSource = source instanceof Blob ? await loadImageSource(source) : source;
  const { width, height } = sourceSize(img);
  const dim = thumbnailSize(width || SKETCH_SIZE, height || SKETCH_SIZE, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = dim.width;
  canvas.height = dim.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.drawImage(img, 0, 0, dim.width, dim.height);
  return canvasToBlob(canvas);
}
