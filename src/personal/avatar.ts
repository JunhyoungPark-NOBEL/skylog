export const SUITS = ['sage', 'lavender', 'clay', 'navy', 'ochre', 'rose'] as const;
export const SKINS = ['sand', 'amber', 'cocoa', 'porcelain', 'umber'] as const;
export const HATS = ['none', 'beanie', 'helmet', 'bucket', 'starcap'] as const;
export const HAIR_STYLES = ['none', 'short', 'bob', 'waves', 'ponytail'] as const;
export const HAIR_COLORS = ['ink', 'chestnut', 'copper', 'gold', 'silver'] as const;
export const EXPRESSIONS = ['smile', 'calm', 'joy', 'wink'] as const;
export const OUTFITS = ['classic', 'hoodie', 'overalls', 'spacesuit'] as const;
export const ACCESSORIES = ['none', 'binoculars', 'sketchbook', 'lantern', 'starwand'] as const;

export const AVATAR_OPTIONS = {
  suit: SUITS,
  skin: SKINS,
  hat: HATS,
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  expression: EXPRESSIONS,
  outfit: OUTFITS,
  accessory: ACCESSORIES,
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
] as const satisfies readonly AvatarReward[];

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
  };
}

/** 검증된 프로필에서 코디만 복사한다. 이름·마당 자리는 함께 저장하지 않는다. */
export function avatarOf(profile: AvatarLook): AvatarLook {
  const { suit, skin, hat, hair, hairColor, expression, outfit, accessory } = profile;
  return { suit, skin, hat, hair, hairColor, expression, outfit, accessory };
}
