// 은하수: 구(J2000 방향) → 행렬 → 굴절. 프래그먼트가 J2000 방향에서 UV를 계산한다.
uniform mat3 uEqjToScene;
uniform float uRefraction;
varying vec3 vDirJ2000;
varying float vAlt;
const float R = 130.0;
void main() {
  vec3 d = normalize(position);
  vDirJ2000 = d;
  vec3 p = normalize(uEqjToScene * d);
  vAlt = degrees(asin(clamp(p.y, -1.0, 1.0)));
  if (uRefraction > 0.5) p = skylogApplyRefraction(p);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p * R, 1.0);
}
