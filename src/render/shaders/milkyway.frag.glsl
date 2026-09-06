precision highp float;
uniform sampler2D uMap;   // 등적색 회색조: u = RA/360, v = 0.5 + Dec/180 (flipY 기준)
uniform vec3 uColor;
uniform float uAlpha;
varying vec3 vDirJ2000;
varying float vAlt;
const float PI = 3.141592653589793;
void main() {
  float ra = atan(vDirJ2000.y, vDirJ2000.x);          // −π..π
  float u = fract(ra / (2.0 * PI));                   // 0..1, RA 0 → 0
  float dec = asin(clamp(vDirJ2000.z, -1.0, 1.0));    // −π/2..π/2
  float v = 0.5 + dec / PI;
  float b = texture2D(uMap, vec2(u, v)).r;
  float a = b * uAlpha * smoothstep(-6.0, -1.0, vAlt);
  gl_FragColor = vec4(uColor * b, a);
}
