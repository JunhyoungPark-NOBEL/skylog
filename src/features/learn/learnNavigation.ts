import { useEffect, useSyncExternalStore } from 'react';
let lastLearnHash = '#/learn';
export function returnToLearning() {
  window.location.hash = lastLearnHash;
}
export const LEARN_SECTIONS = ['quiz', 'courses', 'stories', 'achievements'] as const;
export type LearnSection = (typeof LEARN_SECTIONS)[number];
const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
};
export function useLearnNavigation() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '#/learn',
  );
  const params = new URLSearchParams(hash.split('?')[1]);
  useEffect(() => {
    if (hash.split('?')[0] === '#/learn') lastLearnHash = hash;
  }, [hash]);
  const candidate = params.get('section');
  const section: LearnSection = LEARN_SECTIONS.find((s) => s === candidate) ?? 'quiz';
  return {
    section,
    pathId: params.get('path'),
    missionId: params.get('mission'),
    chapter: Number(params.get('chapter')) || undefined,
  };
}
export function navigateLearn(
  section: LearnSection,
  params: Record<string, string | number | null | undefined> = {},
) {
  const query = new URLSearchParams({ section });
  for (const [key, value] of Object.entries(params))
    if (value != null) query.set(key, String(value));
  window.location.hash = '#/learn?' + query.toString();
}
