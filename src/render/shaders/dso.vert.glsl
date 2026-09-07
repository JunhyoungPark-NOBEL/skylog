// DSO 심볼: J2000 방향 + 카테고리 + 각크기. 크기는 각지름/픽셀각(최소 10px).
attribute float aCat;      // 0 galaxy, 1 openCluster, 2 globular, 3 planetaryNebula, 4 nebula, 5 snr, 6 other
attribute float aMag;      // 999 = 미상
attribute float aSizeArcmin;
attribute float aMessier;  // 0/1

uniform float uShowBelowHorizon;
uniform mat3 uEqjToScene;
uniform float uRefraction;
uniform float uPixelRatio;
uniform float uDegPerPixel;
uniform float uMagLimit;      // 이보다 밝은(작은) 등급만 표시; 메시에는 uMessierLimit
uniform float uMessierLimit;

varying float vCat;
varying float vAlpha;
varying float vSizePx;

const float R = 100.0;

void main() {
  vec3 p = normalize(uEqjToScene * position);
  float alt = degrees(asin(clamp(p.y, -1.0, 1.0)));
  if (uRefraction > 0.5) p = skylogApplyRefraction(p);

  bool show = (aMessier > 0.5) ? (aMag <= uMessierLimit) : (aMag <= uMagLimit);
  float alpha = show ? 1.0 : 0.0;
  if (uShowBelowHorizon < 0.5) alpha *= step(0.0, alt);

  float angPx = (aSizeArcmin / 60.0) / max(uDegPerPixel, 1e-6);
  float size = clamp(angPx, 7.0, 48.0) * uPixelRatio;

  vCat = aCat;
  vAlpha = alpha;
  vSizePx = size;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p * R, 1.0);
  gl_PointSize = alpha > 0.0 ? size : 0.0;
}
