import { expect, it } from 'vitest';
import { HISTORY_QUESTS } from '@/learn/historyQuests';
import { HISTORY_LESSONS } from '@/learn/historyLessons';
import { HISTORY_STORY } from '@/learn/historyStory';

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
