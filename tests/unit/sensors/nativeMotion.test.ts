import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  addListener: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => mock,
}));
import { watchNativeMotion, type MotionReading } from '@/native/motion';
let callback: (r: MotionReading & { session: string }) => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mock.start.mockResolvedValue(undefined);
  mock.stop.mockResolvedValue(undefined);
  mock.remove.mockResolvedValue(undefined);
  mock.addListener.mockImplementation(async (_name, cb) => {
    callback = cb;
    return { remove: mock.remove };
  });
});
afterEach(() => vi.useRealTimers());
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
it('다른 세션의 샘플을 무시하고 정지 후 늦은 이벤트도 전달하지 않는다', async () => {
  const receive = vi.fn(),
    error = vi.fn();
  const stop = watchNativeMotion(true, receive, error);
  await flush();
  const session = mock.start.mock.calls[0]![0].session as string;
  callback({ quaternion: [0, 0, 0, 1], northReference: 'relative', session: 'other' });
  expect(receive).not.toHaveBeenCalled();
  callback({ quaternion: [0, 0, 0, 1], northReference: 'relative', session });
  expect(receive).toHaveBeenCalledOnce();
  stop();
  callback({ quaternion: [0, 0, 0, 1], northReference: 'relative', session });
  expect(receive).toHaveBeenCalledOnce();
  expect(mock.stop).toHaveBeenCalledWith({ session });
  expect(error).not.toHaveBeenCalled();
});
it('샘플 없는 시작은 오류를 알리고 센서와 리스너를 정리한다', async () => {
  const error = vi.fn();
  watchNativeMotion(true, vi.fn(), error);
  await flush();
  await vi.advanceTimersByTimeAsync(6100);
  expect(error).toHaveBeenCalledOnce();
  expect(mock.stop).toHaveBeenCalledOnce();
  expect(mock.remove).toHaveBeenCalledOnce();
});
it('리스너 등록 중 취소했으면 센서를 뒤늦게 시작하지 않는다', async () => {
  let resolve: (handle: { remove: typeof mock.remove }) => void = () => {};
  mock.addListener.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const stop = watchNativeMotion(true, vi.fn(), vi.fn());
  stop();
  resolve({ remove: mock.remove });
  await flush();
  expect(mock.start).not.toHaveBeenCalled();
  expect(mock.remove).toHaveBeenCalled();
});
