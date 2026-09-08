import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestOrientationPermission } from '@/sensors/permissions';

vi.mock('@/native/motion', () => ({ isNative: () => false }));
afterEach(() => vi.unstubAllGlobals());
describe('별길 센서 권한', () => {
  it.each([true, false])(
    '자동/상대 모드의 절대 방향 요청 %s를 브라우저에 전달한다',
    async (absolute) => {
      const requestPermission = vi.fn().mockResolvedValue('granted');
      vi.stubGlobal('DeviceOrientationEvent', { requestPermission });
      await expect(requestOrientationPermission(absolute)).resolves.toBe('granted');
      expect(requestPermission).toHaveBeenCalledWith(absolute);
    },
  );
  it('권한 거부나 예외를 허용으로 바꾸지 않는다', async () => {
    const requestPermission = vi.fn().mockRejectedValue(new Error('User activation required'));
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission });
    await expect(requestOrientationPermission(true)).resolves.toBe('denied');
  });
});
