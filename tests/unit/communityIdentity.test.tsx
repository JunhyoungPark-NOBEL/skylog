import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { communityIdentity, publicNickname } from '@/community/identity';
import { DEFAULT_AVATAR, AVATAR_REWARDS } from '@/personal/avatar';
import { AuthorIdentity } from '@/features/personal/AuthorIdentity';
import { grantRewards, readPersonal, saveAvatarLook } from '@/personal/store';
import { readFileSync } from 'node:fs';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('공개 작성자와 천문학 꾸미기', () => {
  it('모든 보상 조건은 실제 배포된 학습 업적에 연결돼 있다', () => {
    const badges = JSON.parse(readFileSync('public/data/learn/v2/badges.json', 'utf8')) as {
      id: string;
      enabled?: boolean;
    }[];
    const active = new Set(badges.filter((b) => b.enabled !== false).map((b) => b.id));
    for (const reward of AVATAR_REWARDS) expect(active.has(reward.badge)).toBe(true);
  });
  it('이메일·태그·제어문자와 너무 긴 별칭을 공개하지 않는다', () => {
    for (const invalid of [
      null,
      '',
      '  ',
      'a@example.org',
      '<b>별</b>',
      '별\n밤',
      '밤\u202e별',
      'x'.repeat(25),
    ])
      expect(publicNickname(invalid)).toBe('');
    expect(publicNickname('  별을 걷는 사람  ')).toBe('별을 걷는 사람');
    expect(publicNickname('🌟'.repeat(24))).toBe('🌟'.repeat(24));
  });
  it('기존 작성자는 기본 아바타로 보이고 낯선 URL·SVG는 실행 가능한 외형이 되지 않는다', () => {
    expect(communityIdentity({ name: '별밤' })).toEqual({ name: '별밤', avatar: DEFAULT_AVATAR });
    const identity = communityIdentity({
      name: 'private@example.org',
      avatar: {
        hat: 'https://example.org/a.svg',
        background: '<svg onload=alert(1)>',
        expression: 'wink',
      },
      email: 'private@example.org',
    });
    expect(identity.name).toBe('');
    expect(identity.avatar).toEqual({ ...DEFAULT_AVATAR, expression: 'wink' });
    const markup = renderToStaticMarkup(<AuthorIdentity identity={identity} />);
    expect(markup).toContain('author-avatar');
    expect(markup).toContain('social.observer');
    expect(markup).not.toContain('private@example.org');
    expect(markup).not.toContain('<image');
    expect(markup).not.toContain('onload');
  });
  it('공개된 안전한 보상 외형을 보면서 내 로컬 보상을 해제하지 않는다', async () => {
    const author = communityIdentity({
      name: '관측자',
      avatar: { ...DEFAULT_AVATAR, hat: 'starcrown', background: 'orion' },
    });
    expect(author.avatar.hat).toBe('starcrown');
    expect(author.avatar.background).toBe('orion');
    expect((await readPersonal()).ownedAvatar.has('hat:starcrown')).toBe(false);
    await saveAvatarLook(author.avatar);
    expect((await readPersonal()).profile.hat).toBe('beanie');
    expect((await readPersonal()).profile.background).toBe('garden');
  });
  it('기존 성취별 새 보상을 개별 지급하고 장착·재읽기에서 보존한다', async () => {
    const extra = AVATAR_REWARDS.filter(
      (r) => r.category === 'background' || ['starcrown', 'meteorcap'].includes(r.value),
    );
    expect(extra).toHaveLength(6);
    await grantRewards(new Set(['badge-constellations-2', 'badge-quiz-3']));
    await saveAvatarLook({ ...DEFAULT_AVATAR, hat: 'starcrown', background: 'orion' });
    expect((await readPersonal()).profile).toMatchObject({ hat: 'starcrown', background: 'orion' });
    expect((await readPersonal()).ownedAvatar.has('background:galaxy')).toBe(false);
    await grantRewards(new Set());
    expect((await readPersonal()).profile).toMatchObject({ hat: 'starcrown', background: 'orion' });
  });
  it('배경과 모자 그림은 각기 다르고 원형 초상·야간 필터의 ID를 중복하지 않는다', () => {
    const looks = [
      DEFAULT_AVATAR,
      { ...DEFAULT_AVATAR, hat: 'starcrown', background: 'orion' },
      { ...DEFAULT_AVATAR, hat: 'meteorcap', background: 'galaxy' },
    ] as const;
    const markup = renderToStaticMarkup(
      <>
        {looks.map((avatar, i) => (
          <AuthorIdentity key={i} identity={{ name: '별밤', avatar }} />
        ))}
      </>,
    );
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(markup).toContain('data-avatar-background="orion"');
    expect(markup).toContain('data-avatar-background="galaxy"');
    expect(markup.match(/data-testid="author-avatar"/g)).toHaveLength(3);
  });
});
