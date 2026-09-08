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
  // 낮은 원본 밝기를 sqrt로 키우면 넓은 면이 흰 안개가 된다. 바깥 윤곽은 약하게 남기고
  // 밝은 원본 능선에 광량을 집중한다. 데이터의 범위·좌표와 단계별 밝기 순서는 유지한다.
  float ridge = sqrt(smoothstep(0.28, 0.58, b));
  float envelope = b * b * 0.12 + ridge * 0.85;
  // 같은 두 노이즈 샘플로 밝은 결 사이 먼지 틈을 만든다. 강도를 높여도 대비는 그대로다.
  float dust = mix(0.22, 1.0, smoothstep(0.36, 0.60, clouds));
  float density = min(envelope * dust, 0.92);
  float a = density * uAlpha * smoothstep(-6.0, -1.0, vAlt);
  // 차가운 외곽과 따뜻한 중심 능선을 구분한다. 흰색을 섞지 않아100%에서도 색이 남는다.
  vec3 tint = mix(vec3(0.24, 0.29, 0.53), vec3(0.26, 0.46, 0.64), clouds);
  tint = mix(tint, vec3(0.72, 0.53, 0.40), ridge * 0.70);
  vec3 color = mix(uColor, tint, 0.92);
  if (uNight > 0.5) color = vec3(max(uColor.r, 0.58), 0.0, 0.0);
  gl_FragColor = vec4(color, a);
}
