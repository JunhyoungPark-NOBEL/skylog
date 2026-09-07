/**
 * 화면 밖 목표 화살표 배치(task-03 §4): 목표 씬 벡터를 카메라 공간(카메라는 −Z를 봄, +Y 위)으로 옮긴 뒤,
 * 화면 평면 성분(x, −y)이 가리키는 방향으로 화면 중심에서 나가는 반직선과 (여백만큼 안쪽으로 줄인) 화면 사각형의 교점에 둔다.
 * 카메라 공간 x·y를 직접 쓰므로 뒤쪽(z>0) 목표도 **돌아야 할 방향**을 그대로 가리킨다 — 원근 투영(z로 나눔)을 거쳤다면
 * 부호가 뒤집혀 중심 대칭으로 되돌려야 했겠지만 여기서는 그 단계가 없다(task-03 §4의 "뒤집기"는 그 경우에 해당).
 */
export interface CameraVec {
  x: number;
  y: number;
  z: number;
}

export interface ArrowPlacement {
  x: number;
  y: number;
  /** 화살표 방향(도): 0 = 오른쪽, 90 = 아래(시계 방향, 화면 좌표) */
  angleDeg: number;
  behind: boolean;
}

/** 각도(라디안, 화면 좌표) 방향의 화면 가장자리 점 */
export function edgePoint(
  angleRad: number,
  width: number,
  height: number,
  margin: number,
): { x: number; y: number } {
  const cx = width / 2;
  const cy = height / 2;
  const hw = Math.max(1, cx - margin);
  const hh = Math.max(1, cy - margin);
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const tx = Math.abs(c) < 1e-9 ? Number.POSITIVE_INFINITY : hw / Math.abs(c);
  const ty = Math.abs(s) < 1e-9 ? Number.POSITIVE_INFINITY : hh / Math.abs(s);
  const t = Math.min(tx, ty);
  return { x: cx + c * t, y: cy + s * t };
}

/** 카메라 공간 목표 벡터 → 가장자리 화살표 위치·각도 */
export function placeEdgeArrow(
  v: CameraVec,
  width: number,
  height: number,
  margin = 28,
): ArrowPlacement {
  const behind = v.z > 0;
  let sx = v.x;
  let sy = -v.y;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    // 정확히 뒤쪽(또는 앞쪽): 방향이 정의되지 않으므로 아래로
    sx = 0;
    sy = 1;
  }
  const angle = Math.atan2(sy, sx);
  const p = edgePoint(angle, width, height, margin);
  return { x: p.x, y: p.y, angleDeg: (angle * 180) / Math.PI, behind };
}

/** 화면 안 여부(여백 포함) */
export function insideScreen(
  p: { x: number; y: number } | null,
  width: number,
  height: number,
  margin = 0,
): boolean {
  return !!p && p.x >= margin && p.x <= width - margin && p.y >= margin && p.y <= height - margin;
}
