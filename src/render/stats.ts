/**
 * 렌더 통계(디버그 HUD가 읽음). T1의 렌더 루프가 프레임마다 채운다.
 * 객체를 교체하지 말고 필드만 갱신한다(HUD가 참조를 들고 있음).
 */
export interface RenderStats {
  drawCalls: number;
  triangles: number;
  points: number;
  /** 렌더러가 마지막으로 보고한 프레임 시간(ms) */
  renderMs: number;
}

export const renderStats: RenderStats = {
  drawCalls: 0,
  triangles: 0,
  points: 0,
  renderMs: 0,
};
