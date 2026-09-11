import { describe, expect, it } from 'vitest';
import { getDb } from '@/db/database';
import { getProgress, setProgress } from '@/db/repos/progress';
import { exportBundle, importBundle } from '@/db/exportImport';
import { DEFAULT_AVATAR, LEGACY_FREE_AVATAR_OPTIONS, AVATAR_REWARDS } from '@/personal/avatar';
import {
  DEFAULT_PERSONAL,
  DECORATIONS,
  GROUND_STYLES,
  normalizePublicHorizon,
} from '@/personal/catalog';
import { readPersonal, saveGarden, saveAvatarLook, saveLook, grantRewards } from '@/personal/store';
import badges from '../../public/data/learn/v2/badges.json';

describe('지평선 꾸미기 소유권과 이전 버전 보존', () => {
  it('신규 사용자는 벤치와 잔디로 시작하고 처음 저장 후에도 잠금이 유지된다', async () => {
    const first = await readPersonal();
    expect([...first.owned]).toEqual(['bench']);
    expect([...first.ownedGround]).toEqual(['meadow']);
    expect(first.profile.slots).toEqual([null, null, 'bench', null, null]);
    expect(first.ownedAvatar.has('outfit:hoodie')).toBe(false);
    await saveGarden({
      name: '새 관측자',
      ground: 'snow',
      slots: ['dobsonian', null, 'bench', null, null],
    });
    await saveAvatarLook({ ...DEFAULT_AVATAR, outfit: 'hoodie' });
    const saved = await readPersonal();
    expect(saved.legacy).toBe(false);
    expect(saved.profile.ground).toBe('meadow');
    expect(saved.profile.outfit).toBe('classic');
    expect(saved.profile.slots).toEqual([null, null, 'bench', null, null]);
  });
  it('기존 프로필과 보관 코디의 기본 지급품을 이후 저장과 재조회에도 보존한다', async () => {
    await setProgress('personal.profile', {
      ...DEFAULT_AVATAR,
      outfit: 'hoodie',
      suit: 'lavender',
      slots: ['flowers', 'bench', null, 'fern', 'stones'],
    });
    await setProgress('personal.looks', [
      { name: '예전 코디', avatar: { ...DEFAULT_AVATAR, hat: 'helmet' } },
      null,
      null,
    ]);
    const old = await readPersonal();
    expect(old.legacy).toBe(true);
    expect(old.profile.outfit).toBe('hoodie');
    expect(old.looks[0]?.avatar.hat).toBe('helmet');
    for (const key of LEGACY_FREE_AVATAR_OPTIONS) expect(old.ownedAvatar.has(key)).toBe(true);
    expect(old.ownedAvatar.has('hat:starcrown')).toBe(false);
    await saveGarden({ sceneryScale: 'medium' });
    expect((await readPersonal()).profile.slots).toEqual([
      'flowers',
      'bench',
      null,
      'fern',
      'stones',
    ]);
    expect(await getProgress('personal.ownership-v2')).toEqual({ version: 2, legacy: true });
  });
  it('신규 보관 코디만 먼저 저장해도 다음 읽기에서 기존 사용자로 오인하지 않는다', async () => {
    await saveLook(0, '첫 코디', { ...DEFAULT_AVATAR, suit: 'rose' });
    expect((await readPersonal()).legacy).toBe(false);
    expect((await readPersonal()).looks[0]?.avatar.suit).toBe('sage');
  });
  it('같은 업적의 지면·장식·코디를 원자적으로 해금하고 나중에도 보존한다', async () => {
    await Promise.all([
      grantRewards(new Set(['badge-quiz-5'])),
      grantRewards(new Set(['badge-quiz-5'])),
    ]);
    expect(await getDb().progress.where('key').equals('ground.reward:sand').count()).toBe(1);
    await saveGarden({ ground: 'sand', slots: ['picnic-table', null, 'bench', null, null] });
    await grantRewards(new Set());
    const saved = await readPersonal();
    expect(saved.profile.ground).toBe('sand');
    expect(saved.owned.has('picnic-table')).toBe(true);
    expect(saved.ownedAvatar.has('accessory:planisphere')).toBe(true);
  });
  it('지면 지급이 실패하면 같은 트랜잭션의 다른 보상도 지급하지 않는다', async () => {
    const db = getDb();
    const fail = (_key: unknown, row: { key: string }) => {
      if (row.key === 'ground.reward:sand') throw new Error('disk full');
    };
    db.progress.hook('creating', fail);
    await expect(grantRewards(new Set(['badge-quiz-5']))).rejects.toThrow('disk full');
    db.progress.hook('creating').unsubscribe(fail);
    expect(await db.progress.count()).toBe(0);
  });
  it('아바타와 지평선을 동시에 저장해도 서로 덮어쓰지 않으며 백업으로 복원한다', async () => {
    await grantRewards(new Set(['badge-quiz-5']));
    await Promise.all([
      saveGarden({ ground: 'sand', sceneryEnabled: false }),
      saveAvatarLook({ ...DEFAULT_AVATAR, skin: 'cocoa' }),
    ]);
    const bundle = await exportBundle();
    await getDb().progress.clear();
    await importBundle(bundle, { policy: 'newest' });
    const result = await readPersonal();
    expect(result.profile).toEqual({
      ...DEFAULT_PERSONAL,
      ground: 'sand',
      sceneryEnabled: false,
      skin: 'cocoa',
    });
    expect(result.legacy).toBe(false);
  });
  it('모든 보상 조건이 실제 활성 업적으로 존재한다', () => {
    const available = new Set(badges.filter((b) => b.enabled !== false).map((b) => b.id));
    for (const item of [...DECORATIONS, ...GROUND_STYLES, ...AVATAR_REWARDS])
      if (item.badge) expect(available.has(item.badge), item.badge).toBe(true);
  });
  it('공개 지평선에 임의 SVG·URL·좌표·이름을 포함하지 않는다', () => {
    const result = normalizePublicHorizon({
      ground: 'javascript:',
      sceneryScale: 99,
      sceneryEnabled: 'yes',
      slots: ['sct', 'sct', 'https://private', {}, 'bench'],
      name: 'private',
      lat: 37,
    });
    expect(result).toEqual({
      slots: ['sct', null, null, null, 'bench'],
      ground: 'meadow',
      sceneryScale: 'small',
      sceneryEnabled: true,
    });
  });
});
