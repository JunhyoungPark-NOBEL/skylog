import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HistoryDiagram from '@/features/learn/HistoryDiagram';
import { HISTORY_QUESTS } from '@/learn/historyQuests';
import {
  HISTORY_DIAGRAM_KEYS,
  cepheidMagnitude,
  ellipseAt,
  hubbleTeachingPoints,
  linearScale,
  sahaLogRatio,
  sampledPath,
  sampleRange,
  whiteDwarfRadiusRatio,
} from '@/learn/historyDiagramGeometry';

describe('역사 문제 도해의 수학 관계', () => {
  it('타원 위 점과 초점은 같은 등축 기하를 사용한다', () => {
    for (const e of [0, 0.3, 0.6, 0.9]) {
      for (const angle of sampleRange(0, Math.PI * 2, 32)) {
        const p = ellipseAt(96, e, angle);
        expect((p.x / 96) ** 2 + (p.y / p.b) ** 2).toBeCloseTo(1, 12);
        expect(Math.hypot(p.x - p.focusX, p.y) + Math.hypot(p.x + p.focusX, p.y)).toBeCloseTo(
          192,
          10,
        );
      }
    }
  });
  it('이심근점이각은 중심의 보조원 각도이고 초점의 진근점이각과 다르다', () => {
    const p = ellipseAt(96, 0.6, Math.PI / 2);
    expect(Math.atan2(p.auxiliaryY, p.auxiliaryX)).toBeCloseTo(Math.PI / 2, 12);
    expect(p.auxiliaryX).toBeCloseTo(p.x, 12);
    expect(p.auxiliaryY).toBeGreaterThan(p.y);
    expect(Math.atan2(p.y, p.x - p.focusX)).not.toBeCloseTo(Math.PI / 2, 3);
  });
  it('로그 주기 한 자릿수마다 교육용 절대등급은 2.76씩 감소한다', () => {
    for (const p of [1, 2, 5, 10])
      expect(cepheidMagnitude(p * 10) - cepheidMagnitude(p)).toBeCloseTo(-2.76, 12);
    expect(cepheidMagnitude(10)).toBeCloseTo(-4.16, 12);
    // 더 음수인 등급이 SVG에서는 위로 이동한다.
    expect(linearScale(-7, 0, -8, 176, 42)).toBeLessThan(linearScale(-2, 0, -8, 176, 42));
  });
  it('이온화 로그비는 같은 온도에서 0이고 반대 온도 교환 시 부호가 바뀐다', () => {
    expect(sahaLogRatio(6000)).toBe(0);
    expect(sahaLogRatio(10000, 6000)).toBeCloseTo(-sahaLogRatio(6000, 10000), 12);
    const sampled = sampleRange(6000, 10000).map((t) => sahaLogRatio(t));
    expect(sampled.every((v, i) => i === 0 || v > (sampled[i - 1] ?? Infinity))).toBe(true);
    // 별도 직접 지수식을 사용해 로그 변환을 검산한다.
    const rate = (t: number) => t ** 1.5 * Math.exp(-13.6 / (8.617333262e-5 * t));
    expect(sahaLogRatio(10000)).toBeCloseTo(Math.log(rate(10000) / rate(6000)), 12);
  });
  it('정적 백색왜성의 그림 반지름은 M R³ 보존 관계를 따른다', () => {
    for (const m of [0.4, 0.5, 0.6, 0.8])
      expect(m * whiteDwarfRadiusRatio(m) ** 3).toBeCloseTo(0.4, 12);
    expect(whiteDwarfRadiusRatio(0.8)).toBeLessThan(whiteDwarfRadiusRatio(0.4));
  });
  it('허블 점은 문제 입력만 쓰고 거리 재보정은 속도를 바꾸지 않는다', () => {
    const old = hubbleTeachingPoints(),
      revised = hubbleTeachingPoints(2);
    expect(old).toEqual([
      { x: 10, y: 800 },
      { x: 20, y: 1300 },
      { x: 40, y: 2900 },
    ]);
    revised.forEach((p, i) => {
      expect(p.x).toBe((old[i]?.x ?? NaN) * 2);
      expect(p.y).toBe(old[i]?.y);
    });
    expect(hubbleTeachingPoints()).toEqual(old);
  });
  it('범위를 벗어난 물리 입력과 NaN 도형을 허용하지 않는다', () => {
    expect(() => ellipseAt(1, 1, 0)).toThrow(RangeError);
    expect(() => ellipseAt(0, 0.5, 0)).toThrow(RangeError);
    expect(() => ellipseAt(1, 0.5, NaN)).toThrow(RangeError);
    expect(() => cepheidMagnitude(0)).toThrow(RangeError);
    expect(() => sahaLogRatio(-1)).toThrow(RangeError);
    expect(() => whiteDwarfRadiusRatio(Infinity)).toThrow(RangeError);
    expect(() => hubbleTeachingPoints(-1)).toThrow(RangeError);
    expect(() => linearScale(1, 0, 0, 0, 1)).toThrow(RangeError);
    expect(() => sampledPath([{ x: NaN, y: 1 }])).toThrow(RangeError);
    expect(() => sampleRange(0, 1, 0)).toThrow(RangeError);
  });
});

const rendered = (questId: string, questionId: string, lang: 'ko' | 'en' = 'ko') => {
  const el = document.createElement('div');
  el.innerHTML = renderToStaticMarkup(<HistoryDiagram {...{ questId, questionId, lang }} />);
  return el;
};

describe('역사 문제 도해 표시', () => {
  it('실제 30개 문항을 각각 한영으로 설명하고 별도 외부 이미지 없이 표시한다', () => {
    expect(Object.keys(HISTORY_DIAGRAM_KEYS)).toHaveLength(10);
    expect(HISTORY_QUESTS.flatMap((q) => q.questions)).toHaveLength(30);
    for (const quest of HISTORY_QUESTS) {
      const koCaptions = new Set<string>();
      for (const question of quest.questions)
        for (const lang of ['ko', 'en'] as const) {
          const el = rendered(quest.id, question.id, lang);
          const svg = el.querySelector('svg');
          expect(svg?.getAttribute('viewBox')).toBe('0 0 320 228');
          expect(svg?.getAttribute('role')).toBe('img');
          expect(el.querySelector('title')?.textContent).toBeTruthy();
          const description = el.querySelector('desc')?.textContent;
          expect(description).toBe(el.querySelector('figcaption')?.textContent);
          expect(el.querySelectorAll('image, img, foreignObject, script')).toHaveLength(0);
          expect(el.innerHTML).not.toMatch(/NaN|Infinity|undefined|TODO/);
          if (lang === 'ko') koCaptions.add(description ?? '');
          else expect(description).not.toMatch(/[가-힣]/);
        }
      expect(koCaptions.size).toBe(3);
    }
  });
  it('질문과 다른 퀘스트나 알 수 없는 키를 임의의 그림으로 바꾸지 않는다', () => {
    expect(rendered('kepler-orbits', 'hubble-time').children).toHaveLength(0);
    expect(rendered('missing', 'missing').children).toHaveLength(0);
  });
  it('여러 도해의 접근성 title/desc ID가 충돌하지 않는다', () => {
    const el = document.createElement('div');
    el.innerHTML = renderToStaticMarkup(
      <>
        <HistoryDiagram questId="kepler-orbits" questionId="kepler-flight-time" lang="ko" />
        <HistoryDiagram questId="hubble-expansion" questionId="hubble-slope" lang="en" />
      </>,
    );
    const ids = Array.from(el.querySelectorAll('[id]'), (n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const svg of el.querySelectorAll('svg'))
      for (const id of (svg.getAttribute('aria-labelledby') ?? '').split(' '))
        expect(Array.from(el.querySelectorAll('[id]')).some((n) => n.id === id)).toBe(true);
  });
  it('질량/회귀/보정의 최종 정답 숫자를 SVG 텍스트에 미리 쓰지 않는다', () => {
    for (const quest of HISTORY_QUESTS)
      for (const q of quest.questions)
        if (q.type === 'numeric') {
          const el = rendered(quest.id, q.id);
          const texts = Array.from(
            el.querySelectorAll('svg text'),
            (n) => n.textContent ?? '',
          ).join(' ');
          const escaped = String(q.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          expect(texts).not.toMatch(new RegExp(`(^|[^0-9.])${escaped}([^0-9.]|$)`));
        }
  });
  it('허블 회귀 문제는 주어진 세 점만 그리고 정답 직선을 그리지 않는다', () => {
    const el = rendered('hubble-expansion', 'hubble-slope');
    expect(el.querySelectorAll('circle')).toHaveLength(3);
    expect(el.querySelectorAll('path')).toHaveLength(0);
    expect(el.textContent).toContain('10, 800');
    expect(el.textContent).toContain('20, 1300');
    expect(el.textContent).toContain('40, 2900');
  });
  it('분산 막대는 표준편차가 아니라 제곱에 비례하고 보정 결과를 그리지 않는다', () => {
    const el = rendered('zwicky-cluster', 'zwicky-noise-correction');
    const bars = Array.from(el.querySelectorAll('rect'), (n) => Number(n.getAttribute('width')));
    expect(bars).toHaveLength(2);
    expect((bars[1] ?? NaN) / (bars[0] ?? NaN)).toBeCloseTo(1 / 9, 12);
  });
  it('변수 아래첨자를 정체로 유지하고 야간 색은 테마 토큰을 따른다', () => {
    for (const quest of HISTORY_QUESTS)
      for (const q of quest.questions) {
        const el = rendered(quest.id, q.id);
        for (const sub of el.querySelectorAll('tspan[baseline-shift="sub"]'))
          expect(sub.getAttribute('font-style')).toBe('normal');
        for (const node of el.querySelectorAll('[fill], [stroke]'))
          for (const attr of ['fill', 'stroke']) {
            const value = node.getAttribute(attr);
            if (value) expect(value === 'none' || value.startsWith('var(--')).toBe(true);
          }
      }
  });
});
