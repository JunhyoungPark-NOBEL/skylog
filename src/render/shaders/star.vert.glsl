// 별 정점 셰이더: J2000 단위벡터 → uEqjToScene(mat3) → 굴절 → 투영. 크기는 등급·FOV 기반(픽셀).
// #include 청크는 StarLayer.ts가 문자열로 앞에 붙인다(refraction.glsl, common.glsl).
attribute float aMag;
attribute float aBv;

uniform mat3 uEqjToScene;
uniform float uPixelRatio;
uniform float uFovDeg;        // 짧은 변 기준
uniform float uLimitingMag;   // 이보다 어두운 별은 페이드
uniform float uShowBelowHorizon;
uniform float uExtinction;    // 0/1
uniform float uRefraction;    // 0/1
uniform float uMinSizePx;     // 서브픽셀 별의 최소 크기(보통 1)
uniform float uMaxSizePx;     // 상한(보통 14)
uniform float uSizeScale;     // s0 (mag 0 기준 픽셀 크기, 보통 3)

varying vec3 vColorBv;
varying float vAlpha;
varying float vSize;
varying float vMag;

const float R = 100.0;

void main() {
  vec3 p = normalize(uEqjToScene * position);
  float trueAlt = degrees(asin(clamp(p.y, -1.0, 1.0)));
  if (uRefraction > 0.5) p = skylogApplyRefraction(p);

  // 크기: s0 · 10^(−0.2·mag), FOV가 좁아지면 커짐 (√(60/FOV), 0.7~3.5배)
  float fovScale = clamp(sqrt(60.0 / max(uFovDeg, 1.0)), 0.7, 3.5);
  float s0 = uSizeScale * uPixelRatio * fovScale;
  float size = s0 * pow(10.0, -0.2 * aMag);

  // 소광: 지평선 근처 어두워짐 → 크기와 알파 둘 다 줄인다
  float extMag = uExtinction > 0.5 ? skylogExtinctionMag(trueAlt) : 0.0;
  if (uShowBelowHorizon > 0.5 && trueAlt < 0.0) extMag *= smoothstep(-6.0, 0.0, trueAlt);
  float effMag = aMag + extMag;
  size = s0 * pow(10.0, -0.2 * effMag);

  float alpha = 1.0;
  if (size < uMinSizePx) {
    alpha = max(size / uMinSizePx, 0.0);
    size = uMinSizePx;
  }
  size = min(size, uMaxSizePx * uPixelRatio);
  // 한계등급 페이드(±0.5등급 구간)
  alpha *= 1.0 - smoothstep(uLimitingMag - 0.5, uLimitingMag + 0.5, effMag);
  // 지평선 아래 2° 이하는 숨김(땅이 투명해도 지구 뒤편은 그리지 않음)
  if (uShowBelowHorizon < 0.5) alpha *= step(0.0, trueAlt);

  vColorBv = skylogBvToRgb(aBv);
  vAlpha = alpha;
  vSize = size;
  vMag = effMag;

  vec4 mv = modelViewMatrix * vec4(p * R, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size;
}
