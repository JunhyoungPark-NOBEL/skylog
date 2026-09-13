import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import {
  alignThree,
  pointingDirection,
  physicalQuaternion,
  type AlignmentSample,
  type QTuple,
} from '@/astro/pointing';
import { deviceOrientationToScene, yawQuaternion } from '@/sensors/orientation/math';
import { angularSeparation, type Vec3 } from '@/astro/coords';
import {
  sameObservingSite,
  usableTelescopeAlignment,
  calibratedHandheldQuaternion,
} from '@/sensors/telescopeAlignment';
import { averageAlignmentPose } from '@/sensors/stableAlignmentCapture';
import type { TelescopeReading } from '@/sensors/telescopePose';
import type { SavedAlignment } from '@/state/telescopeStore';
import { navigationLabel } from '@/ui/navigationLabel';

const model = {
  yawDeg: -73,
  axis: new Vector3(0.06, 1, -0.035).normalize().toArray() as Vec3,
  residualDeg: 0,
  maxResidualDeg: 0,
};
const poses = [
  [270, 28, 0],
  [185, 62, 5],
  [80, 40, -12],
] as const;
const samples: AlignmentSample[] = poses.map(([a, b, g], i) => {
  const q = deviceOrientationToScene(a, b, g).toArray() as QTuple;
  return {
    q,
    direction: pointingDirection(q, model),
    objectId: `star:HIP${i + 1}`,
    at: `2026-09-13T12:0${i}:00Z`,
  };
});
const site = { name: '대전', lat: 36.37, lon: 127.36, elevation: 70 };
const reading: TelescopeReading = {
  q: samples[0]!.q,
  mode: 'relative',
  status: 'active',
  source: 'test',
  at: 10000,
  sampleMs: 500,
  sessionId: 'setup',
  headingReady: false,
};
const saved: SavedAlignment = {
  model,
  samples,
  method: 'three-star-v1',
  site,
  at: samples[0]!.at,
  sessionId: 'setup',
  provider: 'test',
  profileKey: 'tube',
};

describe('세 별로 장착축과 상대 센서 방향 맞추기', () => {
  it('세 별을 함께 맞추고 미사용 방향에서도 축·방위를 복원한다', () => {
    const fitted = alignThree(samples, 6);
    expect(fitted.yawDeg).toBeCloseTo(model.yawDeg, 4);
    expect(angularSeparation(fitted.axis, model.axis)).toBeLessThan(0.0001);
    for (const a of [0, 90, 180, 270])
      for (const b of [10, 45, 85]) {
        const q = deviceOrientationToScene(a, b, 17).toArray() as QTuple;
        expect(
          angularSeparation(pointingDirection(q, fitted), pointingDirection(q, model)),
        ).toBeLessThan(0.0001);
      }
  });
  it('측정 잡음과 세 번째 별의 불일치를 검사한다', () => {
    const noisy = structuredClone(samples);
    noisy[2]!.direction = new Vector3(...noisy[2]!.direction)
      .applyQuaternion(yawQuaternion(0.25))
      .toArray() as Vec3;
    expect(alignThree(noisy, 6).maxResidualDeg).toBeLessThan(0.3);
    noisy[2]!.direction = new Vector3(...noisy[2]!.direction)
      .applyQuaternion(yawQuaternion(6))
      .toArray() as Vec3;
    expect(() => alignThree(noisy, 6)).toThrow();
  });
  it('중복·가까운 별·비정상 입력·태양·두 별만으로는 완료하지 않는다', () => {
    for (const invalid of [
      samples.slice(0, 2),
      [samples[0]!, samples[1]!, samples[0]!],
      [samples[0]!, samples[1]!, { ...samples[0]!, objectId: 'star:HIP4' }],
      [samples[0]!, samples[1]!, { ...samples[2]!, objectId: 'sun' }],
      [samples[0]!, samples[1]!, { ...samples[2]!, q: [NaN, 0, 0, 1] as QTuple }],
    ])
      expect(() => alignThree(invalid, 6)).toThrow();
  });
});
describe('설치 재사용과 고정 관측지', () => {
  it('다른 목표·시각으로 이동해도 살아 있는 같은 센서 기준을 재사용한다', () => {
    expect(usableTelescopeAlignment(saved, reading, 'tube', site, 10100)).toBe(saved);
    expect(
      usableTelescopeAlignment(
        saved,
        { ...reading, at: 300000 },
        'tube',
        { ...site, lat: site.lat + 0.0001 },
        300020,
      ),
    ).toBe(saved);
    expect(saved.site).toEqual(site);
  });
  it('센서 재시작·오래된 입력·장소·경통 변경·구형 저장값을 재사용하지 않는다', () => {
    for (const r of [
      { ...reading, sessionId: 'new' },
      { ...reading, source: 'other' },
      { ...reading, mode: 'automatic' as const },
      { ...reading, status: 'off' as const },
    ])
      expect(usableTelescopeAlignment(saved, r, 'tube', site, 10100)).toBeNull();
    expect(usableTelescopeAlignment(saved, reading, 'tube', site, 12000)).toBeNull();
    expect(usableTelescopeAlignment(saved, reading, 'other', site, 10100)).toBeNull();
    expect(
      usableTelescopeAlignment(saved, reading, 'tube', { ...site, lat: 37 }, 10100),
    ).toBeNull();
    expect(
      usableTelescopeAlignment({ ...saved, method: undefined }, reading, 'tube', site, 10100),
    ).toBeNull();
    expect(sameObservingSite(site, { ...site, lat: NaN })).toBe(false);
  });
  it('공유한 육안 자세는 경통 축을 넣지 않고 모든 화면 회전에서 진북을 유지한다', () => {
    for (const screen of [0, 90, 180, 270]) {
      const q = calibratedHandheldQuaternion(samples[0]!.q, model.yawDeg, screen);
      const physical = physicalQuaternion(q, screen);
      const expected = new Quaternion(...samples[0]!.q).premultiply(yawQuaternion(model.yawDeg));
      expect(physical.angleTo(expected)).toBeLessThan(1e-7);
    }
  });
});
describe('파인더 중앙 확인의 안정된 평균', () => {
  const stable = () =>
    Array.from({ length: 18 }, (_, i) => ({
      ...reading,
      at: 10000 + i * 35,
      sampleMs: 500 + i * 35,
      q: new Quaternion(...reading.q!)
        .premultiply(yawQuaternion(Math.sin(i) * 0.03))
        .toArray() as QTuple,
    }));
  it('정지 잡음과 쿼터니언 부호 반전을 평균 낸다', () => {
    const records = stable();
    records[5]!.q = records[5]!.q!.map((v) => -v) as QTuple;
    const pose = averageAlignmentPose(records, 0.3);
    expect(
      (new Quaternion(...pose.q).angleTo(new Quaternion(...reading.q!)) * 180) / Math.PI,
    ).toBeLessThan(0.01);
    expect(pose.at).toBe(10297.5);
  });
  it('경통 이동·센서 중단·적은 표본·재전송을 거부한다', () => {
    const moved = stable();
    moved[10]!.q = new Quaternion(...reading.q!).premultiply(yawQuaternion(1)).toArray() as QTuple;
    expect(() => averageAlignmentPose(moved, 0.3)).toThrow();
    const changed = stable();
    changed[4]!.sessionId = 'new';
    expect(() => averageAlignmentPose(changed, 0.3)).toThrow();
    const duplicate = stable();
    duplicate[4]!.sampleMs = duplicate[3]!.sampleMs;
    expect(() => averageAlignmentPose(duplicate, 0.3)).toThrow();
    expect(() => averageAlignmentPose(stable().slice(0, 3), 0.3)).toThrow();
  });
});
it('목표 안내의 한국어 조사를 자연스럽게 붙인다', () => {
  expect(navigationLabel('포말하우트', 'ko')).toBe('포말하우트로');
  expect(navigationLabel('달', 'ko')).toBe('달로');
  expect(navigationLabel('토성', 'ko')).toBe('토성으로');
  expect(navigationLabel('M31', 'ko')).toBe('M31 방향');
  expect(navigationLabel('Fomalhaut', 'en')).toBe('Toward Fomalhaut');
});
