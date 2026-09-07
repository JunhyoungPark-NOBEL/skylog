import { useEffect, useState } from 'react';
import { renderStats } from '@/render/stats';

interface HudSample {
  fps: number;
  frameMs: number;
  drawCalls: number;
}

/**
 * 디버그 HUD (task-00 §3.6). rAF 기반 fps·프레임 시간 + 렌더러가 보고한 draw call.
 * 이후 모든 성능 수용 기준은 이 값으로 측정한다(DevTools 대신).
 * 상태 캡슐 아래 왼쪽에 작은 유리 칩으로 띄운다(오른쪽은 하늘 뷰 컨트롤 클러스터 자리).
 */
export function DebugHud() {
  const [sample, setSample] = useState<HudSample>({ fps: 0, frameMs: 0, drawCalls: 0 });

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let windowStart = performance.now();
    let last = windowStart;
    let maxFrame = 0;

    const tick = (now: number) => {
      frames += 1;
      maxFrame = Math.max(maxFrame, now - last);
      last = now;
      const elapsed = now - windowStart;
      if (elapsed >= 500) {
        setSample({
          fps: Math.round((frames * 1000) / elapsed),
          frameMs: Math.round(maxFrame * 10) / 10,
          drawCalls: renderStats.drawCalls,
        });
        frames = 0;
        maxFrame = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      data-testid="debug-hud"
      className="glass-sm pointer-events-none fixed left-3 top-[calc(env(safe-area-inset-top)+8px)] z-50 rounded-sm px-2.5 py-1.5 font-mono text-caption leading-tight text-fg tabular-nums shadow-[inset_0_0_0_1px_var(--hairline)]"
    >
      <div>{sample.fps} fps</div>
      <div>{sample.frameMs.toFixed(1)} ms</div>
      <div>{sample.drawCalls} draw</div>
    </div>
  );
}
