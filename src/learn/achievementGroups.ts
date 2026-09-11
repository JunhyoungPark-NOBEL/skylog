import type { Badge, BadgeRule } from './schema';

export const ACHIEVEMENT_GROUPS = [
  'discovery',
  'deepSky',
  'journal',
  'learning',
  'fieldwork',
] as const;
export type AchievementGroup = (typeof ACHIEVEMENT_GROUPS)[number];

/** 화면에서만 묶는다. 업적 ID·달성 조건·기존 보상 판정은 바꾸지 않는다. */
const GROUP_BY_RULE: Record<BadgeRule['key'], AchievementGroup> = {
  firstObservation: 'discovery',
  observedObjects: 'discovery',
  constellationCount: 'discovery',
  seasonSignature: 'discovery',
  planetsAll: 'discovery',
  moonPhasesAll: 'discovery',
  messierCount: 'deepSky',
  caldwellCount: 'deepSky',
  firstSketch: 'journal',
  observationNights: 'journal',
  streakNights: 'journal',
  detailedObjects: 'journal',
  sketchedObjects: 'journal',
  photographedObjects: 'journal',
  quizStreak: 'learning',
  quizMastered: 'learning',
  stagesCleared: 'learning',
  stagesPerfect: 'learning',
  storiesRead: 'learning',
  firstStarHop: 'fieldwork',
  align2Success: 'fieldwork',
  missionsCompleted: 'fieldwork',
  hopCoursesCompleted: 'fieldwork',
};

export function groupAchievements(badges: readonly Badge[], earned: ReadonlySet<string>) {
  return ACHIEVEMENT_GROUPS.map((id) => {
    const items = badges.filter(
      (badge) => badge.enabled !== false && GROUP_BY_RULE[badge.rule.key] === id,
    );
    return { id, items, earned: items.filter((badge) => earned.has(badge.id)).length };
  }).filter((group) => group.items.length > 0);
}
