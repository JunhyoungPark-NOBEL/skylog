// 선 레이어(별자리 선·경계·적도·황도·격자): 단위벡터 + 선택적 J2000→씬 행렬 + 굴절.
attribute float aDist; // 폴리라인 누적 각거리(도) — 대시 패턴용

uniform mat3 uEqjToScene;
uniform float uUseMatrix;  // 1: position은 J2000, 0: 이미 씬 프레임
uniform float uRefraction; // 0/1

varying float vDist;
varying float vAlt;

const float R = 100.0;

void main() {
  vec3 p = normalize(uUseMatrix > 0.5 ? uEqjToScene * position : position);
  vAlt = degrees(asin(clamp(p.y, -1.0, 1.0)));
  if (uRefraction > 0.5) p = skylogApplyRefraction(p);
  vDist = aDist;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p * R, 1.0);
}
