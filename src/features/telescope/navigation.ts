import type { ObjectId } from '@/catalog/objectId';
import { useSelectionStore } from '@/state/selectionStore';
import { useTelescopeStore } from '@/state/telescopeStore';
let returnHash = '#/sky';
export function openTelescope(id?: ObjectId, view?: 'hop' | 'align' | 'finder') {
  if (!window.location.hash.startsWith('#/telescope')) returnHash = window.location.hash || '#/sky';
  useSelectionStore.getState().closeSheet();
  if (id) useTelescopeStore.getState().setTarget(id);
  window.location.hash =
    '#/telescope' + (id ? '?target=' + encodeURIComponent(id) + (view ? '&view=' + view : '') : '');
}
export function closeTelescope() {
  window.location.hash = returnHash;
}
