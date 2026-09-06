// 공용 GLSL 청크: 대기 굴절 (Sæmundsson 1986, 1010 hPa·10 °C).
// src/astro/refraction.ts의 saemundssonRefractionDeg와 동일한 식 — 한쪽을 바꾸면 다른 쪽도 바꾼다.
// 사용: 정점 셰이더에서 씬 벡터(+X 동, +Y 천정, +Z 남)의 고도를 겉보기 고도로 올린다.
//   vec3 p = skylogApplyRefraction(dir);   // dir: 단위벡터(굴절 없음)
#ifndef SKYLOG_REFRACTION_GLSL
#define SKYLOG_REFRACTION_GLSL

// 참 고도(도) → 굴절량(도). 지평선 아래는 -1°에서 고정.
float skylogRefractionDeg(float trueAltDeg) {
  float h = max(trueAltDeg, -1.0);
  float x = radians(h + 10.3 / (h + 5.11));
  return (1.02 / tan(x)) / 60.0;
}

float skylogApparentAltDeg(float trueAltDeg) {
  return trueAltDeg + skylogRefractionDeg(trueAltDeg);
}

// 씬 단위벡터에 굴절 적용: 방위는 그대로, 고도만 올린다.
vec3 skylogApplyRefraction(vec3 dir) {
  float alt = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float altApp = radians(skylogApparentAltDeg(alt));
  float horiz = length(dir.xz);
  vec2 az = horiz > 1e-6 ? dir.xz / horiz : vec2(0.0, -1.0);
  float c = cos(altApp);
  return vec3(az.x * c, sin(altApp), az.y * c);
}

#endif
