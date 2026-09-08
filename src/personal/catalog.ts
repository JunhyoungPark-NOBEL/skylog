import { DEFAULT_AVATAR, normalizeAvatar, type AvatarLook } from './avatar';

export { SUITS, SKINS, HATS } from './avatar';

/** 장식은 고정된 다섯 자리에 놓는다. 유료 재화나 무작위 보상은 없다. */
export const DECORATIONS = [
  { id: 'flowers', badge: null },
  { id: 'bench', badge: null },
  { id: 'stones', badge: null },
  { id: 'fern', badge: null },
  { id: 'telescope', badge: 'badge-first-look' },
  { id: 'sketchbook', badge: 'badge-first-sketch' },
  { id: 'signpost', badge: 'badge-first-hop' },
  { id: 'lantern', badge: 'badge-two-star-check' },
  { id: 'moon', badge: 'challenge-observation-nights-3' },
  { id: 'books', badge: 'challenge-stages-cleared-5' },
  { id: 'sunflowers', badge: 'badge-missions-3' },
  { id: 'crystal', badge: 'challenge-stories-read-10' },
] as const;
export type DecorationId = (typeof DECORATIONS)[number]['id'];
export interface Personal extends AvatarLook {
  name: string;
  slots: (DecorationId | null)[];
}
export const DEFAULT_PERSONAL: Personal = {
  ...DEFAULT_AVATAR,
  name: '',
  slots: ['flowers', 'bench', null, 'fern', 'stones'],
};

export function normalizePersonalName(value: unknown): string {
  return typeof value === 'string'
    ? [...value]
        .filter((c) => c.charCodeAt(0) >= 32 && c !== '<' && c !== '>')
        .join('')
        .trim()
        .slice(0, 24)
    : '';
}

export function normalizePersonal(
  value: unknown,
  owned: ReadonlySet<string>,
  ownedAvatar?: ReadonlySet<string>,
): Personal {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const slots = Array.isArray(v.slots) ? v.slots : DEFAULT_PERSONAL.slots;
  const ids = new Set<string>();
  return {
    ...normalizeAvatar(v, ownedAvatar),
    name: normalizePersonalName(v.name),
    slots: Array.from({ length: 5 }, (_, i) => {
      const id: unknown = slots[i];
      if (
        typeof id !== 'string' ||
        !owned.has(id) ||
        ids.has(id) ||
        !DECORATIONS.some((d) => d.id === id)
      )
        return null;
      ids.add(id);
      return id as DecorationId;
    }),
  };
}
export function rewardsFor(badges: ReadonlySet<string>): DecorationId[] {
  return DECORATIONS.filter((d) => d.badge && badges.has(d.badge)).map((d) => d.id);
}
