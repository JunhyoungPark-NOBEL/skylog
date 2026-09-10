import type { Mission, QuizItem } from './schema';

/** 무료 코스 안의 지정 확인 문제는 난이도와 관계없이 그 코스에 포함한다. */
export function quizNeedsPlus(q: QuizItem, missions: Mission[], missionId?: string): boolean {
  if (q.difficulty === 1) return false;
  const mission = missions.find(
    (m) => m.id === missionId && m.enabled !== false && m.level !== 'telescope',
  );
  return !mission?.steps.some((s) => s.type === 'quiz' && s.quizIds.includes(q.id));
}
export async function requirePlus() {
  const { ensurePlusAccess } = await import('@/entitlements');
  await ensurePlusAccess();
}
export async function ensureQuizAccess(q: QuizItem, missionId?: string) {
  if (import.meta.env.VITE_SKYARD_MONETIZATION_MODE !== 'live') return;
  const { loadLearnData } = await import('./runtime');
  const data = await loadLearnData();
  const canonical = data.quiz.find(
    (item) => item.id === q.id && (item.version ?? 1) === (q.version ?? 1),
  );
  if (!canonical || canonical.enabled === false) throw new Error('Question unavailable');
  if (quizNeedsPlus(canonical, data.missions, missionId)) await requirePlus();
}
export async function ensureMissionAccess(m: Mission) {
  if (import.meta.env.VITE_SKYARD_MONETIZATION_MODE !== 'live') return;
  const { loadLearnData } = await import('./runtime');
  const canonical = (await loadLearnData()).missions.find(
    (item) => item.id === m.id && item.enabled !== false,
  );
  if (!canonical) throw new Error('Mission unavailable');
  if (canonical.level === 'telescope') await requirePlus();
}
