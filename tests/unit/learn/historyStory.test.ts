import { expect, it } from 'vitest';
import { HISTORY_QUESTS } from '@/learn/historyQuests';
import { HISTORY_LESSONS } from '@/learn/historyLessons';
import { HISTORY_STORY } from '@/learn/historyStory';
import { canReadHistoryEnding, HISTORY_NARRATIVES } from '@/learn/historyNarrative';
import { emptyHistoryProgress, type HistoryProgress } from '@/learn/historyProgress';

it('전체 30개 채점 문항을 양 언어의 장 제목과 겹치지 않는 이야기 장면으로 연결한다', () => {
  const ids = HISTORY_QUESTS.flatMap((q) => q.questions.map((p) => p.id));
  expect(Object.keys(HISTORY_STORY).sort()).toEqual(ids.sort());
  for (const id of ids) {
    const story = HISTORY_STORY[id]!;
    for (const lang of ['ko', 'en'] as const) {
      expect(story.title[lang].trim().length).toBeGreaterThan(3);
      const scenes = [HISTORY_LESSONS[id]!.scene, ...story.bridges].map((s) => s[lang]);
      expect(new Set(scenes).size).toBe(3);
      for (const scene of scenes) {
        expect(scene.trim().length).toBeGreaterThan(12);
        expect(scene).not.toMatch(/TODO|TBD|준비 문제|본 문제|warm-up|main challenge/i);
      }
    }
  }
});

it('열 이야기의 90장면과 도입·결말은 양 언어로 이어지며 원래 문항 구성을 유지한다', () => {
  expect(Object.keys(HISTORY_NARRATIVES).sort()).toEqual(HISTORY_QUESTS.map((q) => q.id).sort());
  for (const quest of HISTORY_QUESTS) {
    const story = HISTORY_NARRATIVES[quest.id]!;
    expect(story.chapters).toHaveLength(quest.questions.length);
    const scenes = story.chapters.flatMap((chapter, i) => {
      expect(chapter.scenes).toHaveLength(
        HISTORY_LESSONS[quest.questions[i]!.id]!.warmups.length + 1,
      );
      return chapter.scenes;
    });
    expect(scenes).toHaveLength(9);
    for (const lang of ['ko', 'en'] as const) {
      expect(new Set(scenes.map((scene) => scene[lang])).size).toBe(9);
      for (const text of [
        story.setting,
        story.opening,
        story.question,
        story.ending,
        ...scenes,
        ...story.chapters.map((chapter) => chapter.discovery),
      ]) {
        expect(text[lang].trim().length).toBeGreaterThan(12);
        expect(text[lang].length).toBeLessThan(600);
        expect(text[lang]).not.toMatch(/TODO|TBD|준비 문제|본 문제|warm-up|main challenge/i);
      }
    }
  }
});

it('장 이동·초안·마지막 장만 제출한 것으로 결말을 열지 않으며 기존 오답도 결말과 점수를 구분한다', () => {
  const quest = HISTORY_QUESTS[0]!;
  const progress = new Map<string, HistoryProgress>();
  const answer = (questionId: string) =>
    progress.set(questionId, {
      ...emptyHistoryProgress(),
      attempts: [{ answer: '0', hints: 1, round: 1, at: '2026-09-11T00:00:00Z' }],
    });
  expect(canReadHistoryEnding(quest, progress)).toBe(false);
  progress.set(quest.questions[0]!.id, {
    ...emptyHistoryProgress(),
    input: '40000',
    note: '미제출 메모',
  });
  answer(quest.questions[2]!.id);
  expect(canReadHistoryEnding(quest, progress)).toBe(false);
  answer(quest.questions[0]!.id);
  expect(canReadHistoryEnding(quest, progress)).toBe(false);
  answer(quest.questions[1]!.id);
  const before = JSON.stringify([...progress]);
  expect(canReadHistoryEnding(quest, progress)).toBe(true);
  expect(JSON.stringify([...progress])).toBe(before);
  progress.set(quest.questions[0]!.id, { ...progress.get(quest.questions[0]!.id)!, round: 2 });
  expect(canReadHistoryEnding(quest, progress)).toBe(true);
});
