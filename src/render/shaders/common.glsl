// 공용 GLSL 청크: B−V 색지수 → RGB, 소광, 팔레트 혼합.
// Mitchell Charity의 B−V→RGB 표(https://www.vendian.org/mncharity/dir3/starcolor/)를 8점 구간선형으로 근사.
#ifndef SKYLOG_COMMON_GLSL
#define SKYLOG_COMMON_GLSL

vec3 skylogBvToRgb(float bv) {
  // 구간: -0.40 청백, 0.00 흰-청, 0.30 흰, 0.60 노랑-흰, 0.90 노랑, 1.20 주황, 1.60 주황-빨강, 2.00 빨강
  vec3 c0 = vec3(0.61, 0.70, 1.00);
  vec3 c1 = vec3(0.80, 0.86, 1.00);
  vec3 c2 = vec3(0.97, 0.97, 1.00);
  vec3 c3 = vec3(1.00, 0.96, 0.87);
  vec3 c4 = vec3(1.00, 0.90, 0.72);
  vec3 c5 = vec3(1.00, 0.82, 0.58);
  vec3 c6 = vec3(1.00, 0.70, 0.42);
  vec3 c7 = vec3(1.00, 0.55, 0.30);
  float t = clamp(bv, -0.4, 2.0);
  if (t < 0.0)  return mix(c0, c1, (t + 0.4) / 0.4);
  if (t < 0.3)  return mix(c1, c2, t / 0.3);
  if (t < 0.6)  return mix(c2, c3, (t - 0.3) / 0.3);
  if (t < 0.9)  return mix(c3, c4, (t - 0.6) / 0.3);
  if (t < 1.2)  return mix(c4, c5, (t - 0.9) / 0.3);
  if (t < 1.6)  return mix(c5, c6, (t - 1.2) / 0.4);
  return mix(c6, c7, (t - 1.6) / 0.4);
}

// 채도 조절(0 = 흰색, 1 = 원색)
vec3 skylogSaturate(vec3 rgb, float s) {
  float l = dot(rgb, vec3(0.299, 0.587, 0.114));
  return mix(vec3(l), rgb, s);
}

// 대기 소광(등급): 참 고도(도) → Kasten–Young 대기질량, k = 0.25 mag/airmass. 지평선 아래는 큰 값.
float skylogExtinctionMag(float altDeg) {
  if (altDeg <= 0.0) return 4.0;
  float z = radians(90.0 - altDeg);
  float am = 1.0 / (cos(z) + 0.50572 * pow(96.07995 - (90.0 - altDeg), -1.6364));
  return 0.25 * max(am - 1.0, 0.0);
}

#endif
