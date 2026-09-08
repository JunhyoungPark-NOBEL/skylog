precision highp float;
uniform sampler2D uMap;   // 등적색 회색조: u = RA/360, v = 0.5 + Dec/180 (flipY 기준)
uniform vec3 uColor;
uniform float uAlpha;
uniform float uNight;
varying vec3 vDirJ2000;
varying float vAlt;
const float PI = 3.141592653589793;

// J2000 방향에 고정된 잔잔한 성간 먼지 표현. 애니메이션/무작위 별을 만들지 않는다.
float cloudNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec4 n = vec4(dot(i, vec3(1.0, 157.0, 113.0))) + vec4(0.0, 1.0, 157.0, 158.0);
  vec4 lo = fract(sin(n) * 43758.5453);
  vec4 hi = fract(sin(n + 113.0) * 43758.5453);
  vec4 z = mix(lo, hi, f.z);
  return mix(mix(z.x, z.y, f.x), mix(z.z, z.w, f.x), f.y);
}
void main() {
  // 원래 알파가0인 픽셀은 먼지 무늬 계산을 생략한다. 희미한 윤곽은 자르지 않는다.
  if (uAlpha <= 0.0 || vAlt <= -6.0) discard;
  vec3 direction = normalize(vDirJ2000);
  float ra = atan(direction.y, direction.x);          // −π..π
  float u = fract(ra / (2.0 * PI));                   // 0..1, RA 0 → 0
  float dec = asin(clamp(direction.z, -1.0, 1.0));    // −π/2..π/2
  float v = 0.5 + dec / PI;
  float b = texture2D(uMap, vec2(u, v)).r;
  if (b <= 0.0) discard;
  float clouds = cloudNoise(direction * 32.0) * 0.65 + cloudNoise(direction * 83.0) * 0.35;
  // 원본 밝기·색·알파를 반복 곱하면 대부분의 은하수가 검정에 묻힌다. 윤곽을 감마 보정해 한 번만 감광한다.
  float density = sqrt(b) * mix(0.85, 1.15, clouds);
  float a = density * uAlpha * smoothstep(-6.0, -1.0, vAlt);
  // 원본 윤곽/밝기 안에만 청보라·은은한 청록과 흰 성운결을 더한다. 위치·범위는 팩을 따른다.
  vec3 tint = mix(vec3(0.60, 0.64, 0.85), vec3(0.50, 0.70, 0.86), clouds);
  tint = mix(tint, vec3(0.96, 0.87, 0.82), smoothstep(0.32, 0.7, b));
  vec3 color = mix(uColor, tint, 0.9);
  if (uNight > 0.5) color = vec3(max(uColor.r, 0.58), 0.0, 0.0) * (0.7 + density * 0.3);
  gl_FragColor = vec4(color, a);
}
