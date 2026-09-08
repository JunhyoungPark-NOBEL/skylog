// 별 프래그먼트: 부드러운 원반 + 밝은 별(mag < 1.5) 가우시안 글로우. 야간 모드는 적색 단색.
precision highp float;

uniform float uSaturation;
uniform float uNight;        // 0/1
uniform vec3 uNightColor;
uniform float uGlobalAlpha;

varying vec3 vColorBv;
varying float vAlpha;
varying float vSize;
varying float vMag;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0; // 0 중심, 1 가장자리
  if (r > 1.0) discard;

  // 코어: 크기가 클수록 코어가 뚜렷, 작을수록 전체가 부드럽게
  float core = 1.0 - smoothstep(0.42, 0.92, r);
  float glowAmount = clamp((1.5 - vMag) / 3.0, 0.0, 1.0); // mag 1.5 이하부터 글로우
  float glow = exp(-r * r * 3.0) * glowAmount * 0.6;
  float intensity = clamp(core + glow, 0.0, 1.0);

  vec3 color = skylogSaturate(vColorBv, uSaturation);
  // 밝은 중심에도 B−V 색을 남긴다. 최대 채도에서 청백색·주황색 별이 흰 점으로 같아지지 않는다.
  color = mix(color, vec3(1.0), (1.0 - smoothstep(0.0, 0.55, r)) * 0.22);
  if (uNight > 0.5) {
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = uNightColor * lum;
  }
  gl_FragColor = vec4(color, intensity * vAlpha * uGlobalAlpha);
}
