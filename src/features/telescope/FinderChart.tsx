import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { applyMat3, eqjToSceneMatrix, type ObserverLike } from '@/astro/frames';
import { raDecToUnitVector, type Vec3 } from '@/astro/coords';
import { finderPoint, finderDirection, orientPoint, type ImageOrientation } from '@/astro/finder';
import { displayName } from '@/catalog/catalog';
import { starObjectId } from '@/catalog/starPackFormat';
import type { StarPack } from '@/catalog/starPackFormat';
import type { Catalog } from '@/catalog/catalog';
import { useSettingsStore } from '@/state/settingsStore';
export function FinderChart({
  pack,
  cat,
  center,
  date,
  observer,
  fovDeg,
  orientation = 'upright',
  rotationDeg = 0,
  target,
  previous,
  equatorial = false,
  small = false,
  onCenter,
}: {
  pack: StarPack;
  cat: Catalog;
  center: Vec3;
  date: Date;
  observer: ObserverLike;
  fovDeg: number;
  orientation?: ImageOrientation;
  rotationDeg?: number;
  target?: Vec3;
  previous?: Vec3;
  equatorial?: boolean;
  small?: boolean;
  onCenter?(center: Vec3): void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useSettingsStore((s) => s.theme);
  const lang = useSettingsStore((s) => s.lang);
  const drag = useRef<{ x: number; y: number; center: Vec3; up: Vec3; radius: number } | null>(
    null,
  );
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const size = small ? 320 : 640;
    canvas.width = size;
    canvas.height = size;
    const colors = getComputedStyle(canvas),
      fg = colors.getPropertyValue('--fg').trim(),
      accent = colors.getPropertyValue('--accent').trim();
    ctx.fillStyle = colors.getPropertyValue('--bg').trim();
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.475, 0, Math.PI * 2);
    ctx.clip();
    const m = eqjToSceneMatrix(date, observer),
      up: Vec3 = equatorial ? applyMat3(m, [0, 0, 1]) : [0, 1, 0];
    const project = (v: Vec3) => {
      const xy = finderPoint(v, center, up, fovDeg);
      if (!xy) return null;
      const p = orientPoint(...xy, orientation, rotationDeg);
      return [size / 2 + p[0] * size * 0.475, size / 2 + p[1] * size * 0.475] as const;
    };
    ctx.fillStyle = fg;
    for (let i = 0; i < pack.count; i++) {
      const mag = pack.mag[i]!;
      if (mag > 9) continue;
      const v = applyMat3(m, [
        pack.positions[i * 3]!,
        pack.positions[i * 3 + 1]!,
        pack.positions[i * 3 + 2]!,
      ]);
      const pos = project(v);
      if (!pos || pos[0] < 0 || pos[1] < 0 || pos[0] > size || pos[1] > size) continue;
      ctx.beginPath();
      ctx.arc(
        pos[0],
        pos[1],
        Math.max(0.7, (5.8 - mag * 0.55) * (small ? 0.65 : 1)),
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (!small && mag < 3) {
        const id = starObjectId(pack.hip[i]!, pack.hygId[i]!);
        if (cat.starById.has(id)) {
          ctx.font = '18px sans-serif';
          ctx.fillText(displayName(cat, id, lang), pos[0] + 10, pos[1] - 10);
        }
      }
    }
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.font = `${small ? 12 : 18}px sans-serif`;
    for (const dso of cat.dsoById.values()) {
      const pos = project(applyMat3(m, raDecToUnitVector(dso.ra, dso.dec)));
      if (!pos || Math.hypot(pos[0] - size / 2, pos[1] - size / 2) > size * 0.47) continue;
      ctx.strokeRect(pos[0] - 4, pos[1] - 4, 8, 8);
      if (!small) ctx.fillText(dso.id.replace('dso:', ''), pos[0] + 8, pos[1]);
    }
    if (target) {
      const p = project(target);
      if (p) {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (previous && target) {
      const a = project(previous),
        b = project(target);
      if (a && b) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(...a);
        ctx.lineTo(...b);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.475, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size / 2 - 6, size / 2);
    ctx.lineTo(size / 2 + 6, size / 2);
    ctx.moveTo(size / 2, size / 2 - 6);
    ctx.lineTo(size / 2, size / 2 + 6);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = `${small ? 12 : 18}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${fovDeg.toFixed(1)}°`, size / 2, size - 4);
  }, [
    pack,
    cat,
    center,
    date,
    observer,
    fovDeg,
    orientation,
    rotationDeg,
    target,
    previous,
    equatorial,
    small,
    theme,
    lang,
  ]);
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={t('guide.chartAlt', { fov: fovDeg.toFixed(1) })}
      data-testid="finder-chart"
      data-drag-scroll="off"
      style={onCenter ? { touchAction: 'none', cursor: 'grab' } : undefined}
      onPointerDown={(e) => {
        if (!onCenter || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          center,
          up: equatorial ? applyMat3(eqjToSceneMatrix(date, observer), [0, 0, 1]) : [0, 1, 0],
          radius: e.currentTarget.getBoundingClientRect().width * 0.475,
        };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || !onCenter) return;
        onCenter(
          finderDirection(
            (d.x - e.clientX) / d.radius,
            (d.y - e.clientY) / d.radius,
            d.center,
            d.up,
            fovDeg,
            orientation,
            rotationDeg,
          ),
        );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      className="mx-auto aspect-square w-full max-w-md rounded-full"
    />
  );
}
