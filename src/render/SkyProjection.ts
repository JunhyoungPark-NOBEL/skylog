import * as THREE from 'three';
import { hemisphereRadiusPx } from '@/render/projection';

/** 기존 굴절·조명 계산 뒤에 공통 입체 투영을 적용한다. 달/땅의 Three 기본 재질도 포함한다. */
export class SkyProjection {
  private readonly uniforms = {
    uSkylogScale: { value: new THREE.Vector2(1, 1) },
    uSkylogViewport: { value: new THREE.Vector2(1, 1) },
    uSkylogRadius: { value: 1 },
  };

  attach(scene: THREE.Scene): void {
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Points ||
        object instanceof THREE.Line
      ) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(material);
      }
    });
    for (const material of materials) {
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, this.uniforms);
        shader.vertexShader = `uniform vec2 uSkylogScale;\nvarying float vSkylogFacing;\n${shader.vertexShader}`;
        // 원래 clip 벡터에서 카메라 좌표를 복원하므로 모든 재질의 기존 위치 계산을 유지한다.
        const end = shader.vertexShader.lastIndexOf('}');
        shader.vertexShader = `${shader.vertexShader.slice(0, end)}
          vec3 skylogView = vec3(gl_Position.x / projectionMatrix[0][0], gl_Position.y / projectionMatrix[1][1], -gl_Position.w);
          vec3 skylogDirection = normalize(skylogView);
          vSkylogFacing = -skylogDirection.z;
          vec2 skylogProjected = skylogDirection.xy / max(0.00001, 1.0 - skylogDirection.z);
          float skylogDepth = gl_Position.z / (abs(gl_Position.w) < 0.00001 ? 0.00001 : gl_Position.w);
          gl_Position = vec4(skylogProjected * uSkylogScale, clamp(skylogDepth, -0.9999, 0.9999), 1.0);
        ${shader.vertexShader.slice(end)}`;
        shader.fragmentShader = `uniform vec2 uSkylogViewport;\nuniform float uSkylogRadius;\nvarying float vSkylogFacing;\n${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace(
          /void\s+main\s*\(\s*\)\s*\{/,
          `void main() {
          if (vSkylogFacing < -0.00001 || distance(gl_FragCoord.xy, uSkylogViewport * 0.5) > uSkylogRadius) discard;
        `,
        );
      };
      material.customProgramCacheKey = () => 'skylog-stereographic-v1';
      material.needsUpdate = true;
    }
  }

  update(fovDeg: number, width: number, height: number, pixelRatio: number): void {
    const radius = hemisphereRadiusPx(fovDeg, width, height);
    this.uniforms.uSkylogScale.value.set((2 * radius) / width, (2 * radius) / height);
    this.uniforms.uSkylogViewport.value.set(width * pixelRatio, height * pixelRatio);
    this.uniforms.uSkylogRadius.value = radius * pixelRatio;
  }
}
