import { useClockStore } from '@/state/clockStore';
import { useSensorStore } from '@/state/sensorStore';
import { HOP_COURSES } from '@/learn/hopCourses';
import { navigateLearn } from '@/features/learn/learnNavigation';
import type { ObjectId } from '@/catalog/objectId';
import { useSelectionStore } from '@/state/selectionStore';
import { useTelescopeStore } from '@/state/telescopeStore';
let returnHash = '#/sky';
export function openTelescope(id?: ObjectId, view?: 'hop' | 'align' | 'finder', courseId?: string) {
  const current = window.location.hash;
  if (!current.startsWith('#/telescope') && !/^#\/sky\?.*\bscope=/.test(current))
    returnHash = current || '#/sky';
  useSelectionStore.getState().closeSheet();
  if (id) useTelescopeStore.getState().setTarget(id);
  if (view === 'hop') {
    const course =
      HOP_COURSES.find((c) => c.id === courseId) ?? HOP_COURSES.find((c) => c.target === id);
    if (!course) {
      navigateLearn('courses', { theme: 'telescope', group: 'starhop' });
      return;
    }
    window.location.hash = `#/telescope?target=${encodeURIComponent(course.target)}&view=hop&course=${course.id}`;
    return;
  }
  useSelectionStore.getState().setTarget(null);
  if (!useSensorStore.getState().simulator) useClockStore.getState().resetToNow();
  const target = id ?? useTelescopeStore.getState().targetId;
  window.location.hash =
    '#/sky?scope=' + encodeURIComponent(target ?? 'choose') + (view ? '&view=' + view : '');
}
export function closeTelescope() {
  window.location.hash = returnHash;
}
