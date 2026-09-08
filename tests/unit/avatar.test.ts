import { describe, expect, it } from 'vitest';
import {
  AVATAR_OPTIONS,
  AVATAR_REWARDS,
  DEFAULT_AVATAR,
  FREE_AVATAR_OPTIONS,
  avatarOf,
  avatarOptionKey,
  normalizeAvatar,
} from '@/personal/avatar';
import { DEFAULT_PERSONAL, normalizePersonal } from '@/personal/catalog';

describe('아바타 선택과 이전 프로필', () => {
  it('이전 색·피부·모자의 모든 조합을 유지하고 새 필드만 기존 모습으로 채운다', () => {
    for (const suit of ['sage', 'lavender', 'clay', 'navy']) {
      for (const skin of ['sand', 'amber', 'cocoa']) {
        for (const hat of ['none', 'beanie', 'helmet']) {
          expect(normalizeAvatar({ suit, skin, hat })).toEqual({
            ...DEFAULT_AVATAR,
            suit,
            skin,
            hat,
          });
        }
      }
    }
  });

  it('새 무료 옵션과 기존 헬멧은 보상 없이 선택할 수 있다', () => {
    for (const [category, choices] of Object.entries(AVATAR_OPTIONS)) {
      for (const value of choices) {
        if (!FREE_AVATAR_OPTIONS.has(`${category}:${value}`)) continue;
        expect(normalizeAvatar({ [category]: value }, new Set())).toHaveProperty(category, value);
      }
    }
    expect(FREE_AVATAR_OPTIONS.has('hat:helmet')).toBe(true);
    expect(normalizeAvatar({ suit: 'ochre', skin: 'umber', hat: 'bucket' })).toMatchObject({
      suit: 'ochre',
      skin: 'umber',
      hat: 'bucket',
    });
  });

  it('각 보상은 같은 분류의 보유 키가 있어야 적용된다', () => {
    for (const reward of AVATAR_REWARDS) {
      expect(avatarOptionKey(reward.category, reward.value)).toBe(reward.key);
      expect(FREE_AVATAR_OPTIONS.has(reward.key)).toBe(false);
      expect(normalizeAvatar({ [reward.category]: reward.value })).toHaveProperty(
        reward.category,
        DEFAULT_AVATAR[reward.category],
      );
      expect(
        normalizeAvatar({ [reward.category]: reward.value }, new Set([reward.value])),
      ).toHaveProperty(reward.category, DEFAULT_AVATAR[reward.category]);
      expect(
        normalizeAvatar({ [reward.category]: reward.value }, new Set([reward.key])),
      ).toHaveProperty(reward.category, reward.value);
    }
    expect(new Set(AVATAR_REWARDS.map((reward) => reward.key)).size).toBe(6);
  });

  it('알 수 없는 선택·보유 키·잘못된 값은 기본값으로 정리한다', () => {
    expect(normalizeAvatar(null)).toEqual(DEFAULT_AVATAR);
    expect(
      normalizeAvatar(
        {
          suit: '<script>',
          skin: {},
          hat: 'spacesuit',
          hair: 42,
          hairColor: null,
          expression: 'prototype',
          outfit: ['classic'],
          accessory: 'unknown',
        },
        new Set(['suit:<script>', 'hat:spacesuit', 'accessory:unknown']),
      ),
    ).toEqual(DEFAULT_AVATAR);
  });

  it('프로필 정규화는 이름과 마당을 유지하며 보상 소유권을 구분한다', () => {
    const source = {
      ...DEFAULT_PERSONAL,
      name: '별밤',
      suit: 'rose',
      hat: 'starcap',
      hair: 'waves',
      hairColor: 'copper',
      expression: 'wink',
      outfit: 'spacesuit',
      slots: ['bench', null, 'flowers', null, null],
    };
    const owned = new Set(['bench', 'flowers']);
    expect(normalizePersonal(source, owned)).toMatchObject({
      name: '별밤',
      slots: source.slots,
      suit: 'rose',
      hair: 'waves',
      hairColor: 'copper',
      expression: 'wink',
      hat: 'beanie',
      outfit: 'classic',
    });
    expect(normalizePersonal(source, owned, new Set(['hat:starcap', 'outfit:spacesuit']))).toEqual(
      source,
    );
  });

  it('코디 복사는 이름·장식·다른 메타데이터를 포함하지 않으며 원본과 독립적이다', () => {
    const profile = { ...DEFAULT_PERSONAL, name: '별밤', secret: 'ignored' };
    const look = avatarOf(profile);
    expect(look).toEqual(DEFAULT_AVATAR);
    look.suit = 'rose';
    expect(profile.suit).toBe('sage');
    expect(Object.keys(look).sort()).toEqual(Object.keys(AVATAR_OPTIONS).sort());
  });
});
