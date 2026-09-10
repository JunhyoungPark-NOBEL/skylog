import { describe, expect, it } from 'vitest';
import {
  HISTORY_QUESTS,
  HISTORY_QUESTS_VERSION,
  type HistoryQuestion,
  type LocalizedText,
} from '@/learn/historyQuests';

const questions = HISTORY_QUESTS.flatMap((quest) => quest.questions);
const numeric = (id: string): Extract<HistoryQuestion, { type: 'numeric' }> => {
  const question = questions.find((entry) => entry.id === id);
  if (question?.type !== 'numeric') throw new Error(`Missing numeric question: ${id}`);
  return question;
};
const localized = (value: LocalizedText) => {
  expect(value.ko.trim().length).toBeGreaterThan(0);
  expect(value.en.trim().length).toBeGreaterThan(0);
  expect(value.ko).not.toMatch(/TODO|TBD|\uFFFD/);
  expect(value.en).not.toMatch(/TODO|TBD|\uFFFD/);
};

// 콘텐츠 답안을 재사용하지 않고, 문제에 제시된 상수·자료만으로 재계산한다.
const kEv = 8.617333262e-5;
const gAstro = 4.30091e-6;
const gravG = 6.6743e-11;
const solarM = 1.98847e30;
const solarR = 6.957e8;
const c = 299792458;
// 케플러 방정식의 답 상수를 베끼지 않고 dM/dE의 수치 적분으로 경과 면적을 구한다.
const meanAnomalyByArea = (() => {
  const steps = 10000;
  const width = Math.PI / 2 / steps;
  let area = 0;
  for (let index = 0; index < steps; index += 1) {
    area += (1 - 0.6 * Math.cos((index + 0.5) * width)) * width;
  }
  return area;
})();
const cepheidM = -2.76 * Math.log10(10) - 1.4;
const cepheidDistance = (extinction: number) =>
  (10 * Math.sqrt(10 ** (0.4 * (15.2 - extinction - cepheidM)))) / 1000;
const sahaLogChange =
  1.5 * (Math.log(10000) - Math.log(6000)) + 13.6 / kEv / 6000 - 13.6 / kEv / 10000;
const excitationChange = Math.exp(-10.2 / kEv / 10000) / Math.exp(-10.2 / kEv / 6000);
const twoApsisSpeedRatio = Math.sqrt((2 / (1 - 0.6) - 1) / (2 / (1 + 0.6) - 1));
const correctedRotationSquared = 180 ** 2 / (1 - Math.cos(Math.PI / 3) ** 2);

const references: { id: string; value: number; unit: string; misconception: number }[] = [
  {
    id: 'eratosthenes-circumference',
    value: 2 * Math.PI * (800 / ((7.2 * Math.PI) / 180)),
    unit: 'km',
    misconception: (800 * 7.2) / 360,
  },
  {
    id: 'eratosthenes-uncertainty',
    value: 100 * Math.hypot(8 / 800, 0.12 / 7.2),
    unit: '%',
    misconception: 100 * (8 / 800 + 0.12 / 7.2),
  },
  { id: 'kepler-binary-mass', value: 4 ** 3 / 2 ** 2, unit: 'M☉', misconception: 4 },
  { id: 'kepler-apsis-speed', value: twoApsisSpeedRatio, unit: 'ratio', misconception: 2 },
  {
    id: 'kepler-flight-time',
    value: (400 * meanAnomalyByArea) / (2 * Math.PI),
    unit: 'day',
    misconception: 100,
  },
  {
    id: 'romer-path-speed',
    value: (1.496e8 / 1200) * 1.8,
    unit: 'km/s',
    misconception: 1.496e8 / 1200,
  },
  { id: 'romer-period-bias', value: 60 / 40, unit: 's', misconception: 60 / 41 },
  {
    id: 'leavitt-modulus',
    value: cepheidDistance(0.3),
    unit: 'kpc',
    misconception: cepheidDistance(0),
  },
  {
    id: 'leavitt-extinction-bias',
    value: cepheidDistance(0) / cepheidDistance(0.3),
    unit: 'ratio',
    misconception: 1.3,
  },
  {
    id: 'payne-saha-ratio',
    value: Math.exp(sahaLogChange),
    unit: 'ratio',
    misconception: Math.exp(sahaLogChange) / (10000 / 6000) ** 1.5,
  },
  {
    id: 'payne-level-population',
    value: (excitationChange * (1 / 11)) / (1 / 1.01),
    unit: 'ratio',
    misconception: excitationChange,
  },
  {
    id: 'einstein-deflection',
    value: ((2 * gravG * solarM) / c ** 2 / solarR) * (180 / Math.PI) * 3600,
    unit: 'arcsec',
    misconception: 1.75,
  },
  {
    id: 'einstein-weighted-fit',
    value: (1.7 * 0.3 ** 2 + 1.9 * 0.2 ** 2) / (0.2 ** 2 + 0.3 ** 2),
    unit: 'arcsec',
    misconception: 1.8,
  },
  { id: 'chandra-composition', value: 5.83 * (1 / 2.15) ** 2, unit: 'M☉', misconception: 1.4 },
  {
    id: 'chandra-radius',
    value: Math.cbrt(0.4 / 0.8),
    unit: 'ratio',
    misconception: Math.cbrt(0.8 / 0.4),
  },
  {
    id: 'hubble-slope',
    value: (10 * 800 + 20 * 1300 + 40 * 2900) / (10 ** 2 + 20 ** 2 + 40 ** 2),
    unit: 'km/s/Mpc',
    misconception: (80 + 65 + 72.5) / 3,
  },
  {
    id: 'hubble-time',
    value: 1 / (70 / (3.085677581491367 * 1e19)) / (365.25 * 86400 * 1e9),
    unit: 'Gyr',
    misconception: 1 / 70,
  },
  {
    id: 'zwicky-virial-mass',
    value: (5 * (1e3 / gAstro) * 900 ** 2) / 1e14,
    unit: '10¹⁴ M☉',
    misconception: (3 * (1e3 / gAstro) * 900 ** 2) / 1e14,
  },
  {
    id: 'zwicky-noise-correction',
    value: 1 - (300 / 900) ** 2,
    unit: 'ratio',
    misconception: ((900 - 300) / 900) ** 2,
  },
  {
    id: 'rubin-inclined-mass',
    value: (20 * correctedRotationSquared) / gAstro / 1e11,
    unit: '10¹¹ M☉',
    misconception: (20 * 180 ** 2) / gAstro / 1e11,
  },
  {
    id: 'rubin-missing-fraction',
    value: (100 * (200 ** 2 - 120 ** 2)) / 200 ** 2,
    unit: '%',
    misconception: 40,
  },
];

describe('역사 속 천체물리 문제 팩', () => {
  it('10개 고유 코스·30문항·90힌트를 한영으로 제공한다', () => {
    expect(HISTORY_QUESTS_VERSION).toBe(1);
    expect(HISTORY_QUESTS).toHaveLength(10);
    expect(new Set(HISTORY_QUESTS.map((quest) => quest.id)).size).toBe(10);
    expect(questions).toHaveLength(30);
    expect(new Set(questions.map((question) => question.id)).size).toBe(30);
    for (const quest of HISTORY_QUESTS) {
      expect(quest.id).toMatch(/^[a-z]+(?:-[a-z]+)+$/);
      expect(['advanced', 'expert']).toContain(quest.difficulty);
      expect(quest.questions).toHaveLength(3);
      expect(quest.minutes).toBeGreaterThanOrEqual(20);
      [quest.title, quest.scientist, quest.story, ...quest.concepts].forEach(localized);
      expect(quest.sources.length).toBeGreaterThan(0);
      for (const source of quest.sources) {
        expect(new URL(source.url).protocol).toBe('https:');
        expect(source.title.length).toBeGreaterThan(5);
      }
    }
    for (const question of questions) {
      expect(question.hints).toHaveLength(3);
      expect(question.workedSteps.length).toBeGreaterThanOrEqual(3);
      [
        question.prompt,
        question.context,
        question.explanation,
        ...question.hints,
        ...question.workedSteps,
      ].forEach(localized);
      if (question.type === 'numeric') localized(question.inputHelp);
      else {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((option) => option.id)).size).toBe(4);
        expect(question.options.filter((option) => option.id === question.answerId)).toHaveLength(
          1,
        );
        question.options.forEach((option) => localized(option.label));
      }
    }
  });

  it('모든 수치 문제를 독립 재계산 표가 빠짐없이 검증한다', () => {
    const numericIds = questions
      .filter((question) => question.type === 'numeric')
      .map((question) => question.id)
      .sort();
    expect(numericIds).toEqual(references.map((reference) => reference.id).sort());
    expect(numericIds).toHaveLength(21);
  });

  it.each(references)(
    '$id: 답·단위·허용오차가 독립 계산과 오개념을 구별한다',
    ({ id, value, unit, misconception }) => {
      const question = numeric(id);
      expect(question.unit).toBe(unit);
      expect(Number.isFinite(question.answer)).toBe(true);
      expect(Number.isFinite(question.tolerance)).toBe(true);
      expect(question.tolerance).toBeGreaterThan(0);
      expect(question.tolerance).toBeLessThan(Math.abs(value) * 0.01);
      expect(Math.abs(question.answer - value)).toBeLessThan(question.tolerance / 100);
      expect(Math.abs(question.answer - misconception)).toBeGreaterThan(question.tolerance);
    },
  );

  it('최소제곱 답은 잔차 기울기를 0으로 만들고 공통 오차는 평균에서 남는다', () => {
    const h = numeric('hubble-slope').answer;
    const derivative = [
      [10, 800],
      [20, 1300],
      [40, 2900],
    ].reduce((sum, [d, v]) => sum + d! * (v! - h * d!), 0);
    expect(Math.abs(derivative)).toBeLessThan(1e-6);
    const noiseFloor = Math.sqrt(0.2 ** 2 / 100 + 0.1 ** 2);
    expect(noiseFloor).toBeCloseTo(0.1019803903, 9);
    expect(noiseFloor).toBeGreaterThan(0.1);
    const problem = questions.find((question) => question.id === 'einstein-systematics');
    expect(problem?.type === 'choice' && problem.answerId).toBe('floor');
  });

  it('두 사하 문제의 밀도 가정과 현대 교육 자료의 범위를 혼동하지 않는다', () => {
    expect(numeric('payne-saha-ratio').context.en).toContain('density fixed');
    expect(numeric('payne-level-population').context.en).toContain('electron densities differ');
    expect(numeric('einstein-weighted-fit').context.en).toContain('not the 1919 measurements');
    expect(numeric('hubble-time').context.en).toContain('not the age');
    expect(numeric('rubin-inclined-mass').context.en).toContain('not the exact gravity of a disk');
  });
});
