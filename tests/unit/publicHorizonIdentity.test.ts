import { describe, expect, it } from 'vitest';
import { communityIdentity } from '@/community/identity';
import { getDb } from '@/db/database';
import { horizonOf, normalizePublicHorizon } from '@/personal/catalog';
import { DEFAULT_AVATAR } from '@/personal/avatar';
import { deleteLook, readPersonal } from '@/personal/store';

describe('공개 지평선의 데이터 경계', () => {
  it('다른 사용자의 해금된 지면·장식은 표시만 하고 내 소유권이나 진도를 바꾸지 않는다', async () => {
    const before = await readPersonal();
    const rows = await getDb().progress.toArray();
    const identity = communityIdentity({
      name: '관측자',
      avatar: { ...DEFAULT_AVATAR, hat: 'saturnhat' },
      horizon: {
        ground: 'snow',
        backdrop: 'snow-peaks',
        slots: ['observatory-dome', null, 'sct', 'pavilion', null],
        sceneryEnabled: false,
        sceneryScale: 'medium',
        lat: 37.56,
        lon: 126.98,
        address: '개인 관측지',
        name: '비공개 마당 이름',
        avatar: { skin: 'cocoa' },
      },
      email: 'private@example.org',
    });
    expect(identity).toEqual({
      name: '관측자',
      avatar: { ...DEFAULT_AVATAR, hat: 'saturnhat' },
      horizon: {
        ground: 'snow',
        backdrop: 'snow-peaks',
        slots: ['observatory-dome', null, 'sct', 'pavilion', null],
        sceneryEnabled: false,
        sceneryScale: 'medium',
      },
    });
    expect(await readPersonal()).toEqual(before);
    expect(await getDb().progress.toArray()).toEqual(rows);
  });

  it('구형·미공개 프로필에는 임의 지평선을 만들어 붙이지 않는다', () => {
    for (const horizon of [undefined, null, '', 42, false]) {
      expect(communityIdentity({ name: '구형 사용자', avatar: DEFAULT_AVATAR, horizon })).toEqual({
        name: '구형 사용자',
        avatar: DEFAULT_AVATAR,
      });
    }
  });

  it('공개 배치 복사본을 편집해도 원본의 다섯 자리와 옵션은 변하지 않는다', () => {
    const source = normalizePublicHorizon({
      ground: 'stone',
      sceneryEnabled: true,
      sceneryScale: 'small',
      slots: ['bench', null, null, null, 'sct'],
    });
    const copy = horizonOf(source);
    copy.slots[0] = 'pavilion';
    copy.ground = 'snow';
    expect(source.slots).toEqual(['bench', null, null, null, 'sct']);
    expect(source.ground).toBe('stone');
    expect(source.backdrop).toBe('field');
  });

  it('새 사용자가 빈 코디 칸을 비워도 기존 사용자 기본품을 지급하지 않는다', async () => {
    expect((await readPersonal()).legacy).toBe(false);
    await deleteLook(0);
    const after = await readPersonal();
    expect(after.legacy).toBe(false);
    expect(after.ownedAvatar.has('outfit:hoodie')).toBe(false);
    expect([...after.owned]).toEqual(['bench']);
  });
});
