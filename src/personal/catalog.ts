import { DEFAULT_AVATAR, normalizeAvatar, type AvatarLook } from './avatar';

export { SUITS, SKINS, HATS } from './avatar';

/** 남쪽 지평선의 다섯 자리에 놓는 학습 보상. 유료 재화나 무작위 보상은 없다. */
export const DECORATIONS = [
  { id: 'flowers', badge: 'badge-quiz-3' },
  { id: 'bench', badge: null },
  { id: 'stones', badge: 'badge-missions-3' },
  { id: 'fern', badge: 'badge-first-look' },
  { id: 'telescope', badge: 'badge-first-look' },
  { id: 'sketchbook', badge: 'badge-first-sketch' },
  { id: 'signpost', badge: 'badge-first-hop' },
  { id: 'lantern', badge: 'badge-two-star-check' },
  { id: 'moon', badge: 'challenge-observation-nights-3' },
  { id: 'books', badge: 'challenge-stages-cleared-5' },
  { id: 'sunflowers', badge: 'badge-missions-3' },
  { id: 'crystal', badge: 'challenge-stories-read-10' },
  { id: 'picnic-table', badge: 'badge-quiz-5' },
  { id: 'pavilion', badge: 'challenge-stages-cleared-20' },
  { id: 'binocular-mount', badge: 'badge-missions-3' },
  { id: 'refractor-long', badge: 'badge-quiz-10' },
  { id: 'reflector', badge: 'challenge-quiz-mastered-25' },
  { id: 'dobsonian', badge: 'badge-messier-five' },
  { id: 'sct', badge: 'challenge-stages-perfect-5' },
  { id: 'radio-dish', badge: 'challenge-quiz-mastered-100' },
  { id: 'observatory-dome', badge: 'challenge-stages-cleared-40' },
] as const;
export type DecorationId = (typeof DECORATIONS)[number]['id'];
export const LEGACY_FREE_DECORATIONS: readonly DecorationId[] = [
  'flowers',
  'bench',
  'stones',
  'fern',
];
export const GROUND_STYLES = [
  { id: 'meadow', badge: null },
  { id: 'sand', badge: 'badge-quiz-5' },
  { id: 'stone', badge: 'badge-first-hop' },
  { id: 'snow', badge: 'challenge-observation-nights-10' },
] as const;
export type GroundStyle = (typeof GROUND_STYLES)[number]['id'];
export interface HorizonLook {
  slots: (DecorationId | null)[];
  ground: GroundStyle;
  sceneryEnabled: boolean;
  sceneryScale: 'small' | 'medium';
}
export interface Personal extends AvatarLook, HorizonLook {
  name: string;
}
export const DEFAULT_PERSONAL: Personal = {
  ...DEFAULT_AVATAR,
  name: '',
  slots: [null, null, 'bench', null, null],
  ground: 'meadow',
  sceneryEnabled: true,
  sceneryScale: 'small',
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
  ownedGround: ReadonlySet<string> = new Set(['meadow']),
): Personal {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const slots = Array.isArray(v.slots) ? v.slots : DEFAULT_PERSONAL.slots;
  const ids = new Set<string>();
  return {
    ...normalizeAvatar(v, ownedAvatar),
    name: normalizePersonalName(v.name),
    ground: GROUND_STYLES.some((g) => g.id === v.ground && ownedGround.has(g.id))
      ? (v.ground as GroundStyle)
      : 'meadow',
    sceneryEnabled: typeof v.sceneryEnabled === 'boolean' ? v.sceneryEnabled : true,
    sceneryScale: v.sceneryScale === 'medium' ? 'medium' : 'small',
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

/** 선택 ID만 공개한다. 이름·좌표·소유권·이미지 URL은 포함하지 않는다. */
export function horizonOf(profile: HorizonLook): HorizonLook {
  const { slots, ground, sceneryEnabled, sceneryScale } = profile;
  return { slots: [...slots], ground, sceneryEnabled, sceneryScale };
}

export function normalizePublicHorizon(value: unknown): HorizonLook {
  const normalized = normalizePersonal(
    value,
    new Set(DECORATIONS.map((item) => item.id)),
    undefined,
    new Set(GROUND_STYLES.map((item) => item.id)),
  );
  return horizonOf(normalized);
}
export function rewardsFor(badges: ReadonlySet<string>): DecorationId[] {
  return DECORATIONS.filter((d) => d.badge && badges.has(d.badge)).map((d) => d.id);
}
