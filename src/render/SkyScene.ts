/**
 * 하늘 씬 오케스트레이터 (task-01 §3.1). 카메라는 원점, 천체는 R=100 천구 방향.
 * 프레임마다 eqjToSceneMatrix 1개 → 별·별자리·DSO·은하수의 uniform. 행성·달·태양은 CPU(bodies.ts).
 * 렌더 루프는 invalidate() 패턴: 변화가 없으면 그리지 않는다(정지 시 draw 0).
 */
import * as THREE from 'three';
import { bodyKeyFromObjectId, type BodyState } from '@/astro/bodies';
import { altAzToScene, sceneToAltAz, unitVectorToRaDec, type Vec3 } from '@/astro/coords';
import {
  applyMat3,
  constellationAt,
  eqjToSceneMatrix,
  type Mat3,
  type ObserverLike,
} from '@/astro/frames';
import { apparentAltitude } from '@/astro/refraction';
import {
  displayName,
  loadCatalog,
  secondaryName,
  type Catalog,
  type Lang,
} from '@/catalog/catalog';
import type { ObjectId } from '@/catalog/objectId';
import { loadStarPack, type StarPackName } from '@/catalog/starPack';
import { starObjectId, type StarPack } from '@/catalog/starPackFormat';
import { BodyLayer } from '@/render/BodyLayer';
import { CameraController, type ViewState } from '@/render/CameraController';
import { ConstellationLayer } from '@/render/ConstellationLayer';
import { DsoLayer, dsoMagLimits } from '@/render/DsoLayer';
import { GridLayer } from '@/render/GridLayer';
import { pickBest, type Candidate } from '@/render/HitTest';
import { cardinalPoints, HorizonLayer } from '@/render/HorizonLayer';
import {
  constellationLabelBudget,
  Labels,
  starLabelMagLimit,
  type LabelItem,
} from '@/render/Labels';
import { MilkyWayLayer } from '@/render/MilkyWayLayer';
import { readRenderPalette, type RenderPalette } from '@/render/palette';
import { degPerPixel } from '@/render/projection';
import { SkyBackground, skyBrightnessPenaltyMag } from '@/render/SkyBackground';
import { StarLayer } from '@/render/StarLayer';
import { renderStats } from '@/render/stats';
import type { LayerValues } from '@/state/layerStore';

export interface SkySceneOptions {
  canvas: HTMLCanvasElement;
  labelContainer: HTMLElement;
  getTime(): Date;
  getObserver(): ObserverLike;
  getLayers(): LayerValues;
  getLang(): Lang;
  onViewChange(view: ViewState): void;
  onSelect(id: ObjectId | null): void;
  /** 시간이 계속 흐르는지(실시간 또는 배속) — 루프가 초당 1회 이상 갱신 */
  isTimeRunning(): boolean;
  /** 테스트용: 캔버스 픽셀을 읽을 수 있게 드로잉 버퍼 보존(성능 비용 있음, 기본 false) */
  preserveDrawingBuffer?: boolean;
}

export interface ObjectInfo {
  id: ObjectId;
  name: string;
  secondary?: string;
  kind: 'star' | 'dso' | 'planet' | 'moon' | 'sun' | 'const';
  mag?: number;
  altDeg: number;
  azDeg: number;
  con?: string;
  conName?: string;
  /** 달 위상(0..1), 달·행성 */
  phase?: number;
}

const DEEP_PACK_FOV = 20;
const DEEP_PACK_RELEASE_FOV = 28;

export class SkyScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly controller: CameraController;
  readonly labels: Labels;
  readonly stars = new StarLayer();
  readonly bodies = new BodyLayer();
  readonly constellations = new ConstellationLayer();
  readonly grid = new GridLayer();
  readonly horizon = new HorizonLayer();
  readonly milkyWay = new MilkyWayLayer();
  readonly dso = new DsoLayer();
  readonly background = new SkyBackground();
  catalog: Catalog | null = null;

  private readonly opts: SkySceneOptions;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private matrix: Mat3 = new Float32Array(9);
  private matrixTimeMs = Number.NaN;
  private observerKey = '';
  private lastBodyUpdateMs = 0;
  private lastBodyTimeMs = Number.NaN;
  private packs = new Map<StarPackName, StarPack>();
  private deepLoading = false;
  private dirty = true;
  private running = false;
  private raf = 0;
  private lastFrameMs = 0;
  private palette: RenderPalette = readRenderPalette();
  private selectedId: ObjectId | null = null;
  private selectionEl: HTMLDivElement;
  private disposed = false;
  private sunState: BodyState | null = null;

  constructor(opts: SkySceneOptions) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
    });
    this.renderer.autoClear = true;
    this.renderer.setClearColor(0x000000, 1);
    this.controller = new CameraController({
      onChange: (v) => {
        this.dirty = true;
        opts.onViewChange(v);
      },
      getSize: () => ({ width: this.width, height: this.height }),
    });
    this.controller.onTap = (cx, cy) => {
      const rect = opts.canvas.getBoundingClientRect();
      const id = this.pick(cx - rect.left, cy - rect.top);
      this.select(id);
    };
    this.controller.attach(opts.canvas);
    this.labels = new Labels(opts.labelContainer);
    this.selectionEl = document.createElement('div');
    this.selectionEl.className = 'sky-selection-ring';
    this.selectionEl.hidden = true;
    opts.labelContainer.appendChild(this.selectionEl);

    this.scene.add(
      this.background.mesh,
      this.milkyWay.mesh,
      this.stars.points,
      this.dso.points,
      this.constellations.bounds.object,
      this.constellations.lines.object,
      this.grid.altAz.object,
      this.grid.equator.object,
      this.grid.ecliptic.object,
      this.grid.meridian.object,
      this.bodies.group,
      this.horizon.ground,
      this.horizon.ring.object,
    );

    opts.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
    });
    opts.canvas.addEventListener('webglcontextrestored', () => {
      this.dirty = true;
      this.start();
    });
  }

  /** 데이터 로드(카탈로그·밝은 별 팩·은하수). 로드되는 대로 그린다. */
  async init(): Promise<void> {
    const [catalog, bright] = await Promise.all([loadCatalog(), loadStarPack('stars-bright')]);
    if (this.disposed) return;
    this.catalog = catalog;
    this.packs.set('stars-bright', bright);
    this.stars.setPack('stars-bright', bright);
    this.constellations.setCatalog(catalog);
    this.dso.setCatalog(catalog);
    this.dirty = true;
    void this.milkyWay.load().then(() => {
      this.dirty = true;
    });
  }

  resize(): void {
    const canvas = this.opts.canvas;
    const rect = canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.labels.resize(this.width, this.height);
    this.dirty = true;
  }

  invalidate(): void {
    this.dirty = true;
  }

  setPalette(): void {
    this.palette = readRenderPalette();
    this.dirty = true;
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastFrameMs = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.controller.detach();
    this.labels.dispose();
    this.selectionEl.remove();
    this.stars.dispose();
    this.bodies.dispose();
    this.constellations.dispose();
    this.grid.dispose();
    this.horizon.dispose();
    this.milkyWay.dispose();
    this.dso.dispose();
    this.background.dispose();
    this.renderer.dispose();
  }

  // ---------- 프레임 ----------

  private frame(now: number): void {
    const dt = Math.min(100, now - this.lastFrameMs);
    this.lastFrameMs = now;
    const animating = this.controller.update(now, dt);
    const astroChanged = this.updateAstronomy(now);
    if (!this.dirty && !animating && !astroChanged) {
      renderStats.drawCalls = 0;
      return;
    }
    this.dirty = false;
    this.render();
  }

  /** 시간·관측지 변화에 따라 행렬·천체를 갱신. 갱신했으면 true. */
  private updateAstronomy(nowMs: number): boolean {
    const date = this.opts.getTime();
    const observer = this.opts.getObserver();
    const key = `${observer.lat},${observer.lon},${observer.elevation ?? 0}`;
    const t = date.getTime();
    let changed = false;
    if (
      Number.isNaN(this.matrixTimeMs) ||
      Math.abs(t - this.matrixTimeMs) >= 1000 ||
      key !== this.observerKey
    ) {
      this.matrix = eqjToSceneMatrix(date, observer);
      this.matrixTimeMs = t;
      this.observerKey = key;
      changed = true;
    }
    // 행성·달·태양: 실시간 250ms 간격, 시간 점프(≥ 60s)면 즉시
    const jump = Number.isNaN(this.lastBodyTimeMs) || Math.abs(t - this.lastBodyTimeMs) >= 60_000;
    if ((changed && nowMs - this.lastBodyUpdateMs > 250) || jump) {
      const dpp = degPerPixel(this.controller.getView().fovDeg, this.width, this.height);
      this.bodies.update(date, observer, dpp, this.pixelRatio, this.opts.getLayers().magnifyBodies);
      this.sunState = this.bodies.sunPlacement?.state ?? null;
      this.lastBodyUpdateMs = nowMs;
      this.lastBodyTimeMs = t;
      changed = true;
    }
    return changed;
  }

  private render(): void {
    const view = this.controller.getView();
    const layers = this.opts.getLayers();
    const p = this.palette;
    const dpp = degPerPixel(view.fovDeg, this.width, this.height);
    this.controller.applyToCamera(this.width, this.height);

    // 팩 교체(deep ↔ bright)
    this.manageStarPacks(view.fovDeg);

    const sunAlt = this.sunState?.altAirlessDeg ?? -30;
    const sunDir = this.bodies.sunPlacement?.dir ?? ([0, -1, 0] as Vec3);
    const limitingMag =
      layers.limitingMag - (layers.atmosphere ? skyBrightnessPenaltyMag(sunAlt) : 0);

    this.background.setSun(sunDir, sunAlt);
    this.background.setStyle(p.bg, layers.atmosphere, p.night);

    this.stars.setMatrix(this.matrix);
    this.stars.setParams(
      {
        fovDeg: view.fovDeg,
        pixelRatio: this.pixelRatio,
        limitingMag,
        saturation: layers.starSaturation,
        extinction: layers.extinction && layers.atmosphere,
        night: p.night,
        alpha: 1,
      },
      p,
    );

    this.milkyWay.setMatrix(this.matrix);
    this.milkyWay.mesh.visible = layers.milkyWay && this.milkyWay.loaded && sunAlt < -6;
    this.milkyWay.setStyle(
      p.milkyWay,
      layers.milkyWayAlpha * (1 - Math.min(1, skyBrightnessPenaltyMag(sunAlt) / 6)),
      true,
    );

    this.constellations.setMatrix(this.matrix);
    this.constellations.lines.visible = layers.constellationLines;
    this.constellations.lines.setStyle(p.constellation, layers.constellationLinesAlpha);
    this.constellations.bounds.visible = layers.constellationBounds;
    this.constellations.bounds.setStyle(p.constellationBound, layers.constellationBoundsAlpha);

    this.grid.setMatrix(this.matrix);
    this.grid.altAz.visible = layers.altAzGrid;
    this.grid.altAz.setStyle(p.grid, 0.5);
    this.grid.equator.visible = layers.equator;
    this.grid.equator.setStyle(p.accent, 0.5);
    this.grid.ecliptic.visible = layers.ecliptic;
    this.grid.ecliptic.setStyle(p.planet, 0.6);
    this.grid.meridian.visible = layers.meridian;
    this.grid.meridian.setStyle(p.grid, 0.6);

    this.dso.setMatrix(this.matrix);
    this.dso.points.visible = layers.dso;
    this.dso.setParams(view.fovDeg, dpp, this.pixelRatio, p.label, 0.85, true);

    this.horizon.ground.visible = layers.ground;
    this.horizon.setStyle(p.night ? '#050000' : '#0b0d12', layers.groundOpaque, p.horizon);

    this.bodies.setStyle(p.night, p.star, p.moon, this.pixelRatio);

    this.renderer.render(this.scene, this.controller.camera);
    const info = this.renderer.info.render;
    renderStats.drawCalls = info.calls;
    renderStats.triangles = info.triangles;
    renderStats.points = info.points;

    this.updateLabels(view, layers, dpp);
  }

  private manageStarPacks(fovDeg: number): void {
    if (fovDeg < DEEP_PACK_FOV) {
      const deep = this.packs.get('stars-deep');
      if (deep) {
        if (this.stars.currentPack !== 'stars-deep') this.stars.setPack('stars-deep', deep);
      } else if (!this.deepLoading) {
        this.deepLoading = true;
        void loadStarPack('stars-deep')
          .then((pack) => {
            if (this.disposed) return;
            this.packs.set('stars-deep', pack);
            this.dirty = true;
          })
          .catch((err: unknown) => console.warn('[sky] stars-deep load failed', err))
          .finally(() => {
            this.deepLoading = false;
          });
      }
    } else if (fovDeg > DEEP_PACK_RELEASE_FOV && this.stars.currentPack === 'stars-deep') {
      const bright = this.packs.get('stars-bright');
      if (bright) this.stars.setPack('stars-bright', bright);
    }
  }

  // ---------- 좌표 유틸 ----------

  /** J2000 단위벡터 → 씬 방향(굴절 포함) */
  j2000ToSceneDir(v: Vec3): Vec3 {
    const s = applyMat3(this.matrix, v);
    const { altDeg, azDeg } = sceneToAltAz(s);
    return altAzToScene(apparentAltitude(altDeg), azDeg);
  }

  /** 천체 id → 씬 방향(굴절 포함). 없으면 null. */
  objectDirection(id: ObjectId): Vec3 | null {
    const cat = this.catalog;
    const bodyKey = bodyKeyFromObjectId(id);
    if (bodyKey) return this.bodies.placements.find((b) => b.key === bodyKey)?.dir ?? null;
    if (!cat) return null;
    const star = cat.starById.get(id);
    if (star) {
      const i = cat.stars.indexOf(star);
      return this.j2000ToSceneDir([
        cat.starVectors[i * 3]!,
        cat.starVectors[i * 3 + 1]!,
        cat.starVectors[i * 3 + 2]!,
      ]);
    }
    const dso = cat.dsoById.get(id);
    if (dso) {
      const i = cat.dso.indexOf(dso);
      return this.j2000ToSceneDir([
        cat.dsoVectors[i * 3]!,
        cat.dsoVectors[i * 3 + 1]!,
        cat.dsoVectors[i * 3 + 2]!,
      ]);
    }
    if (id.startsWith('const:')) {
      const c = cat.constellations[id.slice(6)];
      if (c) {
        const [ra, dec] = c.label;
        const rad = Math.PI / 180;
        return this.j2000ToSceneDir([
          Math.cos(dec * rad) * Math.cos(ra * rad),
          Math.cos(dec * rad) * Math.sin(ra * rad),
          Math.sin(dec * rad),
        ]);
      }
    }
    // 팩에만 있는 별(star:HIP…/HYG…)
    const pack =
      this.packs.get(this.stars.currentPack as StarPackName) ?? this.packs.get('stars-bright');
    if (pack) {
      const m = /^star:(HIP|HYG)(\d+)$/.exec(id);
      if (m) {
        const n = Number(m[2]);
        const arr = m[1] === 'HIP' ? pack.hip : pack.hygId;
        for (let i = 0; i < pack.count; i++) {
          if (arr[i] === n)
            return this.j2000ToSceneDir([
              pack.positions[i * 3]!,
              pack.positions[i * 3 + 1]!,
              pack.positions[i * 3 + 2]!,
            ]);
        }
      }
    }
    return null;
  }

  /** 천체 id → 화면 픽셀(캔버스 기준). 화면 밖/뒤면 null. */
  project(id: ObjectId): { x: number; y: number } | null {
    const dir = this.objectDirection(id);
    if (!dir) return null;
    return this.controller.directionToPixel(dir, this.width, this.height);
  }

  /** 천체의 겉보기 alt/az(굴절 포함) */
  objectAltAz(id: ObjectId): { altDeg: number; azDeg: number } | null {
    const dir = this.objectDirection(id);
    return dir ? sceneToAltAz(dir) : null;
  }

  /** 툴팁용 정보 */
  describe(id: ObjectId): ObjectInfo | null {
    const cat = this.catalog;
    if (!cat) return null;
    const altAz = this.objectAltAz(id);
    if (!altAz) return null;
    const lang = this.opts.getLang();
    const base = {
      id,
      name: displayName(cat, id, lang),
      secondary: secondaryName(cat, id, lang),
      ...altAz,
    };
    const bodyKey = bodyKeyFromObjectId(id);
    if (bodyKey) {
      const pl = this.bodies.placements.find((b) => b.key === bodyKey);
      const s = pl?.state;
      const con = s ? constellationAt(s.raJ2000Deg, s.decJ2000Deg) : undefined;
      return {
        ...base,
        kind: bodyKey === 'sun' || bodyKey === 'moon' ? bodyKey : 'planet',
        mag: s?.magnitude,
        con: con?.symbol,
        conName: con ? (lang === 'ko' ? cat.constellations[con.symbol]?.ko : con.name) : undefined,
        phase: s?.phaseFraction,
      };
    }
    const star = cat.starById.get(id);
    if (star)
      return {
        ...base,
        kind: 'star',
        mag: star.mag,
        con: star.con,
        conName: conName(cat, star.con, lang),
      };
    const dso = cat.dsoById.get(id);
    if (dso)
      return {
        ...base,
        kind: 'dso',
        mag: dso.mag,
        con: dso.con,
        conName: conName(cat, dso.con, lang),
      };
    if (id.startsWith('const:')) return { ...base, kind: 'const', con: id.slice(6) };
    // 팩 전용 별: 등급은 팩에서
    const pack = this.packs.get('stars-bright');
    const m = /^star:(HIP|HYG)(\d+)$/.exec(id);
    if (pack && m) {
      const n = Number(m[2]);
      const arr = m[1] === 'HIP' ? pack.hip : pack.hygId;
      for (let i = 0; i < pack.count; i++) {
        if (arr[i] === n) {
          const { raDeg, decDeg } = unitVectorToRaDec([
            pack.positions[i * 3]!,
            pack.positions[i * 3 + 1]!,
            pack.positions[i * 3 + 2]!,
          ]);
          const c = constellationAt(raDeg, decDeg).symbol;
          return {
            ...base,
            kind: 'star',
            mag: pack.mag[i],
            con: c,
            conName: conName(cat, c, lang),
          };
        }
      }
    }
    return { ...base, kind: 'star' };
  }

  // ---------- 선택 ----------

  pick(x: number, y: number): ObjectId | null {
    const cat = this.catalog;
    const candidates: Candidate[] = [];
    const view = this.controller.getView();
    const cosFov = Math.cos(((view.fovDeg * 1.2) / 2) * (Math.PI / 180));
    const center = altAzToScene(view.altDeg, view.azDeg);
    // 행성·달·태양
    for (const b of this.bodies.placements) {
      const px = this.controller.directionToPixel(b.dir, this.width, this.height);
      if (!px) continue;
      const id = b.key === 'sun' || b.key === 'moon' ? b.key : (`planet:${b.key}` as ObjectId);
      candidates.push({
        id,
        x: px.x,
        y: px.y,
        mag: Math.min(b.state.magnitude, -1),
        radiusPx: b.sizePx / 2,
      });
    }
    // 별 팩
    const packName = this.stars.currentPack as StarPackName;
    const pack = this.packs.get(packName);
    const limits = dsoMagLimits(view.fovDeg);
    if (pack) {
      const maxMag = view.fovDeg > 40 ? 6.5 : view.fovDeg > 15 ? 8 : 99;
      for (let i = 0; i < pack.count; i++) {
        if (pack.mag[i]! > maxMag) continue;
        const v: Vec3 = [
          pack.positions[i * 3]!,
          pack.positions[i * 3 + 1]!,
          pack.positions[i * 3 + 2]!,
        ];
        const s = applyMat3(this.matrix, v);
        if (s[0] * center[0] + s[1] * center[1] + s[2] * center[2] < cosFov) continue;
        const dir = this.j2000ToSceneDir(v);
        const px = this.controller.directionToPixel(dir, this.width, this.height);
        if (!px) continue;
        candidates.push({
          id: starObjectId(pack.hip[i]!, pack.hygId[i]!),
          x: px.x,
          y: px.y,
          mag: pack.mag[i]!,
        });
      }
    }
    // DSO (표시 조건 안)
    if (cat && this.opts.getLayers().dso) {
      cat.dso.forEach((d, i) => {
        const mag = d.mag ?? d.magB ?? (d.messier !== undefined ? 8 : 999);
        const show = d.messier !== undefined ? mag <= limits.messier : mag <= limits.other;
        if (!show) return;
        const v: Vec3 = [
          cat.dsoVectors[i * 3]!,
          cat.dsoVectors[i * 3 + 1]!,
          cat.dsoVectors[i * 3 + 2]!,
        ];
        const px = this.controller.directionToPixel(
          this.j2000ToSceneDir(v),
          this.width,
          this.height,
        );
        if (!px) return;
        candidates.push({ id: d.id, x: px.x, y: px.y, mag: Math.min(mag, 6), radiusPx: 8 });
      });
    }
    return pickBest(candidates, x, y)?.id ?? null;
  }

  select(id: ObjectId | null): void {
    this.selectedId = id;
    this.dirty = true;
    this.opts.onSelect(id);
  }

  get selected(): ObjectId | null {
    return this.selectedId;
  }

  flyToObject(id: ObjectId, fovDeg?: number): boolean {
    const altAz = this.objectAltAz(id);
    if (!altAz) return false;
    this.controller.flyTo({ ...altAz, fovDeg });
    return true;
  }

  // ---------- 라벨 ----------

  private updateLabels(view: ViewState, layers: LayerValues, _dpp: number): void {
    const cat = this.catalog;
    const lang = this.opts.getLang();
    const labelLang: Lang = layers.labelLang === 'auto' ? lang : layers.labelLang;
    const items: LabelItem[] = [];
    const W = this.width;
    const H = this.height;
    const proj = (dir: Vec3) => this.controller.directionToPixel(dir, W, H);

    // 방위
    for (const c of cardinalPoints(labelLang)) {
      const px = proj(c.dir);
      if (px)
        items.push({
          key: `card:${c.text}`,
          x: px.x,
          y: px.y,
          text: c.text,
          priority: 0,
          kind: 'cardinal',
          center: true,
          alpha: c.major ? 1 : 0.7,
        });
    }
    // 행성·달·태양
    if (cat) {
      for (const b of this.bodies.placements) {
        if (b.state.altDeg < -2) continue;
        const px = proj(b.dir);
        if (!px) continue;
        const id = (b.key === 'sun' || b.key === 'moon' ? b.key : `planet:${b.key}`) as ObjectId;
        items.push({
          key: id,
          x: px.x,
          y: px.y,
          text: displayName(cat, id, labelLang),
          priority: 1,
          kind: 'body',
          dx: b.sizePx / 2 / this.pixelRatio + 4,
          dy: -8,
        });
      }
    }
    // 고유명 별
    if (cat && layers.starLabels) {
      const limit = starLabelMagLimit(view.fovDeg);
      const center = altAzToScene(view.altDeg, view.azDeg);
      const cosFov = Math.cos(((view.fovDeg * 1.3) / 2) * (Math.PI / 180));
      cat.stars.forEach((s, i) => {
        if (s.mag > limit) return;
        const named = labelLang === 'ko' ? (s.ko ?? s.traditionalKo ?? s.en) : s.en;
        if (!named) return;
        const v: Vec3 = [
          cat.starVectors[i * 3]!,
          cat.starVectors[i * 3 + 1]!,
          cat.starVectors[i * 3 + 2]!,
        ];
        const sc = applyMat3(this.matrix, v);
        if (sc[0] * center[0] + sc[1] * center[1] + sc[2] * center[2] < cosFov) return;
        const dir = this.j2000ToSceneDir(v);
        if (dir[1] < -0.02) return;
        const px = proj(dir);
        if (!px) return;
        items.push({
          key: s.id,
          x: px.x,
          y: px.y,
          text: named,
          priority: 2 + s.mag / 10,
          kind: 'star',
        });
      });
    }
    // 메시에
    if (cat && layers.dso && view.fovDeg <= 60) {
      cat.dso.forEach((d, i) => {
        if (d.messier === undefined) return;
        const v: Vec3 = [
          cat.dsoVectors[i * 3]!,
          cat.dsoVectors[i * 3 + 1]!,
          cat.dsoVectors[i * 3 + 2]!,
        ];
        const dir = this.j2000ToSceneDir(v);
        if (dir[1] < -0.02) return;
        const px = proj(dir);
        if (!px) return;
        const text =
          view.fovDeg <= 30 && labelLang === 'ko' && d.names.ko ? d.names.ko : `M${d.messier}`;
        items.push({
          key: d.id,
          x: px.x,
          y: px.y,
          text,
          priority: 3 + (d.mag ?? 8) / 10,
          kind: 'messier',
          dy: 6,
        });
      });
    }
    // 별자리 이름
    if (cat && layers.constellationNames) {
      let budget = constellationLabelBudget(view.fovDeg);
      for (const [abbr, c] of Object.entries(cat.constellations)) {
        if (budget <= 0) break;
        const [ra, dec] = c.label;
        const rad = Math.PI / 180;
        const dir = this.j2000ToSceneDir([
          Math.cos(dec * rad) * Math.cos(ra * rad),
          Math.cos(dec * rad) * Math.sin(ra * rad),
          Math.sin(dec * rad),
        ]);
        if (dir[1] < -0.05) continue;
        const px = proj(dir);
        if (!px || px.x < 0 || px.y < 0 || px.x > W || px.y > H) continue;
        items.push({
          key: `const:${abbr}`,
          x: px.x,
          y: px.y,
          text: labelLang === 'ko' ? c.ko : c.en,
          priority: 4,
          kind: 'constellation',
          center: true,
          alpha: layers.constellationNamesAlpha,
        });
        budget--;
      }
    }
    // 선택
    if (this.selectedId && cat) {
      const px = this.project(this.selectedId);
      if (px) {
        items.push({
          key: `sel:${this.selectedId}`,
          x: px.x,
          y: px.y,
          text: displayName(cat, this.selectedId, labelLang),
          priority: -1,
          kind: 'selection',
          dx: 14,
          dy: -20,
        });
        this.selectionEl.hidden = false;
        this.selectionEl.style.transform = `translate3d(${(px.x - 14).toFixed(1)}px, ${(px.y - 14).toFixed(1)}px, 0)`;
      } else this.selectionEl.hidden = true;
    } else this.selectionEl.hidden = true;

    this.labels.update(items);
  }
}

function conName(cat: Catalog, abbr: string, lang: Lang): string | undefined {
  const c = cat.constellations[abbr];
  return c ? (lang === 'ko' ? c.ko : c.en) : undefined;
}
