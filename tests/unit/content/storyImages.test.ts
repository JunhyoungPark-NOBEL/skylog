import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { Catalog } from '@/catalog/catalog';
import type { ContentIndex } from '@/content/schema';
import { getObjectPhoto } from '@/catalog/objectPhotos';
import { getStoryPhoto, getStorySkyChart, projectStoryPoint } from '@/features/content/storyImages';

const read = <T>(path: string): T => JSON.parse(readFileSync('public/data/' + path, 'utf8')) as T;
const stars = read<Catalog['stars']>('stars-bright.v1.json');
const dso = read<Catalog['dso']>('dso.v1.json');
const cat: Catalog = {
  stars,
  starById: new Map(stars.map((s) => [s.id, s])),
  starVectors: new Float32Array(),
  constellations: read('constellations.v1.json'),
  dso,
  dsoById: new Map(dso.map((d) => [d.id, d])),
  dsoVectors: new Float32Array(),
  bodies: [],
  bodyById: new Map(),
};
const entries = read<ContentIndex>('content/v1/index.json').entries;

it('121개 이야기는 정확히 일치하는 사진 또는 근거 있는 공동 사진/카탈로그 도해를 가진다', () => {
  const exact = entries.filter((e) => getObjectPhoto(e.id));
  const shared = entries.filter((e) => !getObjectPhoto(e.id) && getStoryPhoto(e.id));
  const charts = entries.filter((e) => !getStoryPhoto(e.id));
  expect(exact).toHaveLength(58);
  expect(shared.map((e) => e.id).sort()).toEqual(['dso:NGC869', 'dso:NGC884']);
  expect(charts).toHaveLength(61);
  for (const entry of charts) {
    const chart = getStorySkyChart(cat, entry.id);
    expect(chart, entry.id).not.toBeNull();
    expect(chart!.stars.length, entry.id).toBeGreaterThan(0);
    const points = [...chart!.stars, ...chart!.lines.flat()];
    for (const p of points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y), entry.id).toBe(true);
      expect(Math.hypot(p.x - 50, p.y - 50), entry.id).toBeLessThanOrEqual(42.000001);
    }
    expect(getStorySkyChart(cat, entry.id), '같은 카탈로그에서 결과를 재사용한다').toBe(chart);
  }
});

it('작은곰·용자리와 RA 0°를 지나는 별자리도 선 연결을 빠뜨리거나 뒤집지 않는다', () => {
  for (const entry of entries.filter((e) => e.kind === 'const')) {
    const chart = getStorySkyChart(cat, entry.id)!;
    const pattern = cat.constellations[entry.id.slice(6)]!;
    expect(chart.lines, entry.id).toHaveLength(
      pattern.lines.reduce((n, line) => n + line.length - 1, 0),
    );
    expect(chart.target).toBeNull();
  }
  const center = { raDeg: 0, decDeg: 0 };
  expect(projectStoryPoint(0, 0, center, 15)).toEqual({ x: 50, y: 50 });
  const east = projectStoryPoint(1, 0, center, 15)!;
  const west = projectStoryPoint(359, 0, center, 15)!;
  expect(east.x).toBeLessThan(50);
  expect(west.x).toBeGreaterThan(50);
  expect(50 - east.x).toBeCloseTo(west.x - 50, 8);
  expect(projectStoryPoint(0, 1, center, 15)!.y).toBeLessThan(50);
  expect(projectStoryPoint(15, 0, center, 15)!.x).toBeCloseTo(8, 8);
  expect(projectStoryPoint(16, 0, center, 15)).toBeNull();
  expect(projectStoryPoint(180, 0, center, 15)).toBeNull();
});

it('사진 없는 베가·토성성운의 표시는 실제 대상 중심이고 다른 천체 사진을 빌려 쓰지 않는다', () => {
  for (const id of ['star:HIP91262', 'dso:NGC7009', 'dso:NGC457'] as const) {
    expect(getStoryPhoto(id)).toBeUndefined();
    const object = cat.starById.get(id) ?? cat.dsoById.get(id)!;
    const chart = getStorySkyChart(cat, id)!;
    expect(chart.center).toEqual({ raDeg: object.ra, decDeg: object.dec });
    expect(chart.target).toEqual({ x: 50, y: 50 });
    expect(chart.fieldDeg).toBe(30);
  }
  expect(getStoryPhoto('const:Ori')).toBeUndefined();
  expect(getStoryPhoto('dso:NGC869')?.caption.en).toContain('both NGC 869 and NGC 884');
  expect(getStoryPhoto('dso:NGC884')?.objectId).toBe('dso:C14');
  expect(getStorySkyChart(cat, 'star:HIP999999')).toBeNull();
});
