// 하늘 배경: 태양 고도에 따른 낮/박명/밤 그라디언트 + 태양 쪽 지평선 밝음. 야간 모드는 순검정.
precision highp float;
uniform vec3 uBaseColor;   // 밤 하늘(테마 --bg)
uniform vec3 uSunDir;      // 씬 프레임 태양 방향(단위)
uniform float uSunAltDeg;
uniform float uAtmosphere; // 0/1
uniform float uNight;      // 0/1
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float alt = degrees(asin(clamp(d.y, -1.0, 1.0)));
  vec3 color = uBaseColor;
  if (uNight < 0.5 && uAtmosphere > 0.5) {
    float dayF = smoothstep(-6.0, 4.0, uSunAltDeg);
    float twiF = smoothstep(-18.0, -6.0, uSunAltDeg) * (1.0 - dayF);
    float horizonW = pow(1.0 - clamp(alt / 90.0, 0.0, 1.0), 3.0);
    vec2 dxz = d.xz;
    vec2 sxz = uSunDir.xz;
    float sunSide = 0.5 + 0.5 * dot(normalize(dxz + vec2(1e-5)), normalize(sxz + vec2(1e-5)));
    // 낮
    vec3 zenithDay = vec3(0.30, 0.55, 0.92);
    vec3 horizonDay = vec3(0.72, 0.82, 0.95);
    vec3 day = mix(horizonDay, zenithDay, clamp(alt / 60.0, 0.0, 1.0));
    // 박명: 남색 → 태양 쪽 지평선 주황
    vec3 navy = vec3(0.05, 0.07, 0.20);
    vec3 orange = vec3(0.95, 0.55, 0.28);
    vec3 twi = mix(navy, orange, horizonW * pow(sunSide, 2.5));
    // 시민박명(−6~0)은 twi와 day 사이
    float civil = smoothstep(-6.0, 0.0, uSunAltDeg);
    vec3 dusk = mix(twi, day, civil * 0.6);
    color = mix(color, dusk, twiF);
    color = mix(color, day, dayF);
    // 지평선 아래는 어둡게
    color *= mix(1.0, 0.35, smoothstep(0.0, -10.0, alt));
  }
  gl_FragColor = vec4(color, 1.0);
}
