import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AvatarArt, AvatarPortrait, AvatarPreview } from '@/features/personal/AvatarArt';
import { AVATAR_REWARDS, DEFAULT_AVATAR, type AvatarLook } from '@/personal/avatar';
import ko from '@/i18n/partials/avatar.ko.json';
import en from '@/i18n/partials/avatar.en.json';

const CELESTIAL_LOOKS: Partial<AvatarLook>[] = [
  { hat: 'crescentberet' },
  { hat: 'saturnhat' },
  { hat: 'planetarium' },
  { outfit: 'observatorycoat' },
  { outfit: 'constellationponcho' },
  { accessory: 'cometscarf' },
  { accessory: 'planisphere' },
  { accessory: 'orrery' },
];

describe('천문학 아바타 보상의 그림과 안내', () => {
  it('여덟 천문학 소품은 기존 아바타와 구분되는 그림이며 원격 이미지가 없다', () => {
    const basic = renderToStaticMarkup(
      <svg>
        <AvatarArt profile={DEFAULT_AVATAR} />
      </svg>,
    );
    const drawings = CELESTIAL_LOOKS.map((choice) =>
      renderToStaticMarkup(
        <svg>
          <AvatarArt profile={{ ...DEFAULT_AVATAR, ...choice }} />
        </svg>,
      ),
    );
    expect(new Set(drawings).size).toBe(8);
    for (const drawing of drawings) {
      expect(drawing).not.toBe(basic);
      expect(drawing).not.toMatch(/<image|<script|NaN|Infinity|https?:/);
    }
  });

  it('신규 보상과 이전 기본 코디에 한국어·영어 이름과 획득 조건이 있다', () => {
    for (const language of [ko, en]) {
      const labels = language.avatar.options as Record<string, Record<string, string>>;
      const unlocks = language.avatar.unlock as Record<string, string>;
      // 기존 열두 보상의 일부 번역은 community-identity에 있으므로 이번 추가분만 확인한다.
      for (const reward of AVATAR_REWARDS.slice(12)) {
        expect(labels[reward.category]?.[reward.value]?.trim().length).toBeGreaterThan(0);
        expect(unlocks[reward.value]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('댓글 초상에는 선택한 배경을 넣지 않고 아바타 미리보기에는 보존한다', () => {
    const avatar = { ...DEFAULT_AVATAR, background: 'orion' } as const;
    const portrait = renderToStaticMarkup(<AvatarPortrait profile={avatar} label="관측자" />);
    const preview = renderToStaticMarkup(<AvatarPreview profile={avatar} label="미리보기" />);
    expect(portrait).toContain('data-testid="author-avatar"');
    expect(portrait).not.toContain('data-avatar-background');
    expect(preview).toContain('data-avatar-background="orion"');
    expect(portrait).toContain('--personal-night-filter');
  });
});
