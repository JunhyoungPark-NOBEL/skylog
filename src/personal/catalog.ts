import { DEFAULT_AVATAR, normalizeAvatar, type AvatarLook } from './avatar';

export { SUITS, SKINS, HATS } from './avatar';

/** 남쪽 지평선의 다섯 자리에 놓는 학습 보상. 유료 재화나 무작위 보상은 없다. */
export const DECORATIONS = [
  { id: 'bench', badge: null },
  { id: 'house', badge: 'badge-quiz-3' },
  { id: 'observing-deck', badge: 'badge-missions-3' },
  { id: 'dog', badge: 'badge-first-look' },
  { id: 'telescope', badge: 'badge-first-look' },
  { id: 'sketchbook', badge: 'badge-first-sketch' },
  { id: 'signpost', badge: 'badge-first-hop' },
  { id: 'lantern', badge: 'badge-two-star-check' },
  { id: 'moon', badge: 'challenge-observation-nights-3' },
  { id: 'books', badge: 'challenge-stages-cleared-5' },
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
export const LEGACY_DECORATION_REPLACEMENTS = {
  flowers: 'house',
  stones: 'observing-deck',
  fern: 'dog',
  sunflowers: 'house',
} as const;
export type ActiveDecorationId = (typeof DECORATIONS)[number]['id'];
/** 구버전 백업·공개 프로필을 읽을 수 있도록 옛 ID의 입력 타입도 보존한다. */
export type DecorationId = ActiveDecorationId | keyof typeof LEGACY_DECORATION_REPLACEMENTS;
export function activeDecorationId(value: unknown): ActiveDecorationId | null {
  if (typeof value !== 'string') return null;
  if (Object.hasOwn(LEGACY_DECORATION_REPLACEMENTS, value))
    return LEGACY_DECORATION_REPLACEMENTS[value as keyof typeof LEGACY_DECORATION_REPLACEMENTS];
  return DECORATIONS.some((item) => item.id === value) ? (value as ActiveDecorationId) : null;
}
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
export const BACKDROP_STYLES = [
  { id: 'field', badge: null },
  { id: 'rocky-peaks', badge: 'challenge-stages-cleared-5' },
  { id: 'snow-peaks', badge: 'challenge-observation-nights-10' },
  { id: 'sea', badge: 'badge-quiz-5' },
] as const;
export type HorizonBackdrop = (typeof BACKDROP_STYLES)[number]['id'];
export interface HorizonLook {
  slots: (DecorationId | null)[];
  ground: GroundStyle;
  sceneryEnabled: boolean;
  sceneryScale: 'small' | 'medium';
  /** 구버전 공개 JSON에는 없으며 읽을 때 field를 적용한다. */
  backdrop?: HorizonBackdrop;
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
  backdrop: 'field',
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
  ownedBackdrop: ReadonlySet<string> = new Set(['field']),
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
    backdrop: BACKDROP_STYLES.some((item) => item.id === v.backdrop && ownedBackdrop.has(item.id))
      ? (v.backdrop as HorizonBackdrop)
      : 'field',
    slots: Array.from({ length: 5 }, (_, i) => {
      const original: unknown = slots[i];
      const id = activeDecorationId(original);
      if (
        !id ||
        !(owned.has(id) || (typeof original === 'string' && owned.has(original))) ||
        ids.has(id)
      )
        return null;
      ids.add(id);
      return id;
    }),
  };
}

/** 선택 ID만 공개한다. 이름·좌표·소유권·이미지 URL은 포함하지 않는다. */
export function horizonOf(profile: HorizonLook): HorizonLook {
  const { slots, ground, sceneryEnabled, sceneryScale, backdrop = 'field' } = profile;
  return { slots: [...slots], ground, sceneryEnabled, sceneryScale, backdrop };
}

export function normalizePublicHorizon(value: unknown): HorizonLook {
  const normalized = normalizePersonal(
    value,
    new Set(DECORATIONS.map((item) => item.id)),
    undefined,
    new Set(GROUND_STYLES.map((item) => item.id)),
    new Set(BACKDROP_STYLES.map((item) => item.id)),
  );
  return horizonOf(normalized);
}
export function rewardsFor(badges: ReadonlySet<string>): DecorationId[] {
  return DECORATIONS.filter((d) => d.badge && badges.has(d.badge)).map((d) => d.id);
}
