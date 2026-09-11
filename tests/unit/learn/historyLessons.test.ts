import { describe, expect, it } from 'vitest';
import { HISTORY_LESSONS, HISTORY_LESSONS_VERSION } from '@/learn/historyLessons';
import { renderHistoryMath } from '@/learn/historyMath';
import { HISTORY_QUESTS, type LocalizedText } from '@/learn/historyQuests';

const entries = Object.entries(HISTORY_LESSONS);
const warmups = entries.flatMap(([, lesson]) => lesson.warmups);
const spans = (value: string) => [...value.matchAll(/\\\(([\s\S]*?)\\\)/g)];
const localized = (value: LocalizedText) => {
  for (const text of [value.ko, value.en]) {
    expect(text.trim()).not.toBe('');
    expect(text).not.toMatch(/TODO|TBD|\uFFFD|§\d+§/);
    expect(text).not.toMatch(/[’']\\\(s\\\)/);
  }
};
const answer = (id: string) => {
  const question = warmups.find((entry) => entry.id === id);
  if (!question) throw new Error(`Missing warmup: ${id}`);
  return question.choices.find((choice) => choice.id === question.answerId)!.label;
};

describe('history preparation lessons', () => {
  it('covers the original 30 question IDs once without changing their progression keys', () => {
    expect(HISTORY_LESSONS_VERSION).toBe(1);
    expect(entries).toHaveLength(30);
    const originalIds = HISTORY_QUESTS.flatMap((quest) => quest.questions.map((q) => q.id));
    expect(entries.map(([id]) => id).sort()).toEqual(originalIds.sort());
    for (const quest of HISTORY_QUESTS) {
      for (const question of quest.questions) {
        expect(HISTORY_LESSONS[question.id]!.diagramKey).toBe(quest.id);
      }
    }
  });

  it('provides two distinct, localized prerequisite questions per main problem', () => {
    expect(warmups).toHaveLength(60);
    expect(new Set(warmups.map((q) => q.id)).size).toBe(60);
    for (const [problemId, lesson] of entries) {
      localized(lesson.scene);
      expect(lesson.concepts.length).toBeGreaterThanOrEqual(2);
      expect(lesson.concepts.length).toBeLessThanOrEqual(4);
      expect(lesson.relations.length).toBeGreaterThanOrEqual(1);
      expect(lesson.relations.length).toBeLessThanOrEqual(2);
      expect(lesson.steps).toHaveLength(2);
      lesson.steps.forEach(localized);
      expect(lesson.warmups).toHaveLength(2);
      expect(lesson.warmups[0]!.prompt).not.toEqual(lesson.warmups[1]!.prompt);
      for (const question of lesson.warmups) {
        expect(question.id.startsWith(`${problemId}-`)).toBe(true);
        localized(question.prompt);
        localized(question.explanation);
        expect(question.choices).toHaveLength(3);
        expect(new Set(question.choices.map((c) => c.id)).size).toBe(3);
        expect(question.choices.filter((c) => c.id === question.answerId)).toHaveLength(1);
        for (const lang of ['ko', 'en'] as const) {
          expect(new Set(question.choices.map((c) => c.label[lang])).size).toBe(3);
        }
        question.choices.forEach((c) => localized(c.label));
      }
    }
  });

  it('keeps prerequisite numbers separate from the main calculation data', () => {
    const protectedValues = [
      ['eratosthenes-circumference', '40000'],
      ['kepler-flight-time', '61.8028'],
      ['leavitt-modulus', '64.8634'],
      ['payne-saha-ratio', '79831'],
      ['einstein-deflection', '0.8756'],
      ['chandra-composition', '1.2612'],
      ['hubble-slope', '71.4285'],
      ['zwicky-virial-mass', '9.4166'],
      ['rubin-inclined-mass', '2.0088'],
    ];
    for (const [id, mainAnswer] of protectedValues) {
      expect(JSON.stringify(HISTORY_LESSONS[id!])).not.toContain(mainAnswer);
    }
    for (const quest of HISTORY_QUESTS) {
      for (const main of quest.questions) {
        for (const preparation of HISTORY_LESSONS[main.id]!.warmups) {
          expect(preparation.prompt).not.toEqual(main.prompt);
          expect(preparation.id).not.toBe(main.id);
        }
      }
    }
  });

  it('renders every explicit formula and rejects raw superscript math outside glossary lookup labels', () => {
    let count = 0;
    const check = (text: string) => {
      const math = spans(text);
      expect(text.match(/\\\(/g)?.length ?? 0).toBe(math.length);
      expect(text.match(/\\\)/g)?.length ?? 0).toBe(math.length);
      for (const [, formula] of math) {
        count += 1;
        expect(() => renderHistoryMath(formula!)).not.toThrow();
      }
      const prose = text.replace(/\\\([\s\S]*?\\\)/g, '');
      expect(prose).not.toMatch(/[²³⁻ᐟ₀₁₂ₑ☉σμχτρθΣπ±√∝≤]/);
      expect(prose).not.toContain('’\\(s\\)');
    };
    for (const [, lesson] of entries) {
      for (const value of [
        lesson.scene,
        ...lesson.steps,
        ...lesson.concepts.map((c) => c.meaning),
      ]) {
        localized(value);
        check(value.ko);
        check(value.en);
      }
      for (const relation of lesson.relations) {
        expect(spans(relation.formula)).toHaveLength(1);
        check(relation.formula);
        check(relation.explanation.ko);
        check(relation.explanation.en);
      }
      for (const q of lesson.warmups) {
        for (const value of [q.prompt, q.explanation, ...q.choices.map((c) => c.label)]) {
          check(value.ko);
          check(value.en);
        }
      }
    }
    expect(count).toBeGreaterThan(300);
  });

  it('makes key prerequisite terms discoverable from actual prose and keeps shared definitions consistent', () => {
    const meanings = new Map<string, string>();
    for (const [, lesson] of entries) {
      for (const concept of lesson.concepts) {
        localized(concept.term);
        localized(concept.meaning);
        const meaning = JSON.stringify(concept.meaning);
        if (meanings.has(concept.term.ko)) expect(meaning).toBe(meanings.get(concept.term.ko));
        meanings.set(concept.term.ko, meaning);
        for (const alias of concept.aliases ?? []) {
          localized(alias);
          expect(alias.ko.length).toBeGreaterThan(1);
        }
      }
    }
    const required: Record<string, string[]> = {
      'eratosthenes-circumference': ['자오선', '천정각', '남중', '중심각'],
      'eratosthenes-uncertainty': ['표준편차', '독립 오차', '분산', '오차 전파'],
      'kepler-flight-time': ['이심근점이각', '평균근점이각', '라디안'],
      'leavitt-modulus': ['세페이드', '겉보기 등급', '절대등급', '소광', '로그'],
      'payne-saha-ratio': ['이온화', 'LTE', '전자 밀도', '분배함수', '지수함수'],
      'einstein-weighted-fit': ['표준편차', '분산', '가중치'],
      'chandra-composition': ['전자 축퇴압', '전자당 평균 질량', '전자 분율'],
      'hubble-slope': ['최소제곱', '절편', '잔차'],
      'zwicky-virial-mass': ['속도 분산', '비리얼', '등방성'],
      'rubin-inclined-mass': ['경사각', '시선 속도', '구대칭 근사'],
      'rubin-density-slope': ['밀도', '구껍질', '미분'],
    };
    for (const [id, terms] of Object.entries(required)) {
      const available = HISTORY_LESSONS[id]!.concepts.flatMap((c) => [
        c.term.ko,
        ...(c.aliases ?? []).map((a) => a.ko),
      ]);
      for (const term of terms) expect(available, `${id}: ${term}`).toContain(term);
    }
  });

  it('checks quantitative prerequisites independently of their stored answer positions', () => {
    const ratioCases = [
      ['kepler-binary-mass-scale', 3 ** 3],
      ['einstein-weighted-fit-square', 1 / (1 / 3) ** 2],
      ['rubin-inclined-mass-square', 3 ** 2],
      ['rubin-density-slope-shell', (4 * Math.PI * 3 ** 2) / (4 * Math.PI)],
    ] as const;
    for (const [id, expected] of ratioCases) {
      expect(answer(id).ko).toBe(`${expected}배`);
      expect(answer(id).en).toBe(`${expected} times`);
    }
    expect(answer('romer-period-bias-interval').en).toBe(String(6 - 1));
    expect(answer('einstein-systematics-root').en).toBe('One half');
    expect(1 / Math.sqrt(4)).toBe(0.5);
    expect(answer('payne-level-population-subset').en).toBe('1/8');
    expect(0.5 * 0.25).toBe(1 / 8);
    expect(answer('zwicky-virial-mass-dimensions').en).toMatch(/3\\sigma/);
  });

  it('teaches the physical assumptions that would otherwise give plausible wrong main answers', () => {
    const text = (id: string) => JSON.stringify(HISTORY_LESSONS[id]);
    expect(text('kepler-binary-mass')).toContain('sum of their individual semimajor axes');
    expect(text('kepler-flight-time')).toContain('auxiliary circle');
    expect(text('kepler-flight-time')).toContain('differs from true anomaly');
    expect(text('payne-level-population')).toContain(
      'do not import the preceding fixed-density assumption',
    );
    expect(text('einstein-systematics')).toContain('shared');
    expect(text('chandra-radius')).toContain('Do not extend it unchanged near the limiting mass');
    expect(text('hubble-time')).toContain('actual age');
    expect(text('zwicky-virial-mass')).toContain('standard deviation');
    expect(text('zwicky-evidence')).toContain('does not directly identify a particle species');
    expect(text('rubin-inclined-mass')).toContain('face-on');
    expect(text('rubin-density-slope')).toContain('center or infinity');
  });
});
