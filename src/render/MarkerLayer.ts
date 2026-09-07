/**
 * 하늘 위 ★/☆ 마커 오버레이 (task-04 §3.3). `Labels`와 같은 HTML DOM 풀 구조.
 * - 본 것 = 금색 ★(--marker), 시도했지만 못 봄 = 회색 ★(--muted-2), 관측 예정 = 흰 ☆ 윤곽(--fg).
 *   야간 모드는 토큰 교체로 자동 적색.
 * - 픽셀 고정 크기(14px), 대상 왼쪽 위에 놓는다. FOV > 90°에서는 밝은 대상(mag ≤ 4)만(행성·달·태양·별자리는 항상).
 * - id → J2000 벡터·bodyKey·등급 캐시는 `setSets`/`rebuild`에서만 만든다(프레임마다 카탈로그·팩 탐색 금지).
 * - 직전 `update`의 화면 위치를 `candidates()`로 돌려줘 `SkyScene.pick()`이 마커 탭을 대상 선택으로 잇는다.
 * - e2e 비교용으로 엘리먼트에 `data-x`/`data-y`(대상의 투영 CSS px)를 남긴다.
 */
import type { BodyKey } from '@/astro/bodies';
import type { Vec3 } from '@/astro/coords';
import type { ObjectId, ObjectKind } from '@/catalog/objectId';
import type { BodyPlacement } from '@/render/BodyLayer';
import type { Candidate } from '@/render/HitTest';
import type { MarkerKind } from '@/state/logStore';

export interface MarkerSets {
  observed: ReadonlySet<ObjectId>;
  attempted: ReadonlySet<ObjectId>;
  bookmarked: ReadonlySet<ObjectId>;
}

/** 대상의 정적 정보(씬이 카탈로그·팩에서 한 번 해석) */
export interface MarkerTarget {
  kind: ObjectKind;
  /** 행성·달·태양이면 키(위치는 프레임의 placements에서 읽음), 아니면 null */
  bodyKey: BodyKey | null;
  /** J2000 단위벡터(bodyKey가 있으면 null) */
  j2000: Vec3 | null;
  mag?: number;
}

export type MarkerResolver = (id: ObjectId) => MarkerTarget | null;

/** 프레임마다 씬이 넘겨주는 컨텍스트 */
export interface MarkerUpdateContext {
  /** 씬 방향 → 화면 픽셀(CSS px). 화면 뒤면 null */
  proj(dir: Vec3): { x: number; y: number } | null;
  /** J2000 단위벡터 → 씬 방향(굴절 포함) */
  j2000ToSceneDir(v: Vec3): Vec3;
  placements: readonly Pick<BodyPlacement, 'key' | 'dir' | 'sizePx'>[];
  fovDeg: number;
  /** `BodyPlacement.sizePx`가 device px라 CSS px로 나눌 때 쓴다 */
  pixelRatio: number;
  width: number;
  height: number;
  /** 지평선(땅) 레이어가 켜져 있으면 지평선 아래 마커를 숨긴다 */
  ground: boolean;
}

interface MarkerEntry extends MarkerTarget {
  id: ObjectId;
  markerKind: MarkerKind;
}

export const MARKER_GLYPH: Record<MarkerKind, string> = {
  observed: '★',
  attempted: '★',
  bookmarked: '☆',
};
/** 글리프 박스 한 변(CSS px) — theme.css `.sky-marker`와 맞춘다 */
export const MARKER_SIZE_PX = 14;
/** 대상 기준 글리프 박스 왼쪽 위 오프셋(별·DSO) */
export const MARKER_OFFSET_PX = -16;
/** 이 FOV보다 넓으면 밝은 대상만 */
export const MARKER_WIDE_FOV_DEG = 90;
export const MARKER_WIDE_MAG_LIMIT = 4;
/** hit-test 후보 가중치: 마커는 매우 밝은 대상처럼 취급해 탭이 대상 선택으로 이어지게 */
export const MARKER_PICK_MAG = -3;
export const MARKER_PICK_RADIUS_PX = 8;
/** 지평선 아래 판정(씬 +Y=천정) — Labels와 같은 여유 */
const BELOW_HORIZON_Y = -0.02;
const EDGE_MARGIN_PX = 20;

/** 대상의 마커 종류(우선순위: 본 것 > 시도 > 예정). 없으면 null. */
export function markerKindFor(sets: MarkerSets, id: ObjectId): MarkerKind | null {
  if (sets.observed.has(id)) return 'observed';
  if (sets.attempted.has(id)) return 'attempted';
  if (sets.bookmarked.has(id)) return 'bookmarked';
  return null;
}

/**
 * 이 FOV에서 마커를 그릴지. 넓은 시야(> 90°)에서는 하늘이 어지럽지 않게 mag ≤ 4만 —
 * 행성·달·태양·별자리는 항상. 등급을 모르는 별·DSO는 넓은 시야에서 숨긴다.
 */
export function markerVisible(fovDeg: number, mag: number | undefined, kind: ObjectKind): boolean {
  if (kind === 'planet' || kind === 'moon' || kind === 'sun' || kind === 'const') return true;
  if (fovDeg <= MARKER_WIDE_FOV_DEG) return true;
  return mag !== undefined && mag <= MARKER_WIDE_MAG_LIMIT;
}

export class MarkerLayer {
  private readonly container: HTMLElement;
  private readonly pool: HTMLDivElement[] = [];
  private resolver: MarkerResolver | null = null;
  private sets: MarkerSets | null = null;
  private entries: MarkerEntry[] = [];
  private lastCandidates: Candidate[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** id 해석기(카탈로그·팩 보유자인 씬이 준다). 바꾸면 캐시를 다시 만든다. */
  setResolver(resolver: MarkerResolver | null): void {
    this.resolver = resolver;
    this.rebuild();
  }

  /** 집합 교체 → 캐시 재구축. 해석기(카탈로그)가 아직 없으면 집합만 보관했다가 `rebuild`에서 만든다. */
  setSets(sets: MarkerSets): void {
    this.sets = sets;
    this.rebuild();
  }

  /** 보관한 집합으로 캐시 재구축(카탈로그·별 팩이 늦게 로드됐을 때 씬이 부른다). */
  rebuild(): void {
    this.entries = [];
    const sets = this.sets;
    const resolve = this.resolver;
    if (!sets || !resolve) return;
    const ids = new Set<ObjectId>([...sets.observed, ...sets.attempted, ...sets.bookmarked]);
    for (const id of ids) {
      const markerKind = markerKindFor(sets, id);
      if (!markerKind) continue;
      const target = resolve(id);
      if (!target) continue;
      this.entries.push({ ...target, id, markerKind });
    }
  }

  /** 캐시된 마커 수(테스트·디버그) */
  get size(): number {
    return this.entries.length;
  }

  /** 프레임 갱신. 화면 안에 있는 마커만 DOM에 놓고, 나머지 풀은 숨긴다. */
  update(ctx: MarkerUpdateContext): void {
    let used = 0;
    const candidates: Candidate[] = [];
    for (const e of this.entries) {
      if (!markerVisible(ctx.fovDeg, e.mag, e.kind)) continue;
      let dir: Vec3;
      let dx = MARKER_OFFSET_PX;
      let dy = MARKER_OFFSET_PX;
      if (e.bodyKey) {
        const pl = ctx.placements.find((b) => b.key === e.bodyKey);
        if (!pl) continue;
        dir = pl.dir;
        // 행성·달은 원반 바깥으로: -(반지름 CSS px) - 12
        const r = pl.sizePx / 2 / ctx.pixelRatio;
        dx = -r - 12;
        dy = -r - 12;
      } else if (e.j2000) {
        dir = ctx.j2000ToSceneDir(e.j2000);
      } else continue;
      if (ctx.ground && dir[1] < BELOW_HORIZON_Y) continue;
      const px = ctx.proj(dir);
      if (!px) continue;
      if (
        px.x < -EDGE_MARGIN_PX ||
        px.y < -EDGE_MARGIN_PX ||
        px.x > ctx.width + EDGE_MARGIN_PX ||
        px.y > ctx.height + EDGE_MARGIN_PX
      )
        continue;
      const el = this.acquire(used++);
      if (el.dataset['objectId'] !== e.id || el.dataset['kind'] !== e.markerKind) {
        el.dataset['objectId'] = e.id;
        el.dataset['kind'] = e.markerKind;
        el.className = `sky-marker sky-marker-${e.markerKind}`;
        el.textContent = MARKER_GLYPH[e.markerKind];
      }
      const left = px.x + dx;
      const top = px.y + dy;
      el.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      el.dataset['x'] = px.x.toFixed(1);
      el.dataset['y'] = px.y.toFixed(1);
      el.hidden = false;
      // 탭 후보는 글리프 중심 — 마커를 누르면 그 대상이 선택된다
      candidates.push({
        id: e.id,
        x: left + MARKER_SIZE_PX / 2,
        y: top + MARKER_SIZE_PX / 2,
        mag: MARKER_PICK_MAG,
        radiusPx: MARKER_PICK_RADIUS_PX,
      });
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i]!.hidden = true;
    this.lastCandidates = candidates;
  }

  /** 직전 `update`에서 화면에 놓인 마커의 hit-test 후보 */
  candidates(): Candidate[] {
    return this.lastCandidates;
  }

  private acquire(i: number): HTMLDivElement {
    let el = this.pool[i];
    if (!el) {
      el = document.createElement('div');
      el.className = 'sky-marker';
      el.dataset['testid'] = 'sky-marker';
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.pointerEvents = 'none';
      el.setAttribute('aria-hidden', 'true');
      this.container.appendChild(el);
      this.pool.push(el);
    }
    return el;
  }

  /** 레이어가 꺼졌을 때: 모두 숨기고 탭 후보도 비운다 */
  clear(): void {
    for (const el of this.pool) el.hidden = true;
    this.lastCandidates = [];
  }

  dispose(): void {
    for (const el of this.pool) el.remove();
    this.pool.length = 0;
    this.entries = [];
    this.lastCandidates = [];
    this.sets = null;
    this.resolver = null;
  }
}
