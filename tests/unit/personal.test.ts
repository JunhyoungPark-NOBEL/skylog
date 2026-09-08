import { describe, it, expect } from 'vitest';
import { DEFAULT_PERSONAL, normalizePersonal } from '@/personal/catalog';
import { grantRewards, readPersonal, savePersonal } from '@/personal/store';
import { getDb } from '@/db/database';
import { exportBundle, importBundle } from '@/db/exportImport';
describe('무료 마당', () => {
  it('잘못된 가져오기·중복 장식·미보유 장식을 정리한다', () => {
    const p = normalizePersonal(
      {
        suit: 'script',
        slots: ['flowers', 'flowers', 'telescope', 'unknown', null],
        name: '<my> garden',
      },
      new Set(['flowers']),
    );
    expect(p.slots).toEqual(['flowers', null, null, null, null]);
    expect(p.suit).toBe('sage');
    expect(p.name).toBe('my garden');
  });
  it('동시에 업적을 처리해도 보상은 한 번만 저장하며 영구 보존한다', async () => {
    await Promise.all([
      grantRewards(new Set(['badge-first-look'])),
      grantRewards(new Set(['badge-first-look'])),
    ]);
    expect(await getDb().progress.where('key').equals('personal.reward:telescope').count()).toBe(1);
    await grantRewards(new Set());
    expect((await readPersonal()).owned.has('telescope')).toBe(true);
  });
  it('기존 백업 형식으로 보상과 배치를 보존한다', async () => {
    await grantRewards(new Set(['badge-first-look']));
    await savePersonal({
      ...DEFAULT_PERSONAL,
      slots: ['telescope', null, null, null, null],
      name: '별밤',
    });
    const bundle = await exportBundle();
    await getDb().progress.clear();
    await importBundle(bundle, { policy: 'newest' });
    const p = await readPersonal();
    expect(p.owned.has('telescope')).toBe(true);
    expect(p.profile.slots[0]).toBe('telescope');
    expect(p.profile.name).toBe('별밤');
  });
});
