export const SUITS = ['sage', 'lavender', 'clay', 'navy', 'ochre', 'rose'] as const;
export const SKINS = ['sand', 'amber', 'cocoa', 'porcelain', 'umber'] as const;
export const HATS = [
  'none',
  'beanie',
  'helmet',
  'bucket',
  'starcap',
  'starcrown',
  'meteorcap',
  'crescentberet',
  'saturnhat',
  'planetarium',
] as const;
export const AVATAR_BACKGROUNDS = ['garden', 'orion', 'moonlit', 'saturn', 'galaxy'] as const;
export const HAIR_STYLES = ['none', 'short', 'bob', 'waves', 'ponytail'] as const;
export const HAIR_COLORS = ['ink', 'chestnut', 'copper', 'gold', 'silver'] as const;
export const EXPRESSIONS = ['smile', 'calm', 'joy', 'wink'] as const;
export const OUTFITS = [
  'classic',
  'hoodie',
  'overalls',
  'spacesuit',
  'observatorycoat',
  'constellationponcho',
] as const;
export const ACCESSORIES = [
  'none',
  'binoculars',
  'sketchbook',
  'lantern',
  'starwand',
  'cometscarf',
  'planisphere',
  'orrery',
] as const;

export const AVATAR_OPTIONS = {
  suit: SUITS,
  skin: SKINS,
  hat: HATS,
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  expression: EXPRESSIONS,
  outfit: OUTFITS,
  accessory: ACCESSORIES,
  background: AVATAR_BACKGROUNDS,
} as const;

export type AvatarCategory = keyof typeof AVATAR_OPTIONS;
export type AvatarLook = {
  [Category in AvatarCategory]: (typeof AVATAR_OPTIONS)[Category][number];
};

/** 새 필드는 예전 아바타의 모습이 달라지지 않는 값으로 채운다. */
export const DEFAULT_AVATAR: AvatarLook = {
  suit: 'sage',
  skin: 'amber',
  hat: 'beanie',
  hair: 'none',
  hairColor: 'ink',
  expression: 'smile',
  outfit: 'classic',
  accessory: 'none',
  background: 'garden',
};

export function avatarOptionKey<Category extends AvatarCategory>(
  category: Category,
  value: AvatarLook[Category],
): string {
  return `${category}:${value}`;
}

type AvatarReward = {
  [Category in AvatarCategory]: {
    key: `${Category}:${AvatarLook[Category]}`;
    category: Category;
    value: AvatarLook[Category];
    badge: string;
  };
}[AvatarCategory];

/** 로컬 업적 보상 목록. 결제 권한이나 서버에서 검증한 소유권을 뜻하지 않는다. */
export const AVATAR_REWARDS = [
  { key: 'hat:starcrown', category: 'hat', value: 'starcrown', badge: 'badge-quiz-3' },
  { key: 'hat:meteorcap', category: 'hat', value: 'meteorcap', badge: 'badge-summer-guide' },
  {
    key: 'background:orion',
    category: 'background',
    value: 'orion',
    badge: 'badge-constellations-2',
  },
  {
    key: 'background:moonlit',
    category: 'background',
    value: 'moonlit',
    badge: 'challenge-observation-nights-3',
  },
  {
    key: 'background:saturn',
    category: 'background',
    value: 'saturn',
    badge: 'challenge-stages-cleared-5',
  },
  {
    key: 'background:galaxy',
    category: 'background',
    value: 'galaxy',
    badge: 'badge-messier-three',
  },
  {
    key: 'outfit:spacesuit',
    category: 'outfit',
    value: 'spacesuit',
    badge: 'challenge-stages-cleared-5',
  },
  {
    key: 'hat:starcap',
    category: 'hat',
    value: 'starcap',
    badge: 'challenge-stories-read-10',
  },
  {
    key: 'accessory:binoculars',
    category: 'accessory',
    value: 'binoculars',
    badge: 'badge-first-look',
  },
  {
    key: 'accessory:sketchbook',
    category: 'accessory',
    value: 'sketchbook',
    badge: 'badge-first-sketch',
  },
  {
    key: 'accessory:lantern',
    category: 'accessory',
    value: 'lantern',
    badge: 'challenge-observation-nights-3',
  },
  {
    key: 'accessory:starwand',
    category: 'accessory',
    value: 'starwand',
    badge: 'challenge-observed-objects-25',
  },
  { key: 'suit:lavender', category: 'suit', value: 'lavender', badge: 'badge-quiz-3' },
  { key: 'suit:navy', category: 'suit', value: 'navy', badge: 'badge-constellations-4' },
  { key: 'suit:ochre', category: 'suit', value: 'ochre', badge: 'badge-missions-3' },
  { key: 'suit:rose', category: 'suit', value: 'rose', badge: 'badge-first-sketch' },
  { key: 'hat:helmet', category: 'hat', value: 'helmet', badge: 'challenge-stages-cleared-5' },
  { key: 'hat:bucket', category: 'hat', value: 'bucket', badge: 'badge-first-look' },
  {
    key: 'outfit:hoodie',
    category: 'outfit',
    value: 'hoodie',
    badge: 'challenge-observation-nights-3',
  },
  {
    key: 'outfit:overalls',
    category: 'outfit',
    value: 'overalls',
    badge: 'challenge-detailed-objects-5',
  },
  {
    key: 'hat:crescentberet',
    category: 'hat',
    value: 'crescentberet',
    badge: 'challenge-observation-nights-10',
  },
  {
    key: 'hat:saturnhat',
    category: 'hat',
    value: 'saturnhat',
    badge: 'challenge-quiz-mastered-25',
  },
  {
    key: 'hat:planetarium',
    category: 'hat',
    value: 'planetarium',
    badge: 'challenge-stages-perfect-5',
  },
  {
    key: 'outfit:observatorycoat',
    category: 'outfit',
    value: 'observatorycoat',
    badge: 'challenge-stages-cleared-20',
  },
  {
    key: 'outfit:constellationponcho',
    category: 'outfit',
    value: 'constellationponcho',
    badge: 'challenge-constellation-count-12',
  },
  {
    key: 'accessory:cometscarf',
    category: 'accessory',
    value: 'cometscarf',
    badge: 'badge-quiz-10',
  },
  {
    key: 'accessory:planisphere',
    category: 'accessory',
    value: 'planisphere',
    badge: 'badge-quiz-5',
  },
  {
    key: 'accessory:orrery',
    category: 'accessory',
    value: 'orrery',
    badge: 'challenge-stages-cleared-40',
  },
] as const satisfies readonly AvatarReward[];

/** build19까지 무료였던 선택의 고정 목록. 새 사용자의 기본 소유권으로 사용하지 않는다. */
export const LEGACY_FREE_AVATAR_OPTIONS: ReadonlySet<string> = new Set([
  ...SUITS.map((value) => `suit:${value}`),
  ...SKINS.map((value) => `skin:${value}`),
  ...['none', 'beanie', 'helmet', 'bucket'].map((value) => `hat:${value}`),
  ...HAIR_STYLES.map((value) => `hair:${value}`),
  ...HAIR_COLORS.map((value) => `hairColor:${value}`),
  ...EXPRESSIONS.map((value) => `expression:${value}`),
  ...['classic', 'hoodie', 'overalls'].map((value) => `outfit:${value}`),
  'accessory:none',
  'background:garden',
]);

export const FREE_AVATAR_OPTIONS: ReadonlySet<string> = new Set(
  Object.entries(AVATAR_OPTIONS).flatMap(([category, values]) =>
    values
      .map((value) => `${category}:${value}`)
      .filter((key) => !AVATAR_REWARDS.some((reward) => reward.key === key)),
  ),
);

/** 가져온 값에서 알 수 없는 선택과 아직 받지 않은 보상을 제거한다. */
export function normalizeAvatar(
  value: unknown,
  ownedAvatar: ReadonlySet<string> = FREE_AVATAR_OPTIONS,
): AvatarLook {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  function option<Category extends AvatarCategory>(category: Category): AvatarLook[Category] {
    const selected = v[category];
    const choices: readonly string[] = AVATAR_OPTIONS[category];
    if (typeof selected !== 'string' || !choices.includes(selected))
      return DEFAULT_AVATAR[category];
    const key = `${category}:${selected}`;
    return FREE_AVATAR_OPTIONS.has(key) || ownedAvatar.has(key)
      ? (selected as AvatarLook[Category])
      : DEFAULT_AVATAR[category];
  }
  return {
    suit: option('suit'),
    skin: option('skin'),
    hat: option('hat'),
    hair: option('hair'),
    hairColor: option('hairColor'),
    expression: option('expression'),
    outfit: option('outfit'),
    accessory: option('accessory'),
    background: option('background'),
  };
}

/** 검증된 프로필에서 코디만 복사한다. 이름·마당 자리는 함께 저장하지 않는다. */
export function avatarOf(profile: AvatarLook): AvatarLook {
  const { suit, skin, hat, hair, hairColor, expression, outfit, accessory, background } = profile;
  return { suit, skin, hat, hair, hairColor, expression, outfit, accessory, background };
}
