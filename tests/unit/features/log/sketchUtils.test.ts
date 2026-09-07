import { describe, expect, it, vi } from 'vitest';
import {
  appendPoint,
  drawStroke,
  ERASER_WIDTH_PX,
  FIELD_COLOR,
  fieldCircle,
  FIELD_INSET,
  insideCircle,
  MIN_POINT_DIST,
  PEN_COLORS,
  PEN_WIDTH_PX,
  renderStrokes,
  SKETCH_SIZE,
  smoothStroke,
  strokeColor,
  strokeWidthPx,
  thumbnailSize,
  toCanvasPoint,
  tracePath,
  undoStroke,
  type PathCommand,
  type Point,
  type SketchContext2D,
  type Stroke,
} from '@/features/log/sketchUtils';

/** vi.fn 목 컨텍스트 — 호출 순서를 `calls`에 메서드 이름으로 기록한다 */
function mockContext(): { ctx: SketchContext2D; calls: string[] } {
  const calls: string[] = [];
  const rec = (name: string) =>
    vi.fn((..._args: unknown[]) => {
      calls.push(name);
    });
  const ctx: SketchContext2D = {
    save: rec('save'),
    restore: rec('restore'),
    beginPath: rec('beginPath'),
    arc: rec('arc'),
    clip: rec('clip'),
    clearRect: rec('clearRect'),
    fillRect: rec('fillRect'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    quadraticCurveTo: rec('quadraticCurveTo'),
    stroke: rec('stroke'),
    drawImage: rec('drawImage'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  };
  return { ctx, calls };
}

function stroke(points: Point[], over: Partial<Omit<Stroke, 'points'>> = {}): Stroke {
  return { tool: 'pen', color: 'white', width: 'medium', points, ...over };
}

describe('toCanvasPoint — CSS px → 내부 px', () => {
  it('정사각 캔버스: 비율 환산 + 좌상단 오프셋 제거', () => {
    const rect = { left: 10, top: 20, width: 400, height: 400 };
    expect(toCanvasPoint(10, 20, rect)).toEqual({ x: 0, y: 0 });
    expect(toCanvasPoint(210, 220, rect)).toEqual({ x: 400, y: 400 });
    expect(toCanvasPoint(410, 420, rect)).toEqual({ x: 800, y: 800 });
  });

  it('축별로 따로 환산하고, 0 크기면 0을 돌려준다(NaN 없음)', () => {
    const p = toCanvasPoint(150, 60, { left: 100, top: 50, width: 200, height: 100 }, 800);
    expect(p).toEqual({ x: 200, y: 80 });
    const zero = toCanvasPoint(5, 5, { left: 0, top: 0, width: 0, height: 0 });
    expect(zero).toEqual({ x: 0, y: 0 });
  });
});

describe('insideCircle — 원형 시야 판정', () => {
  const { cx, cy, r } = fieldCircle();

  it('반지름은 절반에서 inset만큼 안쪽', () => {
    expect(cx).toBe(SKETCH_SIZE / 2);
    expect(cy).toBe(SKETCH_SIZE / 2);
    expect(r).toBe(SKETCH_SIZE / 2 - FIELD_INSET);
  });

  it('중심·경계 안은 true, 모서리·경계 밖은 false', () => {
    expect(insideCircle({ x: cx, y: cy })).toBe(true);
    expect(insideCircle({ x: cx + r, y: cy })).toBe(true);
    expect(insideCircle({ x: cx + r + 0.5, y: cy })).toBe(false);
    expect(insideCircle({ x: 0, y: 0 })).toBe(false);
    expect(insideCircle({ x: SKETCH_SIZE, y: SKETCH_SIZE })).toBe(false);
  });

  it('margin으로 안쪽으로 좁힌다', () => {
    expect(insideCircle({ x: cx + r - 5, y: cy }, SKETCH_SIZE, 10)).toBe(false);
    expect(insideCircle({ x: cx + r - 15, y: cy }, SKETCH_SIZE, 10)).toBe(true);
    expect(insideCircle({ x: cx, y: cy }, SKETCH_SIZE, r + 1)).toBe(false);
  });
});

describe('appendPoint — 가까운 점 버리기', () => {
  it('첫 점은 항상 추가, 이후는 MIN_POINT_DIST 이상 떨어져야 추가', () => {
    const pts: Point[] = [];
    expect(appendPoint(pts, { x: 100, y: 100 })).toBe(true);
    expect(appendPoint(pts, { x: 100 + MIN_POINT_DIST / 2, y: 100 })).toBe(false);
    expect(appendPoint(pts, { x: 100 + MIN_POINT_DIST, y: 100 })).toBe(true);
    expect(pts).toHaveLength(2);
  });
});

describe('smoothStroke — 이웃 중점 quadratic 경로', () => {
  it('0점 → 빈 배열', () => {
    expect(smoothStroke([])).toEqual([]);
  });

  it('1점 → 같은 점으로 moveTo+lineTo(round cap 점)', () => {
    expect(smoothStroke([{ x: 3, y: 4 }])).toEqual([
      { type: 'moveTo', x: 3, y: 4 },
      { type: 'lineTo', x: 3, y: 4 },
    ]);
  });

  it('2점 → 직선', () => {
    expect(
      smoothStroke([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toEqual([
      { type: 'moveTo', x: 0, y: 0 },
      { type: 'lineTo', x: 10, y: 0 },
    ]);
  });

  it('n점(n≥3) → moveTo 1 + lineTo 2 + quadraticCurveTo (n-2), 제어점은 원래 점·끝점은 중점', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
      { x: 40, y: 0 },
    ];
    const cmds = smoothStroke(pts);
    const count = (t: PathCommand['type']) => cmds.filter((c) => c.type === t).length;
    expect(cmds[0]).toEqual({ type: 'moveTo', x: 0, y: 0 });
    expect(count('moveTo')).toBe(1);
    expect(count('quadraticCurveTo')).toBe(pts.length - 2);
    expect(count('lineTo')).toBe(2);
    expect(cmds[1]).toEqual({ type: 'lineTo', x: 5, y: 0 });
    expect(cmds[2]).toEqual({ type: 'quadraticCurveTo', cpx: 10, cpy: 0, x: 15, y: 5 });
    expect(cmds[cmds.length - 1]).toEqual({ type: 'lineTo', x: 40, y: 0 });
    expect(cmds).toHaveLength(pts.length + 1);
  });

  it('tracePath는 명령을 그대로 컨텍스트에 옮긴다', () => {
    const { ctx, calls } = mockContext();
    tracePath(ctx, [
      { type: 'moveTo', x: 1, y: 2 },
      { type: 'quadraticCurveTo', cpx: 3, cpy: 4, x: 5, y: 6 },
      { type: 'lineTo', x: 7, y: 8 },
    ]);
    expect(calls).toEqual(['moveTo', 'quadraticCurveTo', 'lineTo']);
    expect(ctx.moveTo).toHaveBeenCalledWith(1, 2);
    expect(ctx.quadraticCurveTo).toHaveBeenCalledWith(3, 4, 5, 6);
    expect(ctx.lineTo).toHaveBeenCalledWith(7, 8);
  });
});

describe('스트로크 속성', () => {
  it('굵기 3단계 오름차순, 지우개는 더 굵고 검은색', () => {
    expect(PEN_WIDTH_PX.thin).toBeLessThan(PEN_WIDTH_PX.medium);
    expect(PEN_WIDTH_PX.medium).toBeLessThan(PEN_WIDTH_PX.thick);
    expect(strokeWidthPx({ tool: 'pen', width: 'thick' })).toBe(PEN_WIDTH_PX.thick);
    expect(strokeWidthPx({ tool: 'eraser', width: 'thin' })).toBe(ERASER_WIDTH_PX);
    expect(strokeColor({ tool: 'pen', color: 'gray' })).toBe(PEN_COLORS.gray);
    expect(strokeColor({ tool: 'eraser', color: 'white' })).toBe(FIELD_COLOR);
  });

  it('undoStroke는 마지막 하나만 빼고 원본은 두지 않는다(새 배열)', () => {
    const a = stroke([{ x: 1, y: 1 }]);
    const b = stroke([{ x: 2, y: 2 }]);
    const c = stroke([{ x: 3, y: 3 }]);
    const list = [a, b, c];
    const after = undoStroke(list);
    expect(after).toHaveLength(2);
    expect(after).toEqual([a, b]);
    expect(list).toHaveLength(3);
    expect(undoStroke(after)).toHaveLength(1);
    expect(undoStroke([])).toEqual([]);
  });
});

describe('renderStrokes — 목 컨텍스트 호출 순서', () => {
  it('save → clear → 원형 클립 → 검은 시야 → 스트로크(beginPath/moveTo/quadraticCurveTo/stroke) → restore', () => {
    const { ctx, calls } = mockContext();
    const s = stroke([
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      { x: 300, y: 100 },
    ]);
    renderStrokes(ctx, [s], SKETCH_SIZE);

    expect(calls[0]).toBe('save');
    expect(calls[calls.length - 1]).toBe('restore');
    const idx = (name: string) => calls.indexOf(name);
    expect(idx('clearRect')).toBeLessThan(idx('arc'));
    expect(idx('arc')).toBeLessThan(idx('clip'));
    expect(idx('clip')).toBeLessThan(idx('fillRect'));
    expect(idx('fillRect')).toBeLessThan(idx('moveTo'));
    // 스트로크 구간
    const strokeSeq = calls.slice(idx('fillRect') + 1, calls.length - 1);
    expect(strokeSeq).toEqual([
      'beginPath',
      'moveTo',
      'lineTo',
      'quadraticCurveTo',
      'lineTo',
      'stroke',
    ]);
    expect(ctx.arc).toHaveBeenCalledWith(
      SKETCH_SIZE / 2,
      SKETCH_SIZE / 2,
      SKETCH_SIZE / 2 - FIELD_INSET,
      0,
      Math.PI * 2,
    );
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, SKETCH_SIZE, SKETCH_SIZE);
    expect(ctx.fillStyle).toBe(FIELD_COLOR);
    expect(ctx.strokeStyle).toBe(PEN_COLORS.white);
    expect(ctx.lineWidth).toBe(PEN_WIDTH_PX.medium);
    expect(ctx.lineCap).toBe('round');
    expect(ctx.lineJoin).toBe('round');
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('배경이 있으면 시야 채운 뒤·스트로크 전에 drawImage, 스트로크마다 stroke 1회', () => {
    const { ctx, calls } = mockContext();
    const background = {} as unknown as CanvasImageSource;
    const strokes = [
      stroke([{ x: 10, y: 10 }]),
      stroke(
        [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
        ],
        { tool: 'eraser' },
      ),
      stroke([], { color: 'gray' }),
    ];
    renderStrokes(ctx, strokes, SKETCH_SIZE, { background });
    const fill = calls.indexOf('fillRect');
    const img = calls.indexOf('drawImage');
    const firstStroke = calls.indexOf('beginPath', fill);
    expect(img).toBeGreaterThan(fill);
    expect(img).toBeLessThan(firstStroke);
    expect(ctx.drawImage).toHaveBeenCalledWith(background, 0, 0, SKETCH_SIZE, SKETCH_SIZE);
    // 빈 점열 스트로크는 그리지 않는다
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    // 마지막으로 그린 스트로크(지우개)의 스타일이 남는다
    expect(ctx.strokeStyle).toBe(FIELD_COLOR);
    expect(ctx.lineWidth).toBe(ERASER_WIDTH_PX);
  });

  it('undo 뒤 다시 그리면 stroke 호출 수가 줄어든다', () => {
    const strokes = [stroke([{ x: 1, y: 1 }]), stroke([{ x: 2, y: 2 }]), stroke([{ x: 3, y: 3 }])];
    const before = mockContext();
    renderStrokes(before.ctx, strokes);
    expect(before.ctx.stroke).toHaveBeenCalledTimes(3);

    const after = mockContext();
    renderStrokes(after.ctx, undoStroke(strokes));
    expect(after.ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it('drawStroke는 빈 점열이면 아무 호출도 하지 않는다', () => {
    const { ctx, calls } = mockContext();
    drawStroke(ctx, stroke([]));
    expect(calls).toEqual([]);
  });
});

describe('thumbnailSize — 긴 변 ≤ max, 확대 없음', () => {
  it('정사각 800 → 160', () => {
    expect(thumbnailSize(800, 800, 160)).toEqual({ width: 160, height: 160 });
  });
  it('가로로 긴 이미지는 가로가 max, 세로는 비율 유지', () => {
    expect(thumbnailSize(1600, 800, 160)).toEqual({ width: 160, height: 80 });
  });
  it('이미 작으면 그대로, 0이면 0', () => {
    expect(thumbnailSize(100, 50, 160)).toEqual({ width: 100, height: 50 });
    expect(thumbnailSize(0, 0, 160)).toEqual({ width: 0, height: 0 });
  });
});
