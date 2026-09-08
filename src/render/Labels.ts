/**
 * HTML 라벨 오버레이 (task-01 §3.9). 절대 위치 div 풀, transform: translate3d로만 이동.
 * 우선순위 정렬 후 겹침 회피(사각형 점유 검사), 최대 60개.
 */
export type LabelKind =
  'selection' | 'body' | 'star' | 'messier' | 'constellation' | 'cardinal' | 'dso';

export interface LabelItem {
  key: string;
  x: number;
  y: number;
  text: string;
  priority: number; // 낮을수록 먼저
  kind: LabelKind;
  /** 라벨 기준점 오프셋(px). 기본: 오른쪽 위 */
  dx?: number;
  dy?: number;
  alpha?: number;
  /** 중앙 정렬(방위·별자리 이름) */
  center?: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_LABELS = 60;

export class Labels {
  private readonly container: HTMLElement;
  private readonly pool: HTMLDivElement[] = [];
  private width = 0;
  private height = 0;
  private clipRadius = Infinity;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setClipRadius(radius: number): void {
    this.clipRadius = radius;
  }

  /** 라벨 갱신. items는 화면 좌표(px). */
  update(items: LabelItem[]): void {
    const sorted = [...items].sort((a, b) => a.priority - b.priority);
    const placed: Rect[] = [];
    let used = 0;
    for (const it of sorted) {
      if (used >= MAX_LABELS) break;
      if (it.x < -20 || it.y < -20 || it.x > this.width + 20 || it.y > this.height + 20) continue;
      const w = estimateWidth(it.text, it.kind);
      const h = it.kind === 'constellation' ? 16 : 14;
      const dx = it.dx ?? (it.center ? -w / 2 : 7);
      const dy = it.dy ?? (it.center ? -h / 2 : -h - 3);
      const rect: Rect = { x: it.x + dx, y: it.y + dy, w, h };
      // 원형 하늘 밖에서 이름이 반만 잘리지 않도록 가장자리 라벨을 생략한다.
      if (
        it.kind !== 'selection' &&
        [rect.x, rect.x + w].some((x) =>
          [rect.y, rect.y + h].some(
            (y) => Math.hypot(x - this.width / 2, y - this.height / 2) > this.clipRadius,
          ),
        )
      )
        continue;
      if (it.kind !== 'selection' && placed.some((r) => overlaps(r, rect))) continue;
      placed.push(rect);
      const el = this.acquire(used++);
      if (el.dataset['text'] !== it.text || el.dataset['kind'] !== it.kind) {
        el.textContent = it.text;
        el.dataset['text'] = it.text;
        el.dataset['kind'] = it.kind;
        el.className = `sky-label sky-label-${it.kind}`;
      }
      el.style.transform = `translate3d(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px, 0)`;
      el.style.opacity = String(it.alpha ?? 1);
      el.hidden = false;
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i]!.hidden = true;
  }

  private acquire(i: number): HTMLDivElement {
    let el = this.pool[i];
    if (!el) {
      el = document.createElement('div');
      el.className = 'sky-label';
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.whiteSpace = 'nowrap';
      el.style.pointerEvents = 'none';
      this.container.appendChild(el);
      this.pool.push(el);
    }
    return el;
  }

  clear(): void {
    for (const el of this.pool) el.hidden = true;
  }

  dispose(): void {
    for (const el of this.pool) el.remove();
    this.pool.length = 0;
  }
}

function estimateWidth(text: string, kind: LabelKind): number {
  // 한글 ≈ 12px, 영문 ≈ 7px (11~12px 폰트 기준)
  let w = 0;
  for (const ch of text) w += /[ㄱ-힝]/.test(ch) ? 12 : 7;
  return w * (kind === 'constellation' ? 1.1 : 1) + 4;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** FOV별 고유명 별 라벨 등급 임계(task-01 §3.9) */
export function starLabelMagLimit(fovDeg: number): number {
  if (fovDeg >= 100) return 1.5;
  if (fovDeg >= 60) return 2.5 - ((fovDeg - 60) / 40) * 1.0;
  if (fovDeg >= 30) return 3.5 - ((fovDeg - 30) / 30) * 1.0;
  if (fovDeg >= 10) return 5.0 - ((fovDeg - 10) / 20) * 1.5;
  return 99;
}

/** FOV별 별자리 이름 최대 개수 */
export function constellationLabelBudget(fovDeg: number): number {
  if (fovDeg >= 90) return 12;
  if (fovDeg >= 45) return 16;
  return 24;
}
