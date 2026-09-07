// 행성·태양 스프라이트: 위치는 이미 씬 프레임(굴절 포함, CPU 계산). 크기는 픽셀.
uniform float uShowBelowHorizon;
varying float vVisibility;
attribute float aSizePx;
attribute vec3 aColor;
attribute float aKind;      // 0 행성, 1 태양, 2 토성(고리 힌트)
attribute float aRingTilt;  // 토성 고리 기울기(도, |B|)

varying vec3 vColor;
varying float vKind;
varying float vRingTilt;
varying float vSizePx;

const float R = 98.0;

void main() {
  vVisibility = aSizePx > 0.0 && (uShowBelowHorizon > 0.5 || position.y >= 0.0) ? 1.0 : 0.0;
  vColor = aColor;
  vKind = aKind;
  vRingTilt = aRingTilt;
  vSizePx = aSizePx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(normalize(position) * R, 1.0);
  gl_PointSize = aSizePx;
}
