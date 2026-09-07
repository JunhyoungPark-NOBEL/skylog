/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { validateContentEntry, type ContentEntry, type ContentIndex } from '@/content/schema';
import { validateLearnData, type LearnData } from '@/learn/schema';

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const base = 'public/data/';
const index = read<ContentIndex>(base + 'content/v1/index.json');
const data: LearnData = {
  paths: read(base + 'learn/v1/paths.json'),
  missions: read(base + 'learn/v1/missions.json'),
  badges: read(base + 'learn/v1/badges.json'),
  quiz: read(base + 'learn/v1/quiz.json'),
};
const known = new Set([
  'sun',
  'moon',
  ...['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map(
    (k) => 'planet:' + k,
  ),
  ...read<{ id: string }[]>(base + 'stars-bright.v1.json').map((e) => e.id),
  ...read<{ id: string }[]>(base + 'dso.v1.json').map((e) => e.id),
  ...Object.keys(read<Record<string, unknown>>(base + 'constellations.v1.json')).map(
    (k) => 'const:' + k,
  ),
]);
it('전체 이야기와 학습 팩의 ID·필수 필드·참조가 서로 맞는다', () => {
  expect(index.count).toBe(121);
  expect(new Set(index.entries.map((e) => e.id)).size).toBe(index.count);
  for (const e of index.entries) {
    const body = read<ContentEntry>(base + 'content/v1/' + e.file);
    expect(body.id).toBe(e.id);
    expect(validateContentEntry(body).errors, body.id).toEqual([]);
    expect(known.has(e.id), e.id).toBe(true);
    for (const id of body.howToFind.hopFrom ?? []) expect(known.has(id), id).toBe(true);
  }
  expect(
    validateLearnData(data, {
      knownObjectIds: known,
      contentIds: new Set(index.entries.map((e) => e.id)),
    }).errors,
  ).toEqual([]);
  for (const values of [data.paths, data.missions, data.badges, data.quiz])
    expect(new Set(values.map((e) => e.id)).size).toBe(values.length);
  expect(data.quiz.filter((q) => q.enabled !== false)).toHaveLength(204);
  for (const m of data.missions.filter((m) => m.enabled !== false))
    for (const step of m.steps)
      if (step.type === 'quiz')
        for (const id of step.quizIds)
          expect(data.quiz.find((q) => q.id === id)?.enabled, id).toBe(true);
});
it('180문항의 근거 스냅샷이 첨부 G3 정본과 정확히 일치한다', () => {
  const root = 'plan/research/G3-G5-integrated/';
  const originals = read<ContentEntry[]>(root + 'G3/G3-content-cumulative-121.json');
  const evidence = read<
    { quizId: string; evidence: { contentId: string; pointer: string; suppliedText: unknown }[] }[]
  >(root + 'G5/evidence/quiz-evidence.json');
  expect(new Set(evidence.map((e) => e.quizId))).toEqual(
    new Set(data.quiz.filter((q) => !q.id.startsWith('obs-')).map((q) => q.id)),
  );
  for (const e of evidence)
    for (const ref of e.evidence) {
      let value: unknown = originals.find((o) => o.id === ref.contentId);
      for (const k of ref.pointer.slice(1).split('/'))
        value = (value as Record<string, unknown>)?.[k.replace(/~1/g, '/').replace(/~0/g, '~')];
      expect(value, e.quizId + ' ' + ref.pointer).toEqual(ref.suppliedText);
    }
});
it('새 UI 번역 키는 한국어와 영어에 모두 있고 내부 작업 문구는 퀴즈에 남기지 않는다', () => {
  const keys = (v: unknown, p = ''): string[] =>
    v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => keys(x, p + '.' + k)) : [p];
  const dir = 'src/i18n/partials/';
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.ko.json')))
    expect(keys(read(dir + f)).sort(), f).toEqual(
      keys(read(dir + f.replace('.ko.', '.en.'))).sort(),
    );
  for (const q of data.quiz)
    expect(JSON.stringify([q.question, q.explanation, q.choices]), q.id).not.toMatch(
      /첨부|G3|G5|습니다[.!?]/,
    );
});
