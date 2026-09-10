import { describe, expect, it } from 'vitest';
import { getDb } from '@/db/database';
import { exportBundle, importBundle } from '@/db/exportImport';
import { getProgress, setProgress } from '@/db/repos/progress';
import { AVATAR_REWARDS, DEFAULT_AVATAR, avatarOf } from '@/personal/avatar';
import { DEFAULT_PERSONAL } from '@/personal/catalog';
import {
  deleteLook,
  grantRewards,
  readPersonal,
  saveAvatarLook,
  saveGarden,
  saveLook,
  savePersonal,
} from '@/personal/store';

describe('아바타 보상과 코디 저장', () => {
  it('구형 프로필의 선택·이름·배치를 보존하면서 새 필드를 채운다', async () => {
    await setProgress('personal.profile', {
      suit: 'navy',
      skin: 'cocoa',
      hat: 'helmet',
      name: '두 사람의 마당',
      slots: ['stones', null, 'fern', 'flowers', 'bench'],
    });
    const before = await readPersonal();
    expect(before.profile).toEqual({
      ...DEFAULT_PERSONAL,
      suit: 'navy',
      skin: 'cocoa',
      hat: 'helmet',
      name: '두 사람의 마당',
      slots: ['stones', null, 'fern', 'flowers', 'bench'],
    });
    expect(before.looks).toEqual([null, null, null]);
    await saveAvatarLook({ ...avatarOf(before.profile), hair: 'bob' });
    expect((await readPersonal()).profile).toEqual({ ...before.profile, hair: 'bob' });
  });

  it('동시에 지급해도 장식과 아바타 보상이 한 번만 기록되며 업적 재계산 후에도 남는다', async () => {
    const badges = new Set(AVATAR_REWARDS.map((reward) => reward.badge));
    await Promise.all([grantRewards(badges), grantRewards(badges), grantRewards(badges)]);
    const rows = await getDb().progress.where('key').startsWith('avatar.reward:').toArray();
    expect(rows).toHaveLength(12);
    for (const reward of AVATAR_REWARDS) {
      expect(rows.filter((row) => row.key === 'avatar.reward:' + reward.key)).toHaveLength(1);
      expect((await readPersonal()).ownedAvatar.has(reward.key)).toBe(true);
    }
    expect(await getDb().progress.where('key').equals('personal.reward:telescope').count()).toBe(1);
    await grantRewards(new Set());
    await grantRewards(badges);
    expect(await getDb().progress.where('key').startsWith('avatar.reward:').toArray()).toEqual(
      rows,
    );
    expect((await readPersonal()).owned.has('telescope')).toBe(true);
  });

  it('아바타 보상 쓰기가 실패하면 같은 업적의 마당 보상도 부분 지급하지 않는다', async () => {
    const db = getDb();
    const failAvatar = (_key: unknown, row: { key: string }) => {
      if (row.key === 'avatar.reward:accessory:binoculars') throw new Error('storage failed');
    };
    db.progress.hook('creating', failAvatar);
    await expect(grantRewards(new Set(['badge-first-look']))).rejects.toThrow('storage failed');
    db.progress.hook('creating').unsubscribe(failAvatar);
    expect(await db.progress.count()).toBe(0);
    await grantRewards(new Set(['badge-first-look']));
    expect((await readPersonal()).ownedAvatar.has('accessory:binoculars')).toBe(true);
    expect((await readPersonal()).owned.has('telescope')).toBe(true);
  });

  it('가져온 미보유·알 수 없는 옵션과 손상된 보상은 프로필·코디 양쪽에서 제거한다', async () => {
    await setProgress('avatar.reward:hat:starcap', { earnedAt: 'invalid' });
    await setProgress('avatar.reward:outfit:spacesuit', true);
    await setProgress('avatar.reward:accessory:unknown', { earnedAt: '2026-09-09T00:00:00Z' });
    await setProgress('personal.profile', {
      ...DEFAULT_PERSONAL,
      suit: 'rose',
      hat: 'starcap',
      outfit: 'spacesuit',
      accessory: 'unknown',
      name: '<별밤>\n',
    });
    await setProgress('personal.looks', [
      {
        name: '<망원경>\n',
        avatar: { ...DEFAULT_AVATAR, outfit: 'spacesuit', accessory: 'lantern', hair: 'waves' },
      },
      { name: 'missing avatar' },
      { name: 'wrong avatar', avatar: [] },
      { name: 'fourth', avatar: DEFAULT_AVATAR },
    ]);
    const data = await readPersonal();
    expect(data.profile).toMatchObject({
      name: '별밤',
      suit: 'rose',
      hat: 'beanie',
      outfit: 'classic',
      accessory: 'none',
    });
    expect([...data.ownedAvatar].some((key) => key.includes('unknown'))).toBe(false);
    expect(data.ownedAvatar.has('hat:starcap')).toBe(false);
    expect(data.looks).toEqual([
      { name: '망원경', avatar: { ...DEFAULT_AVATAR, hair: 'waves' } },
      null,
      null,
    ]);
  });

  it('받은 보상만 새 아바타와 코디에 저장하며 현재 이름·배치를 유지한다', async () => {
    await savePersonal({ ...DEFAULT_PERSONAL, name: '우리 마당' });
    await grantRewards(new Set(['badge-first-look']));
    const requested = { ...DEFAULT_AVATAR, accessory: 'binoculars', outfit: 'spacesuit' } as const;
    await saveAvatarLook(requested);
    await saveLook(2, '쌍안경 밤', requested);
    const data = await readPersonal();
    expect(data.profile).toEqual({
      ...DEFAULT_PERSONAL,
      name: '우리 마당',
      accessory: 'binoculars',
    });
    expect(data.looks[2]).toEqual({
      name: '쌍안경 밤',
      avatar: { ...DEFAULT_AVATAR, accessory: 'binoculars' },
    });
  });

  it('마당 이름·배치·아바타를 어느 순서로 동시에 저장해도 각 변경을 보존한다', async () => {
    for (const reversed of [false, true]) {
      await savePersonal(DEFAULT_PERSONAL);
      const actions = [
        () => saveGarden({ name: '최신 마당' }),
        () => saveGarden({ slots: [null, 'flowers', 'bench', null, null] }),
        () =>
          saveAvatarLook({ ...DEFAULT_AVATAR, suit: 'rose', hair: 'ponytail', outfit: 'hoodie' }),
      ];
      await Promise.all((reversed ? actions.reverse() : actions).map((save) => save()));
      expect((await readPersonal()).profile).toEqual({
        ...DEFAULT_AVATAR,
        name: '최신 마당',
        slots: [null, 'flowers', 'bench', null, null],
        suit: 'rose',
        hair: 'ponytail',
        outfit: 'hoodie',
      });
      expect(await getDb().progress.where('key').equals('personal.profile').count()).toBe(1);
    }
  });

  it('비어 있던 코디 세 칸의 동시 저장과 다른 칸 삭제를 원자적으로 보존한다', async () => {
    await saveGarden({ name: '현재 마당' });
    const looks = [
      { ...DEFAULT_AVATAR, suit: 'rose' },
      { ...DEFAULT_AVATAR, hair: 'bob' },
      { ...DEFAULT_AVATAR, outfit: 'overalls' },
    ] as const;
    await Promise.all(looks.map((look, index) => saveLook(index, `밤 ${index}`, look)));
    expect((await readPersonal()).looks).toEqual(
      looks.map((avatar, index) => ({ name: `밤 ${index}`, avatar })),
    );
    expect(await getDb().progress.where('key').equals('personal.looks').count()).toBe(1);
    await Promise.all([deleteLook(1), saveLook(2, '', { ...DEFAULT_AVATAR, skin: 'umber' })]);
    expect((await readPersonal()).looks).toEqual([
      { name: '밤 0', avatar: looks[0] },
      null,
      { name: '', avatar: { ...DEFAULT_AVATAR, skin: 'umber' } },
    ]);
    expect((await readPersonal()).profile).toEqual({ ...DEFAULT_PERSONAL, name: '현재 마당' });
  });

  it('코디 이름을 정리하고 범위 밖 번호를 쓰거나 삭제하지 않는다', async () => {
    await saveLook(0, ' <' + '가'.repeat(30) + '>\n ', DEFAULT_AVATAR);
    expect((await readPersonal()).looks[0]?.name).toBe('가'.repeat(24));
    const before = await getProgress('personal.looks');
    for (const index of [-1, 3, 0.5, NaN, Infinity]) {
      await expect(saveLook(index, 'invalid', DEFAULT_AVATAR)).rejects.toThrow(RangeError);
      await expect(deleteLook(index)).rejects.toThrow(RangeError);
    }
    expect(await getProgress('personal.looks')).toEqual(before);
  });

  it('기존 백업에 보상·아바타·코디 세 칸을 담고 복원한다', async () => {
    await grantRewards(new Set(AVATAR_REWARDS.map((reward) => reward.badge)));
    await savePersonal({
      ...DEFAULT_PERSONAL,
      name: '별밤',
      slots: ['telescope', 'bench', null, 'fern', null],
      outfit: 'spacesuit',
      hat: 'starcap',
      hair: 'waves',
      hairColor: 'silver',
      accessory: 'starwand',
      expression: 'joy',
      background: 'galaxy',
    });
    await saveLook(0, '관측', { ...DEFAULT_AVATAR, accessory: 'binoculars' });
    await saveLook(2, '스케치', { ...DEFAULT_AVATAR, accessory: 'sketchbook', outfit: 'overalls' });
    const before = await readPersonal();
    const bundle = await exportBundle();
    await getDb().progress.clear();
    await importBundle(bundle, { policy: 'newest' });
    expect(await readPersonal()).toEqual(before);
  });
});
