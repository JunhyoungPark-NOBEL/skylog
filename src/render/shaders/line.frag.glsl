precision highp float;

uniform vec3 uColor;
uniform float uAlpha;
uniform float uDashDeg;      // 0이면 실선, 아니면 이 주기(도)의 절반만 그림
uniform float uFadeBelowHorizon; // 1: 지평선 아래 페이드

varying float vDist;
varying float vAlt;

void main() {
  if (uDashDeg > 0.0 && fract(vDist / uDashDeg) > 0.5) discard;
  float a = uAlpha;
  if (uFadeBelowHorizon > 0.5) a *= step(0.0, vAlt);
  gl_FragColor = vec4(uColor, a);
}
