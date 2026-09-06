precision highp float;
uniform float uNight;
uniform vec3 uNightColor;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vKind;
varying float vRingTilt;
varying float vSizePx;

void main() {
  vec2 q = (gl_PointCoord - vec2(0.5)) * 2.0; // −1..1
  float r = length(q);
  float a = 0.0;
  float edge = clamp(2.0 * uPixelRatio / vSizePx, 0.02, 0.3);
  if (vKind > 1.5) {
    // 토성: 원반(반지름 0.45) + 고리 타원(장반경 0.95, 단반경 0.95·sin(tilt))
    float disc = 1.0 - smoothstep(0.45 - edge, 0.45 + edge, r);
    float tilt = max(sin(radians(vRingTilt)), 0.06);
    float er = length(vec2(q.x / 0.95, q.y / (0.95 * tilt)));
    float ring = (1.0 - smoothstep(0.0, edge * 3.0, abs(er - 1.0) - 0.12)) * step(0.55, er * 0.95 * max(tilt, 0.5) + 0.5 * r);
    a = max(disc, ring * 0.85);
  } else if (vKind > 0.5) {
    // 태양: 원반 + 넓은 글로우
    float disc = 1.0 - smoothstep(0.35 - edge, 0.35 + edge, r);
    float glow = exp(-r * r * 2.5) * 0.7;
    a = clamp(disc + glow, 0.0, 1.0);
  } else {
    float disc = 1.0 - smoothstep(0.55 - edge, 0.55 + edge, r);
    float glow = exp(-r * r * 4.0) * 0.35;
    a = clamp(disc + glow, 0.0, 1.0);
  }
  if (a <= 0.01) discard;
  vec3 c = vColor;
  if (uNight > 0.5) c = uNightColor * dot(vColor, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(c, a);
}
