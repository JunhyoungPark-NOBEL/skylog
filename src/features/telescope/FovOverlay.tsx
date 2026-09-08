import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useTelescopeStore } from '@/state/telescopeStore';
import { useSensorStore } from '@/state/sensorStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useClockStore } from '@/state/clockStore';
import { useLocationStore } from '@/state/locationStore';
import { getSkyScene } from '@/features/sky/skyApi';
import { eqjToAltAzSlow } from '@/astro/frames';
import { altAzToScene, DEG, type Vec3 } from '@/astro/coords';
import { hemisphereRadiusPx } from '@/render/projection';
/** 원을 구면 위에 샘플링하므로 화면 중앙 밖에서도 각도 크기/원근이 맞는다. */
export function FovOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);
  const enabled = useTelescopeStore((s) => s.fovRings),
    route = useTelescopeStore((s) => s.route);
  useEffect(() => {
    if (!enabled && !route) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      const scene = getSkyScene();
      if (!scene) return;
      const { width: w, height: h } = canvas.getBoundingClientRect();
      if (!w || !h) return;
      canvas.style.clipPath = `circle(${hemisphereRadiusPx(scene.controller.getView().fovDeg, w, h)}px at 50% 50%)`;
      const ratio = Math.min(2, devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const color = getComputedStyle(canvas).getPropertyValue('--accent').trim();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.3;
      ctx.font = '12px sans-serif';
      const project = (d: Vec3) => scene.controller.directionToPixel(d, w, h);
      if (enabled) {
        const p = useTelescopeStore.getState().profile,
          selected = useSelectionStore.getState().selectedId,
          view = scene.controller.getView();
        const center =
          (!useSensorStore.getState().arActive && selected
            ? scene.objectDirection(selected)
            : null) ?? altAzToScene(view.altDeg, view.azDeg);
        const c = new Vector3(...center),
          r = new Vector3().crossVectors(c, new Vector3(0, 1, 0));
        if (r.lengthSq() < 1e-8) r.set(1, 0, 0);
        r.normalize();
        const u = new Vector3().crossVectors(r, c).normalize();
        const rings = [
          [p.binocularFov, `${p.binocularMag}×${p.binocularAperture}`],
          [p.finderFov, '◇'],
          [p.afovDeg / (p.focalLengthMm / p.eyepieceMm), `${p.eyepieceMm}mm`],
        ] as const;
        rings.forEach(([fov, label], i) => {
          ctx.setLineDash(i === 0 ? [6, 5] : i === 1 ? [2, 3] : []);
          ctx.beginPath();
          let active = false;
          for (let j = 0; j <= 120; j++) {
            const a = (j / 120) * Math.PI * 2,
              rad = (fov * DEG) / 2,
              v = c
                .clone()
                .multiplyScalar(Math.cos(rad))
                .addScaledVector(r, Math.sin(rad) * Math.cos(a))
                .addScaledVector(u, Math.sin(rad) * Math.sin(a));
            const pos = project([v.x, v.y, v.z]);
            if (!pos) {
              active = false;
              continue;
            }
            if (active) ctx.lineTo(pos.x, pos.y);
            else {
              ctx.moveTo(pos.x, pos.y);
              active = true;
            }
            if (j === 30 && pos.x >= 0 && pos.x < w && pos.y >= 0 && pos.y < h)
              ctx.fillText(`${label} ${fov.toFixed(1)}°`, pos.x + 5, pos.y - 5);
          }
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
      if (route) {
        const date = useClockStore.getState().now(),
          site = useLocationStore.getState().site;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        let active = false;
        for (const [i, s] of [route.start, ...route.steps.map((s) => s.to)].entries()) {
          const a = eqjToAltAzSlow(date, site, s.ra, s.dec, 'normal');
          const pos = project(altAzToScene(a.altDeg, a.azDeg));
          if (!pos) {
            active = false;
            continue;
          }
          if (active) ctx.lineTo(pos.x, pos.y);
          else ctx.moveTo(pos.x, pos.y);
          active = true;
          ctx.fillText(String(i), pos.x + 6, pos.y + 15);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    draw();
    const timer = window.setInterval(draw, 66);
    return () => clearInterval(timer);
  }, [enabled, route]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      data-testid="fov-overlay"
      hidden={!enabled && !route}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
