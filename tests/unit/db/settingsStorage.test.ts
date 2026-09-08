import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '@/db/database';
import { createDexieSettingsStorage, setSetting } from '@/db/repos/settings';

const encode = (heading: number) => JSON.stringify({ state: { heading }, version: 1 });
afterEach(() => vi.restoreAllMocks());

describe('설정 저장 큐와 반복 쓰기 생략', () => {
  it('같은 설정 100회 연속 저장은 한 번만 쓰고 바뀐 설정은 순서대로 보존한다', async () => {
    const storage = createDexieSettingsStorage('sensor-test');
    const write = vi.spyOn(getDb().settings, 'put');
    await Promise.all(Array.from({ length: 100 }, () => storage.setItem('ignored', encode(10))));
    expect(write).toHaveBeenCalledTimes(2); // heading + version
    // 기존 행 갱신 순서도 put 호출의 실제 인자로 검사한다.
    await Promise.all([20, 10, 10].map((value) => storage.setItem('ignored', encode(value))));
    expect(
      write.mock.calls.filter(([row]) => row.key.endsWith('.heading')).map(([row]) => row.value),
    ).toEqual([10, 20, 10]);
    expect((await getDb().settings.get('sensor-test.heading'))?.value).toBe(10);
  });

  it('실패한 저장은 캐시하지 않으며 다음 동일 요청이 다시 저장된다', async () => {
    const storage = createDexieSettingsStorage('retry-test');
    const write = vi.spyOn(getDb().settings, 'put').mockRejectedValueOnce(new Error('disk busy'));
    await expect(storage.setItem('ignored', encode(30))).rejects.toThrow('disk busy');
    await storage.setItem('ignored', encode(30));
    expect(write).toHaveBeenCalledTimes(3);
    expect((await getDb().settings.get('retry-test.heading'))?.value).toBe(30);
  });

  it('백업 복원 후 재읽기는 캐시를 비우며 삭제 뒤 동일 값도 다시 쓴다', async () => {
    const storage = createDexieSettingsStorage('restore-test');
    await storage.setItem('ignored', encode(10));
    await setSetting('restore-test.heading', 99);
    expect(JSON.parse((await storage.getItem('ignored'))!).state.heading).toBe(99);
    await storage.setItem('ignored', encode(10));
    expect((await getDb().settings.get('restore-test.heading'))?.value).toBe(10);
    await storage.removeItem('ignored');
    await storage.setItem('ignored', encode(10));
    expect((await getDb().settings.get('restore-test.heading'))?.value).toBe(10);
  });

  it('기다리지 않은 쓰기·읽기·삭제도 호출 순서를 지킨다', async () => {
    const storage = createDexieSettingsStorage('ordered-test');
    const first = storage.setItem('ignored', encode(40));
    const read = storage.getItem('ignored');
    const remove = storage.removeItem('ignored');
    const empty = storage.getItem('ignored');
    await first;
    expect(JSON.parse((await read)!).state.heading).toBe(40);
    await remove;
    expect(await empty).toBeNull();
  });
});
