import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** 영상은 기기에서 미리보기만 한다. 탭 이탈·백그라운드·늦은 권한 응답에서 카메라를 해제한다. */
export function useRearCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<'off' | 'starting' | 'on'>('off');
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.55);
  const [fov, setFov] = useState(60);
  const release = useCallback(() => {
    generation.current++;
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = null;
    streamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [videoRef]);
  const stop = useCallback(() => {
    release();
    setStatus('off');
  }, [release]);
  const start = async () => {
    release();
    const token = generation.current;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('unsupported');
      setStatus('off');
      return;
    }
    setStatus('starting');
    timeout.current = setTimeout(() => {
      if (generation.current === token) {
        release();
        setStatus('off');
        setError('timeout');
      }
    }, 20_000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      });
      if (generation.current !== token || document.visibilityState === 'hidden') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState === 'ended' || track.getSettings().facingMode === 'user') {
        stream.getTracks().forEach((item) => item.stop());
        throw new Error('rear-unavailable');
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        release();
        setStatus('off');
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (generation.current !== token) return;
      if (timeout.current !== null) clearTimeout(timeout.current);
      timeout.current = null;
      track.onended = () => {
        stop();
        setError('interrupted');
      };
      setStatus('on');
    } catch (reason) {
      if (generation.current !== token) return;
      release();
      setStatus('off');
      setError(
        reason instanceof DOMException && reason.name === 'NotAllowedError'
          ? 'denied'
          : 'unavailable',
      );
    }
  };
  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      release();
    };
  }, [release, stop]);
  return { status, error, opacity, setOpacity, fov, setFov, start, stop };
}

export type RearCamera = ReturnType<typeof useRearCamera>;
