import { act, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRearCamera, type RearCamera } from '@/features/sky/useRearCamera';

let camera: RearCamera;
let root: Root;
let container: HTMLDivElement;
const getUserMedia = vi.fn();
function Harness() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const state = useRearCamera(videoRef);
  useEffect(() => {
    camera = state;
  });
  return <video ref={videoRef} />;
}
function stream() {
  const track = {
    stop: vi.fn(),
    onended: null,
    readyState: 'live',
    getSettings: () => ({ facingMode: 'environment' }),
  };
  return {
    track,
    media: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream,
  };
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  getUserMedia.mockReset();
});

it('후면 영상만 요청하고 끄기·언마운트에서 트랙을 해제한다', async () => {
  const first = stream();
  getUserMedia.mockResolvedValue(first.media);
  await act(async () => {
    await camera.start();
  });
  expect(getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({
      audio: false,
      video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
    }),
  );
  expect(camera.status).toBe('on');
  await act(async () => camera.stop());
  expect(first.track.stop).toHaveBeenCalledTimes(1);
  const next = stream();
  getUserMedia.mockResolvedValue(next.media);
  await act(async () => {
    await camera.start();
  });
  await act(async () => root.unmount());
  expect(next.track.stop).toHaveBeenCalledTimes(1);
});
it('취소 뒤 늦게 허용된 카메라도 즉시 해제한다', async () => {
  const { media, track } = stream();
  let resolve!: (s: MediaStream) => void;
  getUserMedia.mockReturnValue(
    new Promise<MediaStream>((r) => {
      resolve = r;
    }),
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = camera.start();
  });
  await act(async () => camera.stop());
  await act(async () => {
    resolve(media);
    await pending;
  });
  expect(track.stop).toHaveBeenCalledTimes(1);
  expect(camera.status).toBe('off');
});
it('권한 거절 후 센서 화면은 유지하고 재시도할 수 있다', async () => {
  getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
  await act(async () => {
    await camera.start();
  });
  expect(camera.error).toBe('denied');
  const { media } = stream();
  getUserMedia.mockResolvedValue(media);
  await act(async () => {
    await camera.start();
  });
  expect(camera.error).toBeNull();
  expect(camera.status).toBe('on');
});
it('백그라운드로 가면 영상 수집이 끝난다', async () => {
  const { media, track } = stream();
  getUserMedia.mockResolvedValue(media);
  await act(async () => {
    await camera.start();
  });
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(track.stop).toHaveBeenCalledTimes(1);
  expect(camera.status).toBe('off');
});
