// DSO 기호(윤곽선): 은하 타원, 산개 점선 원, 구상 십자 원, 행성상 작은 원+점, 성운 사각, 잔해 대시 원.
precision highp float;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uPixelRatio;
varying float vCat;
varying float vAlpha;
varying float vSizePx;

float ringMask(float r, float radius, float w) {
  return 1.0 - smoothstep(w, w * 1.6, abs(r - radius));
}

void main() {
  if (vAlpha <= 0.0) discard;
  vec2 q = gl_PointCoord - vec2(0.5);          // −0.5..0.5
  float w = (1.2 * uPixelRatio) / vSizePx;       // 선 굵기(정규화)
  float m = 0.0;
  int cat = int(vCat + 0.5);
  if (cat == 0) {
    // 은하: 타원
    float r = length(vec2(q.x, q.y * 2.2));
    m = ringMask(r, 0.42, w);
  } else if (cat == 1) {
    // 산개성단: 점선 원
    float r = length(q);
    float ang = atan(q.y, q.x);
    float dash = step(0.5, fract(ang / 0.5236)); // 30° 주기
    m = ringMask(r, 0.42, w) * dash;
  } else if (cat == 2) {
    // 구상성단: 원 + 십자
    float r = length(q);
    m = ringMask(r, 0.42, w);
    m = max(m, (1.0 - smoothstep(w, w * 1.6, abs(q.x))) * step(r, 0.42));
    m = max(m, (1.0 - smoothstep(w, w * 1.6, abs(q.y))) * step(r, 0.42));
  } else if (cat == 3) {
    // 행성상성운: 작은 원 + 중심점 + 네 방향 짧은 선
    float r = length(q);
    m = ringMask(r, 0.25, w);
    m = max(m, 1.0 - smoothstep(w * 1.5, w * 2.5, r));
    float cross = (1.0 - smoothstep(w, w * 1.6, abs(q.x))) * step(0.3, abs(q.y)) * step(abs(q.y), 0.45);
    cross = max(cross, (1.0 - smoothstep(w, w * 1.6, abs(q.y))) * step(0.3, abs(q.x)) * step(abs(q.x), 0.45));
    m = max(m, cross);
  } else if (cat == 5) {
    // 초신성 잔해: 성긴 대시 원
    float r = length(q);
    float ang = atan(q.y, q.x);
    float dash = step(0.5, fract(ang / 1.0472)); // 60°
    m = ringMask(r, 0.42, w) * dash;
  } else {
    // 성운·기타: 사각
    vec2 a = abs(q);
    float box = max(a.x, a.y);
    m = ringMask(box, 0.38, w);
  }
  if (m <= 0.01) discard;
  gl_FragColor = vec4(uColor, m * vAlpha * uAlpha);
}
