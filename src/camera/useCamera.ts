import { useCallback, useEffect, useRef, useState } from 'react';

/** Minimal typings for the Image Capture API (Chrome/Android only). */
interface PhotoCapabilities {
  fillLightMode?: string[];
  imageWidth?: { max: number };
  imageHeight?: { max: number };
}
interface ImageCaptureLike {
  takePhoto(settings?: { fillLightMode?: string; imageWidth?: number; imageHeight?: number }): Promise<Blob>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>;
}
declare global {
  interface Window {
    ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike;
  }
}

type RangeCap = { min: number; max: number; step: number };
export interface CameraCaps {
  zoom?: RangeCap;
  exposureCompensation?: RangeCap;
  pointsOfInterest: boolean;
  /** Full-resolution stills via ImageCapture.takePhoto (Android Chrome). */
  stills: boolean;
  hardwareFlash: boolean;
}

export type CameraState =
  | { status: 'idle' | 'starting' }
  | { status: 'ready' }
  | { status: 'denied' | 'unavailable' | 'error'; message: string };

/**
 * Owns the camera stream. iPhone Safari has no ImageCapture, so stills there
 * come from the video frame (or from the system camera, see Camera.tsx).
 */
export function useCamera(facing: 'environment' | 'user', hiRes: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const captureRef = useRef<ImageCaptureLike | null>(null);
  const [state, setState] = useState<CameraState>({ status: 'idle' });
  const [caps, setCaps] = useState<CameraCaps>({ pointsOfInterest: false, stills: false, hardwareFlash: false });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ status: 'unavailable', message: '이 브라우저에서는 카메라를 쓸 수 없습니다. Safari나 Chrome으로 열어 주세요.' });
        return;
      }
      setState({ status: 'starting' });
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            // Native 4:3. Uploading every 12MP video frame to the GPU is what makes a
            // live preview stutter (iPhone Safari copies frames on the CPU), so the
            // default stream is 1920x1440. Android stills still come from
            // ImageCapture at full sensor resolution regardless of this.
            width: { ideal: hiRes ? 4032 : 1920 },
            height: { ideal: hiRes ? 3024 : 1440 },
            aspectRatio: { ideal: 4 / 3 },
            frameRate: { ideal: 30, max: 30 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const c = (track.getCapabilities?.() ?? {}) as Record<string, unknown>;
        const next: CameraCaps = {
          zoom: c.zoom as RangeCap | undefined,
          exposureCompensation: c.exposureCompensation as RangeCap | undefined,
          pointsOfInterest: 'pointsOfInterest' in c,
          stills: false,
          hardwareFlash: false,
        };
        if (window.ImageCapture) {
          try {
            const ic = new window.ImageCapture(track);
            const pc = await ic.getPhotoCapabilities();
            captureRef.current = ic;
            next.stills = true;
            next.hardwareFlash = !!pc.fillLightMode?.includes('flash');
          } catch {
            captureRef.current = null;
          }
        }
        setCaps(next);
        setState({ status: 'ready' });
      } catch (e) {
        const err = e as DOMException;
        if (err.name === 'NotAllowedError')
          setState({ status: 'denied', message: '카메라 권한이 꺼져 있습니다. 설정에서 이 앱의 카메라 접근을 허용한 뒤 다시 열어 주세요.' });
        else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')
          setState({ status: 'unavailable', message: '사용할 수 있는 카메라를 찾지 못했습니다.' });
        else setState({ status: 'error', message: `카메라를 켜지 못했습니다: ${err.message}` });
      }
    };
    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
      captureRef.current = null;
    };
  }, [facing, hiRes]);

  const apply = useCallback(async (advanced: Record<string, unknown>) => {
    const track = trackRef.current;
    if (!track) return false;
    try {
      await track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] });
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Full-resolution still where the platform supports it, else null. */
  const takeStill = useCallback(async (flash: boolean): Promise<Blob | null> => {
    const ic = captureRef.current;
    if (!ic) return null;
    try {
      return await ic.takePhoto(flash ? { fillLightMode: 'flash' } : undefined);
    } catch {
      return null;
    }
  }, []);

  return { videoRef, state, caps, apply, takeStill };
}
