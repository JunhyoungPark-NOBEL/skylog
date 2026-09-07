import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SVGProps,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  appendPoint,
  canvasToBlob,
  clipToCircle,
  drawStroke,
  FIELD_INSET,
  insideCircle,
  loadImageSource,
  makeThumbnail,
  PEN_COLOR_LIST,
  PEN_COLORS,
  PEN_WIDTH_LIST,
  renderStrokes,
  SKETCH_SIZE,
  THUMB_SIZE,
  toCanvasPoint,
  undoStroke,
  type PenColor,
  type PenWidth,
  type Stroke,
  type StrokeTool,
} from '@/features/log/sketchUtils';
import type { SketchCanvasProps } from '@/features/log/types';
import { PillButton } from '@/ui/PillButton';
import { Toggle } from '@/ui/Toggle';

/**
 * 스케치 캔버스(task-04 §3.5): 검은 원형 시야 안에 흰/회색 펜·굵기 3단계·지우개·실행 취소·전체 지우기.
 *
 * 렌더 구조
 * - 화면 캔버스는 짧은 변 기준 정사각, devicePixelRatio를 곱한 픽셀 크기. 내부 좌표는 항상 800×800(`SKETCH_SIZE`).
 * - 확정된 스트로크(+이어 그리기 배경)는 오프스크린 "committed" 레이어에 그려 두고, 포인터 이동마다
 *   committed → 화면 복사 + 지금 긋는 스트로크만 위에 그린다(rAF로 묶음). 되돌리기·전체 지우기·크기 변경은 전체 재그리기.
 * - 저장은 800×800 오프스크린에 `renderStrokes`로 다시 그려 PNG + 160px 썸네일을 만든다.
 *
 * 부모(기록 폼)가 `fixed inset-0 z-50 bg-bg`로 감싼다고 가정하되 루트도 스스로 화면을 채운다.
 */

const TOOL_BTN =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-fg transition-[background-color,color,transform] duration-150 ease-standard active:scale-95 disabled:opacity-40 disabled:active:scale-100 aria-pressed:bg-accent-soft aria-pressed:text-accent';

/** 굵기 버튼의 점 지름(화면 px) */
const WIDTH_DOT_PX: Record<PenWidth, number> = { thin: 5, medium: 8, thick: 12 };

/** 오프스크린 레이어를 (재)사용: 없으면 만들고, 픽셀 크기가 다르면 맞춘다(크기 변경은 내용을 지운다) */
function sizedLayer(existing: HTMLCanvasElement | null, px: number): HTMLCanvasElement {
  const layer = existing ?? document.createElement('canvas');
  if (layer.width !== px || layer.height !== px) {
    layer.width = px;
    layer.height = px;
  }
  return layer;
}

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function iconBase({ size = 22, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

function IconUndo(p: IconProps) {
  return (
    <svg {...iconBase(p)}>
      <path d="M8.5 7.5 4.5 11.5l4 4" />
      <path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-3" />
    </svg>
  );
}

function IconEraser(p: IconProps) {
  return (
    <svg {...iconBase(p)}>
      <path d="m4 15 8.5-8.5a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 19H8l-4-4Z" />
      <path d="m9 10 5 5" />
      <path d="M12 19h8" />
    </svg>
  );
}

export function SketchCanvas({ initial, objectId, title, onSave, onCancel }: SketchCanvasProps) {
  const { t } = useTranslation();

  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const bgRef = useRef<ImageBitmap | HTMLImageElement | null>(null);
  const rafRef = useRef(0);

  const [cssSize, setCssSize] = useState(0);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, 3));
  const [strokeCount, setStrokeCount] = useState(0);
  const [hasBg, setHasBg] = useState(false);
  const [bgPending, setBgPending] = useState(Boolean(initial));
  const [bgMissing, setBgMissing] = useState(false);
  const [color, setColor] = useState<PenColor>('white');
  const [width, setWidth] = useState<PenWidth>('medium');
  const [tool, setTool] = useState<StrokeTool>('pen');
  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveRetry, setSaveRetry] = useState(false);

  const pxSize = Math.max(1, Math.round(cssSize * dpr));
  const hasContent = strokeCount > 0 || hasBg;

  /* ---------------------------------------------------------- 그리기 */

  /** committed 레이어 → 화면, 그 위에 지금 긋는 스트로크 */
  const blit = useCallback(() => {
    const canvas = canvasRef.current;
    const off = committedRef.current;
    if (!canvas || !off) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0);
    const cur = currentRef.current;
    if (cur) {
      const k = canvas.width / SKETCH_SIZE;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.save();
      clipToCircle(ctx, SKETCH_SIZE);
      drawStroke(ctx, cur);
      ctx.restore();
    }
  }, []);

  const scheduleBlit = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      blit();
    });
  }, [blit]);

  /** 확정 스트로크 + 배경을 committed 레이어에 전부 다시 그린다 */
  const fullRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const px = canvas.width;
    const off = sizedLayer(committedRef.current, px);
    committedRef.current = off;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    const k = px / SKETCH_SIZE;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    renderStrokes(ctx, strokesRef.current, SKETCH_SIZE, { background: bgRef.current });
    blit();
  }, [blit]);

  /** 스트로크 하나를 확정: committed 레이어에 덧그리기만 한다(전체 재그리기 없음) */
  const commit = useCallback(
    (stroke: Stroke) => {
      strokesRef.current = [...strokesRef.current, stroke];
      const off = committedRef.current;
      const ctx = off?.getContext('2d');
      if (off && ctx) {
        const k = off.width / SKETCH_SIZE;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.save();
        clipToCircle(ctx, SKETCH_SIZE);
        drawStroke(ctx, stroke);
        ctx.restore();
      }
      setStrokeCount(strokesRef.current.length);
      scheduleBlit();
    },
    [scheduleBlit],
  );

  /* ---------------------------------------------------------- 크기·배경 */

  // 짧은 변 기준 정사각 + DPR
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const rect = frame.getBoundingClientRect();
      const style = getComputedStyle(frame);
      const w = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const h = rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setCssSize(Math.max(0, Math.floor(Math.min(w, h))));
      setDpr(Math.min(window.devicePixelRatio || 1, 3));
    };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(frame);
    else window.addEventListener('resize', measure);
    const h = window.setTimeout(measure, 0);
    return () => {
      window.clearTimeout(h);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', measure);
    };
  }, []);

  // 이어 그리기 배경
  useEffect(() => {
    if (!initial) return;
    let alive = true;
    let loaded: ImageBitmap | HTMLImageElement | null = null;
    void loadImageSource(initial)
      .then((img) => {
        if (!alive) {
          if (img instanceof ImageBitmap) img.close();
          return;
        }
        loaded = img;
        bgRef.current = img;
        setHasBg(true);
        setBgPending(false);
        fullRender();
      })
      .catch(() => {
        if (!alive) return;
        setBgMissing(true);
        setBgPending(false);
      });
    return () => {
      alive = false;
      if (bgRef.current === loaded) bgRef.current = null;
      if (loaded instanceof ImageBitmap) loaded.close();
    };
  }, [initial, fullRender]);

  // 픽셀 크기 반영 + 전체 재그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pxSize <= 1) return;
    canvas.width = pxSize;
    canvas.height = pxSize;
    fullRender();
  }, [pxSize, fullRender]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  /* ---------------------------------------------------------- 포인터 */

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const canvas = e.currentTarget;
    const p = toCanvasPoint(e.clientX, e.clientY, canvas.getBoundingClientRect());
    if (!insideCircle(p)) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* 캡처를 지원하지 않는 환경 — move/up은 캔버스 위에서만 받는다 */
    }
    pointerIdRef.current = e.pointerId;
    currentRef.current = { tool, color, width, points: [p] };
    if (confirmClear) setConfirmClear(false);
    if (saveRetry) setSaveRetry(false);
    scheduleBlit();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const cur = currentRef.current;
    if (!cur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const native = e.nativeEvent;
    const coalesced =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const events: readonly PointerEvent[] = coalesced.length > 0 ? coalesced : [native];
    let added = false;
    for (const ev of events) {
      if (appendPoint(cur.points, toCanvasPoint(ev.clientX, ev.clientY, rect))) added = true;
    }
    if (added) scheduleBlit();
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    const cur = currentRef.current;
    currentRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (cur && cur.points.length > 0) commit(cur);
    else scheduleBlit();
  };

  /* ---------------------------------------------------------- 도구 */

  const undo = () => {
    strokesRef.current = undoStroke(strokesRef.current);
    setStrokeCount(strokesRef.current.length);
    fullRender();
  };

  const clearAll = () => {
    strokesRef.current = [];
    const bg = bgRef.current;
    bgRef.current = null;
    if (bg instanceof ImageBitmap) bg.close();
    setHasBg(false);
    setStrokeCount(0);
    setConfirmClear(false);
    fullRender();
  };

  const save = async () => {
    if (saving || !hasContent) return;
    setSaving(true);
    setSaveRetry(false);
    try {
      const off = document.createElement('canvas');
      off.width = SKETCH_SIZE;
      off.height = SKETCH_SIZE;
      const ctx = off.getContext('2d');
      if (!ctx) throw new Error('2d context unavailable');
      renderStrokes(ctx, strokesRef.current, SKETCH_SIZE, { background: bgRef.current });
      const blob = await canvasToBlob(off);
      const thumbnail = await makeThumbnail(off, THUMB_SIZE);
      onSave({ blob, width: SKETCH_SIZE, height: SKETCH_SIZE, thumbnail });
    } catch {
      setSaveRetry(true);
    } finally {
      setSaving(false);
    }
  };

  const heading = title ?? t('sketch.title');
  const ringInset = (FIELD_INSET / SKETCH_SIZE) * cssSize;
  const showHint = !hasContent && !bgPending;

  return (
    <div
      className="flex h-full w-full flex-col bg-bg text-fg"
      data-testid="sketch-canvas"
      aria-label={heading}
    >
      <header className="safe-top flex shrink-0 items-center gap-2 px-3 py-2">
        <PillButton variant="ghost" testId="sketch-cancel" onClick={onCancel}>
          {t('sketch.cancel')}
        </PillButton>
        <h1 className="min-w-0 flex-1 truncate text-center text-title">{heading}</h1>
        <PillButton
          variant="primary"
          testId="sketch-save"
          onClick={() => void save()}
          disabled={!hasContent || saving}
        >
          {saving ? t('sketch.saving') : t('sketch.save')}
        </PillButton>
      </header>

      <div ref={frameRef} className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        <div className="relative" style={{ width: cssSize, height: cssSize }}>
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none select-none"
            data-drag-scroll="off"
            data-testid="sketch-surface"
            role="img"
            aria-label={t('sketch.canvasLabel')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-pill"
            style={{ inset: ringInset, boxShadow: 'inset 0 0 0 1px var(--hairline)' }}
          />
          {showHint && (
            <p
              className="pointer-events-none absolute inset-x-[15%] bottom-[14%] text-center text-caption text-muted"
              data-testid="sketch-hint"
            >
              {bgMissing ? t('sketch.previousMissing') : t('sketch.hint')}
            </p>
          )}
        </div>
      </div>

      <div className="safe-bottom shrink-0 px-4 pb-3 pt-1">
        {saveRetry && (
          <p className="mb-2 text-center text-caption text-muted" role="status">
            {t('sketch.saveRetry')}
          </p>
        )}
        <div
          className="rounded-xl bg-surface shadow-card squircle"
          role="toolbar"
          aria-label={t('sketch.tools')}
        >
          {objectId && (
            <div data-testid="sketch-overlay">
              <Toggle
                id="sketch-overlay-toggle"
                label={t('sketch.overlay')}
                hint={t('sketch.overlaySoon')}
                checked={false}
                disabled
                onChange={() => undefined}
              />
            </div>
          )}
          <div
            className={`flex items-center justify-between gap-1 px-2 py-1.5 ${objectId ? 'hairline-t' : ''}`}
          >
            <div className="flex items-center gap-1" role="group" aria-label={t('sketch.pen')}>
              {PEN_COLOR_LIST.map((c) => {
                const selected = tool === 'pen' && color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={TOOL_BTN}
                    aria-label={t(`sketch.color.${c}`)}
                    aria-pressed={selected}
                    data-testid={`sketch-color-${c}`}
                    onClick={() => {
                      setColor(c);
                      setTool('pen');
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="block h-6 w-6 rounded-pill"
                      style={{
                        background: PEN_COLORS[c],
                        boxShadow: selected
                          ? '0 0 0 2px var(--accent)'
                          : '0 0 0 1px var(--hairline-strong)',
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label={t('sketch.width.label')}
            >
              {PEN_WIDTH_LIST.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={TOOL_BTN}
                  aria-label={t(`sketch.width.${w}`)}
                  aria-pressed={width === w}
                  data-testid={`sketch-width-${w}`}
                  onClick={() => {
                    setWidth(w);
                    if (tool === 'eraser') setTool('pen');
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="block rounded-pill bg-current"
                    style={{ width: WIDTH_DOT_PX[w], height: WIDTH_DOT_PX[w] }}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              className={TOOL_BTN}
              aria-label={t('sketch.eraser')}
              aria-pressed={tool === 'eraser'}
              data-testid="sketch-eraser"
              onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
            >
              <IconEraser />
            </button>
          </div>

          <div className="hairline-t flex min-h-14 items-center justify-between gap-2 px-2 py-1.5">
            {confirmClear ? (
              <>
                <span className="min-w-0 flex-1 truncate pl-2 text-body-sm" role="status">
                  {t('sketch.clearConfirm')}
                </span>
                <PillButton
                  variant="danger"
                  size="sm"
                  testId="sketch-clear-confirm"
                  onClick={clearAll}
                >
                  {t('sketch.clearYes')}
                </PillButton>
                <PillButton
                  variant="secondary"
                  size="sm"
                  testId="sketch-clear-cancel"
                  onClick={() => setConfirmClear(false)}
                >
                  {t('sketch.clearNo')}
                </PillButton>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={TOOL_BTN}
                  aria-label={t('sketch.undo')}
                  disabled={strokeCount === 0}
                  data-testid="sketch-undo"
                  onClick={undo}
                >
                  <IconUndo />
                </button>
                <span className="text-caption text-muted tabular-nums" data-testid="sketch-count">
                  {t('sketch.strokes', { n: strokeCount })}
                </span>
                <PillButton
                  variant="secondary"
                  size="sm"
                  testId="sketch-clear"
                  disabled={!hasContent}
                  onClick={() => setConfirmClear(true)}
                >
                  {t('sketch.clear')}
                </PillButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
