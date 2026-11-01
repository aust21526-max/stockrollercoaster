import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeScene, labCorrection, type LabCorrection, type SceneStats } from '../engine/analyze';
import { FilmRenderer } from '../engine/pipeline';
import { PROFILES, profileById } from '../engine/profiles';
import { detectSituations, rankProfiles } from '../engine/recommend';
import { cropFor, SITUATION_LABELS, type FilmProfile } from '../engine/types';
import { decodeBlob, develop, grabFrame } from './develop';
import { useBackClose } from '../back';
import { CameraBag } from './CameraBag';
import { CameraBody } from './CameraBody';
import { Icon } from './icons';
import { ddayCount, EFFECTS, effectAmounts, LENSES, MAIN_FOCAL, RATIOS, useSettings, type CameraSettings, type FlashMode } from './settings';
import { FRAME_LABELS, type FrameStyle } from './frames';
import { pickVideoType } from './share';
import { haptic, shutterSound } from './sound';
import { drawStamp, stampText } from './stamp';
import { Album, CLIPS_ROLL, IMPORTED_ROLL, RollLoader } from './Album';
import { deleteShot, exportShots, isFrame, listRolls, listShots, newRoll, requestPersistence, rollState, rollVisible, saveRoll, saveShot, stillOf, type Roll, type Shot } from './store';
import { useCamera } from './useCamera';
import './camera.css';

/** Live preview long-side cap in device pixels. Adaptive scale works below this. */
const PREVIEW_MAX = 1080;
/** Video mode: 8mm cadence and a size phones can render and encode smoothly. */
const VIDEO_FPS = 18;
const VIDEO_MAX = 720;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Flash strength for the film simulation, or 0. */
function flashAmount(mode: FlashMode, profile: FilmProfile, stats: SceneStats | null): number {
  if (mode === 'off') return 0;
  const strength = Math.max(profile.look.flash, 0.55);
  if (mode === 'on') return strength;
  // Auto: fire in the dark, or always on cameras built around their flash.
  if (profile.look.flash > 0) return profile.look.flash;
  return stats && stats.key < 0.045 ? strength : 0;
}

export default function Camera() {
  const [settings, update] = useSettings();
  const profile = profileById(settings.profileId);
  const cam = useCamera(settings.facing, settings.hiRes);
  const ratio = RATIOS.find((r) => r.id === settings.ratio) ?? RATIOS[0];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finderRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<FilmRenderer | null>(null);
  const [glError, setGlError] = useState('');

  const [stats, setStats] = useState<SceneStats | null>(null);
  const correctionRef = useRef<LabCorrection | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [thumb, setThumb] = useState('');
  const [developing, setDeveloping] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [blink, setBlink] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [fxSheet, setFxSheet] = useState(false);
  const [recording, setRecording] = useState<{ length: number } | null>(null);
  const recordingRef = useRef(false);
  /** The recorder's canvas track: we hand it each frame we draw (no extra readbacks). */
  const captureTrackRef = useRef<(MediaStreamTrack & { requestFrame?: () => void }) | null>(null);
  const [sheet, setSheet] = useState(false);
  const [viewer, setViewer] = useState<{ ids: string[]; index: number } | null>(null);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [album, setAlbum] = useState(false);
  const [loader, setLoader] = useState<{ reason?: string } | null>(null);
  /** Frames shot but still developing, so frame numbers stay right during bursts. */
  const pendingFrames = useRef(0);
  const [bag, setBag] = useState<{ snapshot: HTMLCanvasElement | null } | null>(null);
  // System back closes the top overlay instead of leaving the app.
  useBackClose(sheet, () => setSheet(false));
  useBackClose(fxSheet, () => setFxSheet(false));
  useBackClose(!!bag, () => setBag(null));
  useBackClose(album, () => setAlbum(false));
  useBackClose(!!loader, () => setLoader(null));
  useBackClose(!!viewer, () => setViewer(null));
  const [toast, setToast] = useState('');
  const [focus, setFocus] = useState<{ x: number; y: number; key: number } | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const [suggest, setSuggest] = useState<FilmProfile | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const cancelTimer = useRef<(() => void) | null>(null);

  // ---- zoom: optical/sensor zoom where the camera exposes it, digital crop otherwise ----
  // Lens = digital crop, always. Phone hardware zoom changes the preview but
  // full-resolution stills (ImageCapture) often ignore it, so a 50mm frame
  // would be saved at 26mm. Cropping ourselves keeps preview and photo identical.
  const digitalZoom = Math.max(1, settings.lens / MAIN_FOCAL);

  // ---- EV: hardware exposure compensation where available, the rest in the shader ----
  const evCap = cam.caps.exposureCompensation;
  const hwEv = evCap ? Math.min(Math.max(settings.ev, evCap.min), evCap.max) : 0;
  const shaderEv = settings.ev - hwEv;
  useEffect(() => {
    if (evCap && cam.state.status === 'ready') cam.apply({ exposureCompensation: hwEv });
  }, [hwEv, evCap, cam.state.status]);

  // ---- latest values for the render loop ----
  const live = useRef({ settings, profile, digitalZoom, shaderEv, aspect: ratio.aspect });
  live.current = { settings, profile, digitalZoom, shaderEv, aspect: ratio.aspect };

  useEffect(() => {
    try {
      rendererRef.current = new FilmRenderer(canvasRef.current!);
    } catch (e) {
      setGlError((e as Error).message);
    }
    requestPersistence();
    listShots().then(setShots).catch(() => {});
    listRolls()
      .then((list) => {
        setRolls(list);
        const arrived = list.filter((r) => rollState(r) === 'developed' && !r.openedAt);
        if (arrived.length) setTimeout(() => setToast('현상소에서 봉투가 도착했어요. 앨범에서 열어 보세요.'), 800);
      })
      .catch(() => {});
    return () => rendererRef.current?.dispose();
  }, []);

  // ---- live preview ----
  useEffect(() => {
    if (cam.state.status !== 'ready') return;
    const video = cam.videoRef.current as (HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number; cancelVideoFrameCallback?: (id: number) => void }) | null;
    if (!video) return;
    let stopped = false;
    let handle = 0;
    let lastFrame = -1;
    // Adaptive resolution: shrink the preview when frames take too long, grow back when there is headroom.
    let scale = 1;
    let avg = 16;
    let last = performance.now();
    const draw = () => {
      const r = rendererRef.current;
      const finder = finderRef.current;
      if (!r || !finder || video.readyState < 2 || !video.videoWidth) return;
      if (video.currentTime === lastFrame) return;
      const now = performance.now();
      const videoMode = live.current.settings.mode === 'video';
      // 8mm runs at 18 frames a second: skip camera frames in between.
      if (videoMode && now - last < 1000 / VIDEO_FPS - 4) return;
      lastFrame = video.currentTime;
      avg = avg * 0.9 + (now - last) * 0.1;
      last = now;
      // Never change the canvas size mid-recording: the recorder would glitch.
      if (!recordingRef.current) {
        const slow = videoMode ? 1000 / VIDEO_FPS + 15 : 45;
        const fast = videoMode ? 1000 / VIDEO_FPS + 6 : 36;
        if (avg > slow && scale > 0.5) scale = Math.max(0.5, scale - 0.05);
        else if (avg < fast && scale < 1) scale = Math.min(1, scale + 0.02);
      }

      const { settings: s, profile: p, digitalZoom: z, shaderEv, aspect } = live.current;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      r.setSource(video, vw, vh, false);
      const crop = cropFor(vw, vh, aspect, z);
      const video8 = s.mode === 'video';
      if (video8) {
        // 8mm feel: the frame weaves in the gate, exposure flickers, grain and dust move.
        crop.rect = [crop.rect[0] + (Math.random() - 0.5) * 0.004, crop.rect[1] + (Math.random() - 0.5) * 0.004, crop.rect[2], crop.rect[3]];
      }
      const box = finder.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = Math.round(box.width * dpr);
      let h = Math.round(w / aspect);
      const k = Math.min(1, (videoMode ? VIDEO_MAX : PREVIEW_MAX) / Math.max(w, h), crop.width / w) * scale;
      w = Math.max(2, Math.round(w * k));
      h = Math.max(2, Math.round(h * k));
      r.render(
        p.look,
        {
          labCorrection: s.labCorrection,
          strength: s.strength,
          seed: video8 ? Math.floor(Math.random() * 997) : 7,
          crop: crop.rect,
          ev: shaderEv + (video8 ? (Math.random() - 0.5) * 0.08 : 0),
          flash: 0,
          fast: true,
          fx: effectAmounts(s.fx, p.look.effects),
          fxSeed: video8 ? Math.floor(now / 1000) * 7 + (Math.random() < 0.15 ? Math.random() * 50 : 0) : 42,
        },
        correctionRef.current,
        w,
        h,
      );
      // Recording: push exactly this frame to the recorder.
      captureTrackRef.current?.requestFrame?.();
    };
    // Render exactly once per camera frame where the browser supports it.
    if (video.requestVideoFrameCallback) {
      const onFrame = () => {
        if (stopped) return;
        draw();
        handle = video.requestVideoFrameCallback!(onFrame);
      };
      handle = video.requestVideoFrameCallback(onFrame);
      return () => {
        stopped = true;
        video.cancelVideoFrameCallback?.(handle);
      };
    }
    const loop = () => {
      if (stopped) return;
      draw();
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(handle);
    };
  }, [cam.state.status, cam.videoRef]);

  // ---- scene analysis, once a second ----
  useEffect(() => {
    if (cam.state.status !== 'ready') return;
    let lastTop = '';
    let streak = 0;
    const id = setInterval(() => {
      const video = cam.videoRef.current;
      if (!video?.videoWidth || recordingRef.current) return;
      const st = analyzeScene(video, video.videoWidth, video.videoHeight);
      setStats(st);
      const p = live.current.profile;
      const target = labCorrection(st, p.labWhiteBalance);
      // Ease toward the new correction so the preview never jumps.
      const prev = correctionRef.current;
      correctionRef.current = prev
        ? { ev: prev.ev + (target.ev - prev.ev) * 0.5, gains: prev.gains.map((g, i) => g + (target.gains[i] - g) * 0.5) as LabCorrection['gains'] }
        : target;
      // Suggest another camera only when the scene is stable for ~3 s and the
      // current camera is not already a best fit for it.
      const sit = detectSituations(st, new Date().getHours());
      const top = rankProfiles(sit)[0]?.profile;
      streak = top && top.id === lastTop ? streak + 1 : 0;
      lastTop = top?.id ?? '';
      if (streak === 2) {
        const currentFits = (p.situations[sit[0]] ?? 0) >= 2;
        setSuggest(top && top.id !== p.id && !currentFits ? top : null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [cam.state.status, cam.videoRef]);

  // ---- thumbnail of the latest shot ----
  const latestVisible = useMemo(() => {
    const byId = new Map(rolls.map((r) => [r.id, r]));
    return shots.find((s) => rollVisible(s.rollId ? byId.get(s.rollId) : undefined));
  }, [shots, rolls]);
  useEffect(() => {
    if (!latestVisible) {
      setThumb('');
      return;
    }
    const url = URL.createObjectURL(stillOf(latestVisible));
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [latestVisible]);

  // ---- level ----
  useEffect(() => {
    if (!settings.level) {
      setTilt(null);
      return;
    }
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null) return;
      let deg = (Math.atan2(a.x, a.y) * 180) / Math.PI;
      deg = ((((deg + 90) % 180) + 180) % 180) - 90;
      setTilt((t) => (t == null ? deg : t + (deg - t) * 0.3));
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [settings.level]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? '' : t)), 3200);
  }, []);

  /** Develop a source and store the shot. Runs one at a time to keep memory low. */
  const enqueueDevelop = useCallback(
    (
      getSource: () => Promise<{ source: TexImageSource & CanvasImageSource; width: number; height: number; original: Blob; cleanup?: () => void }>,
      s: CameraSettings,
      p: FilmProfile,
      zoom: number,
      ev: number,
      flash: number,
      frameAspect?: number,
      /** Date for the stamp when re-developing an older frame. */
      stampDate?: Date,
      place?: { rollId?: string; frame?: number; reprint?: boolean; fxSeed?: number },
    ) => {
      const takenAt = new Date();
      const stampAt = stampDate ?? takenAt;
      setDeveloping((d) => d + 1);
      queue.current = queue.current.then(async () => {
        try {
          const src = await getSource();
          const text = s.stamp === 'off' ? null : stampText(s.stamp, stampAt, ddayCount(s.ddayStart, stampAt));
          const fxSeed = place?.fxSeed ?? Math.floor(Math.random() * 997);
          const res = await develop({
            source: src.source,
            width: src.width,
            height: src.height,
            profile: p,
            aspect: RATIOS.find((r) => r.id === s.ratio)!.aspect,
            zoom,
            ev,
            flash,
            frameAspect,
            strength: s.strength,
            labCorrection: s.labCorrection,
            stamp: text ? (g, w, h) => drawStamp(g, text, w, h) : null,
            fx: effectAmounts(s.fx, p.look.effects),
            fxSeed,
            frame: { style: s.frame, caption: s.caption, frameNo: place?.frame, filmName: p.name },
          });
          src.cleanup?.();
          const shot: Shot = {
            id: `${takenAt.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: takenAt.getTime(),
            profileId: p.id,
            width: res.width,
            height: res.height,
            developed: res.blob,
            original: src.original,
            rollId: place?.rollId,
            frame: place?.frame,
            reprint: place?.reprint,
            meta: {
              lens: s.lens,
              ratio: s.ratio,
              ev,
              flash,
              stamp: s.stamp,
              labCorrection: s.labCorrection,
              zoom,
              frameAspect,
              strength: s.strength,
              takenAt: stampAt.getTime(),
              fx: s.fx,
              fxSeed,
              frame: s.frame,
              caption: s.caption,
            },
          };
          await saveShot(shot);
          setShots((list) => [shot, ...list]);
          if (place?.frame && !place.reprint) pendingFrames.current = Math.max(0, pendingFrames.current - 1);
        } catch (e) {
          if (place?.frame && !place.reprint) pendingFrames.current = Math.max(0, pendingFrames.current - 1);
          showToast(`현상하지 못했습니다: ${(e as Error).message}`);
        } finally {
          setDeveloping((d) => d - 1);
        }
      });
    },
    [showToast],
  );

  /** Develop a stored original again with another camera, keeping the frame's own settings. */
  const redevelop = useCallback(
    (shot: Shot, profileId: string) => {
      const m = shot.meta as Partial<{
        ratio: CameraSettings['ratio'];
        stamp: CameraSettings['stamp'];
        labCorrection: boolean;
        ev: number;
        flash: number;
        zoom: number;
        frameAspect: number;
        strength: number;
        takenAt: number;
        fx: CameraSettings['fx'];
        fxSeed: number;
        frame: FrameStyle;
        caption: string;
      }>;
      const p = profileById(profileId);
      enqueueDevelop(
        async () => {
          const bmp = await decodeBlob(shot.original);
          return { source: bmp, width: bmp.width, height: bmp.height, original: shot.original, cleanup: () => bmp.close() };
        },
        {
          ...settings,
          ratio: m.ratio ?? settings.ratio,
          stamp: m.stamp ?? settings.stamp,
          labCorrection: m.labCorrection ?? settings.labCorrection,
          strength: m.strength ?? settings.strength,
          fx: m.fx ?? settings.fx,
          frame: m.frame ?? 'none',
          caption: m.caption ?? '',
        },
        p,
        m.zoom ?? 1,
        m.ev ?? 0,
        m.flash ?? 0,
        m.frameAspect,
        new Date(m.takenAt ?? shot.createdAt),
        { rollId: shot.rollId, frame: shot.frame, reprint: true, fxSeed: m.fxSeed },
      );
      showToast(`${p.name} 필름으로 다시 현상하고 있어요.`);
    },
    [settings, enqueueDevelop, showToast],
  );

  // ---- rolls ----
  const activeRoll = rolls.find((r) => !r.sentAt);
  const framesTaken = useMemo(() => (activeRoll ? shots.filter((s) => s.rollId === activeRoll.id && isFrame(s)).length : 0), [shots, activeRoll]);
  const live2 = useRef({ activeRoll, framesTaken });
  live2.current = { activeRoll, framesTaken };

  /**
   * Reserve the next frame on the roll in the camera. Loads a default roll if
   * the camera is empty; returns null when the roll is used up.
   */
  const claimFrame = useCallback(async (): Promise<{ rollId: string; frame: number } | null> => {
    let { activeRoll: roll } = live2.current;
    const taken = live2.current.framesTaken + pendingFrames.current;
    if (!roll) {
      roll = newRoll(24, 'instant');
      await saveRoll(roll);
      setRolls((r) => [roll!, ...r]);
      live2.current.activeRoll = roll;
      showToast('카메라에 24컷 롤을 넣었어요. 앨범에서 바꿀 수 있어요.');
    } else if (taken >= roll.size) {
      showToast('롤을 다 찍었어요. 현상을 맡기고 새 롤을 넣어 주세요.');
      setAlbum(true);
      return null;
    }
    pendingFrames.current += 1;
    return { rollId: roll.id, frame: taken + 1 };
  }, [showToast]);

  const loadRoll = async (size: Roll['size'], mode: Roll['mode'], name: string) => {
    const roll = newRoll(size, mode, name);
    await saveRoll(roll);
    setRolls((r) => [roll, ...r]);
    pendingFrames.current = 0;
    setLoader(null);
    showToast(`${roll.name}을 넣었어요. ${size}컷을 찍을 수 있어요.`);
  };

  const updateRoll = async (roll: Roll) => {
    await saveRoll(roll);
    setRolls((list) => list.map((r) => (r.id === roll.id ? roll : r)));
  };

  const fire = useCallback(async () => {
    const video = cam.videoRef.current;
    if (!video?.videoWidth) return;
    const place = await claimFrame();
    if (!place) return;
    const s = settings;
    const p = profile;
    const flash = flashAmount(s.flash, p, stats);
    const useHwFlash = flash > 0 && cam.caps.hardwareFlash && s.facing === 'environment';
    if (s.sound) shutterSound();
    haptic();
    setBlink(true);
    setTimeout(() => setBlink(false), 140);

    // Front camera has no flash: light the face with a white screen, like the phone's own selfie flash.
    const selfieFlash = flash > 0 && s.facing === 'user';
    if (selfieFlash) {
      setScreenFlash(true);
      await new Promise((res) => setTimeout(res, 350));
    }
    const fallbackFrame = cam.caps.stills && s.facing === 'environment' ? null : await grabFrame(video);
    if (selfieFlash) setScreenFlash(false);
    const portrait = video.videoHeight > video.videoWidth;
    enqueueDevelop(
      async () => {
        if (fallbackFrame) return { source: fallbackFrame.canvas, width: fallbackFrame.canvas.width, height: fallbackFrame.canvas.height, original: fallbackFrame.blob };
        const still = await cam.takeStill(useHwFlash);
        if (!still) {
          const f = await grabFrame(video);
          return { source: f.canvas, width: f.canvas.width, height: f.canvas.height, original: f.blob };
        }
        let bmp: ImageBitmap | HTMLCanvasElement = await decodeBlob(still);
        // Some Android cameras return the still in sensor orientation; match the preview.
        if (portrait && bmp.width > bmp.height) {
          const c = document.createElement('canvas');
          c.width = bmp.height;
          c.height = bmp.width;
          const g = c.getContext('2d')!;
          g.translate(c.width, 0);
          g.rotate(Math.PI / 2);
          g.drawImage(bmp, 0, 0);
          (bmp as ImageBitmap).close?.();
          bmp = c;
        }
        const b = bmp;
        return { source: b, width: b.width, height: b.height, original: still, cleanup: () => (b as ImageBitmap).close?.() };
      },
      s,
      p,
      digitalZoom,
      shaderEv,
      useHwFlash || selfieFlash ? Math.min(flash, 0.2) : flash,
      video.videoWidth / video.videoHeight,
      undefined,
      place,
    );
  }, [cam, settings, profile, stats, digitalZoom, shaderEv, enqueueDevelop, claimFrame]);

  // ---- video: a clip of exactly 3, 5 or 10 seconds, recorded from the film preview ----
  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || recordingRef.current) return;
    const type = pickVideoType();
    if (!type || !('captureStream' in canvas)) {
      showToast('이 브라우저에서는 영상을 찍을 수 없어요.');
      return;
    }
    const length = settings.clipLength;
    const p = profile;
    const s = settings;
    // Hold the preview size steady for the whole clip.
    recordingRef.current = true;
    // Frame-driven capture where supported: the recorder gets each frame we draw, once.
    let stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
    if (track && typeof track.requestFrame === 'function') captureTrackRef.current = track;
    else {
      stream.getTracks().forEach((t) => t.stop());
      stream = canvas.captureStream(VIDEO_FPS);
    }
    let mic: MediaStream | null = null;
    if (s.clipSound) {
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch {
        showToast('마이크를 쓸 수 없어서 소리 없이 찍어요.');
      }
    }
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 5_000_000 });
    } catch (e) {
      mic?.getTracks().forEach((t) => t.stop());
      stream.getTracks().forEach((t) => t.stop());
      recordingRef.current = false;
      captureTrackRef.current = null;
      showToast(`영상을 찍지 못했습니다: ${(e as Error).message}`);
      return;
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const takenAt = new Date();
    rec.onstop = async () => {
      mic?.getTracks().forEach((t) => t.stop());
      stream.getVideoTracks().forEach((t) => t.stop());
      captureTrackRef.current = null;
      recordingRef.current = false;
      setRecording(null);
      // Poster from the last frame, made after recording so it never stalls the clip.
      const poster = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.86));
      haptic(15);
      if (s.sound) shutterSound();
      const blob = new Blob(chunks, { type: type.split(';')[0] });
      const shot: Shot = {
        id: `${takenAt.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: takenAt.getTime(),
        profileId: p.id,
        width: canvas.width,
        height: canvas.height,
        developed: blob,
        original: poster ?? blob,
        poster: poster ?? undefined,
        kind: 'video',
        duration: length,
        rollId: CLIPS_ROLL,
        meta: { lens: s.lens, ratio: s.ratio, length, sound: s.clipSound },
      };
      try {
        await saveShot(shot);
        setShots((list) => [shot, ...list]);
      } catch (e) {
        showToast(`영상을 저장하지 못했습니다: ${(e as Error).message}`);
      }
    };
    recordingRef.current = true;
    setRecording({ length });
    if (s.sound) shutterSound();
    haptic(15);
    rec.start(250);
    // Exactly the chosen length, counted from the first recorded frame (the
    // recorder needs a moment to start); the shutter cannot cut it short.
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const wait = () => (rec.state === 'recording' && performance.now() - t0 > 1000 / VIDEO_FPS ? res() : requestAnimationFrame(wait));
      requestAnimationFrame(wait);
    });
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), length * 1000 + 1000 / VIDEO_FPS);
  }, [settings, profile, showToast]);

  const onShutter = useCallback(() => {
    if (recordingRef.current) return;
    const action = settings.mode === 'video' ? startRecording : fire;
    if (countdown) {
      cancelTimer.current?.();
      return;
    }
    if (!settings.timer) {
      action();
      return;
    }
    let n = settings.timer;
    setCountdown(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(0);
        action();
      } else {
        setCountdown(n);
        haptic(6);
      }
    }, 1000);
    cancelTimer.current = () => {
      clearInterval(id);
      setCountdown(0);
    };
  }, [countdown, settings.timer, settings.mode, fire, startRecording]);

  /** Photos from the system camera (iPhone full quality) or from the library. */
  const onFiles = async (files: FileList | null, fromCamera: boolean) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      // System-camera shots are frames on the roll; library photos go in their own envelope.
      const place = fromCamera ? await claimFrame() : { rollId: IMPORTED_ROLL };
      if (!place) return;
      enqueueDevelop(
        async () => {
          const bmp = await decodeBlob(file);
          return { source: bmp, width: bmp.width, height: bmp.height, original: file, cleanup: () => bmp.close() };
        },
        settings,
        profile,
        // System-camera shots get the chosen lens too (shoot them at 1x).
        fromCamera ? digitalZoom : 1,
        fromCamera ? settings.ev : 0,
        fromCamera ? flashAmount(settings.flash, profile, null) : 0,
        undefined,
        undefined,
        place,
      );
    }
    showToast(fromCamera ? '기본 카메라 사진을 현상하고 있어요.' : `${files.length}장에 ${profile.name} 필름을 입히고 있어요.`);
  };

  // ---- swipe the viewfinder to change cameras ----
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [nameFlash, setNameFlash] = useState<{ name: string; film: string; key: number } | null>(null);
  useEffect(() => {
    if (!nameFlash) return;
    const t = setTimeout(() => setNameFlash(null), 1300);
    return () => clearTimeout(t);
  }, [nameFlash]);
  const switchCamera = (step: number) => {
    const i = PROFILES.findIndex((p) => p.id === profile.id);
    const next = PROFILES[(i + step + PROFILES.length) % PROFILES.length];
    update({ profileId: next.id });
    setSuggest(null);
    setNameFlash({ name: next.name, film: next.film, key: Date.now() });
    haptic(6);
  };
  const onFinderDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onFinderUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s0 = swipeStart.current;
    swipeStart.current = null;
    if (s0) {
      const dx = e.clientX - s0.x;
      const dy = e.clientY - s0.y;
      // A clear horizontal swipe changes camera; anything shorter is a tap to focus.
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        switchCamera(dx < 0 ? 1 : -1);
        return;
      }
      if (Math.hypot(dx, dy) > 12) return;
    }
    onFinderTap(e);
  };

  const onFinderTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    setFocus({ x, y, key: Date.now() });
    const video = cam.videoRef.current;
    if (cam.caps.pointsOfInterest && video) {
      const c = cropFor(video.videoWidth, video.videoHeight, ratio.aspect, digitalZoom).rect;
      const px = c[0] + x * c[2];
      const py = c[1] + y * c[3];
      cam.apply({ pointsOfInterest: [{ x: settings.facing === 'user' ? 1 - px : px, y: py }], focusMode: 'single-shot', exposureMode: 'single-shot' }).then(() =>
        setTimeout(() => cam.apply({ focusMode: 'continuous', exposureMode: 'continuous' }), 4000),
      );
    }
  };

  const toggleLevel = async () => {
    if (!settings.level) {
      const DM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (DM.requestPermission) {
        try {
          if ((await DM.requestPermission()) !== 'granted') {
            showToast('수평계를 쓰려면 동작 및 방향 접근을 허용해 주세요.');
            return;
          }
        } catch {
          return;
        }
      }
    }
    update({ level: !settings.level });
  };

  const flashFires = flashAmount(settings.flash, profile, stats) > 0;
  const fxNow = effectAmounts(settings.fx, profile.look.effects);
  const fxOn = Object.values(fxNow).some((v) => (v ?? 0) > 0) || settings.frame !== 'none';
  const dday = ddayCount(settings.ddayStart);
  const stampPreview = settings.stamp === 'off' ? null : stampText(settings.stamp, new Date(), dday);
  const situations = useMemo(() => (stats ? detectSituations(stats, new Date().getHours()) : []), [stats]);
  const recommended = useMemo(() => rankProfiles(situations).slice(0, 2).map((r) => r.profile.id), [situations]);

  /** Open the bag with a small frame of the current scene, so every camera can preview it. */
  const openBag = () => {
    const video = cam.videoRef.current;
    let snapshot: HTMLCanvasElement | null = null;
    if (video?.videoWidth) {
      const c = cropFor(video.videoWidth, video.videoHeight, ratio.aspect, digitalZoom);
      const [x, y, w, h] = c.rect;
      const outW = 640;
      const outH = Math.round(outW / ratio.aspect);
      snapshot = document.createElement('canvas');
      snapshot.width = outW;
      snapshot.height = outH;
      const g = snapshot.getContext('2d')!;
      if (settings.facing === 'user') {
        g.translate(outW, 0);
        g.scale(-1, 1);
      }
      g.drawImage(video, x * video.videoWidth, y * video.videoHeight, w * video.videoWidth, h * video.videoHeight, 0, 0, outW, outH);
    }
    setBag({ snapshot });
  };

  return (
    <div className="cam">
      <video ref={cam.videoRef} className="cam-video" playsInline muted autoPlay />

      <header className="cam-top">
        <button className={`chip ${settings.flash !== 'off' ? 'is-lit' : ''}`} onClick={() => update({ flash: settings.flash === 'off' ? 'auto' : settings.flash === 'auto' ? 'on' : 'off' })} aria-label={`플래시 ${settings.flash === 'off' ? '끔' : settings.flash === 'auto' ? '자동' : '켬'}`}>
          <Icon name="flash" /> <span>{settings.flash === 'off' ? '끔' : settings.flash === 'auto' ? '자동' : '켬'}</span>
        </button>
        <button className={`chip ${settings.timer ? 'is-lit' : ''}`} onClick={() => update({ timer: settings.timer === 0 ? 3 : settings.timer === 3 ? 10 : 0 })} aria-label={`셀프타이머 ${settings.timer ? `${settings.timer}초` : '끔'}`}>
          <Icon name="timer" /> <span>{settings.timer ? `${settings.timer}초` : '끔'}</span>
        </button>
        <button
          className="chip"
          onClick={() => update({ ratio: RATIOS[(RATIOS.indexOf(ratio) + 1) % RATIOS.length].id })}
          aria-label="화면 비율"
        >
          {ratio.label}
        </button>
        <button className={`chip ${fxOn ? 'is-lit' : ''}`} onClick={() => setFxSheet(true)} aria-label="효과와 프레임">
          <Icon name="sparkle" />
        </button>
        <button className="chip" onClick={() => update({ facing: settings.facing === 'environment' ? 'user' : 'environment' })} aria-label="전면·후면 전환">
          <Icon name="flip" />
        </button>
        <button className="chip" onClick={() => setSheet(true)} aria-label="설정 더 보기">
          <Icon name="more" />
        </button>
      </header>

      <div className="cam-finder-wrap">
        <div
          className={`cam-finder ${settings.facing === 'user' ? 'is-mirror' : ''}`}
          ref={finderRef}
          style={{ '--a': ratio.aspect } as React.CSSProperties}
          onPointerDown={onFinderDown}
          onPointerUp={onFinderUp}
          onPointerCancel={() => (swipeStart.current = null)}
        >
          <canvas ref={canvasRef} />
          <div className="framelines" aria-hidden />
          {settings.grid && <div className="grid" aria-hidden />}
          {tilt != null && (
            <div className={`level ${Math.abs(tilt) < 1 ? 'is-flat' : ''}`} style={{ transform: `translate(-50%, -50%) rotate(${-tilt}deg)` }} aria-hidden />
          )}
          {focus && <div key={focus.key} className="focus" style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }} aria-hidden />}
          {blink && <div className="blink" aria-hidden />}
          {nameFlash && (
            <div key={nameFlash.key} className="name-flash" aria-live="polite">
              <strong>{nameFlash.name}</strong>
              <span>{nameFlash.film}</span>
            </div>
          )}
          {countdown > 0 && <div className="countdown">{countdown}</div>}
          <div className="finder-info" aria-hidden>
            {flashFires && <span className="led">⚡</span>}
            {stampPreview && <span className="led">{stampPreview}</span>}
          </div>
          <div className="counter" title="남은 컷">
            <span className="counter-mark" aria-hidden />
            {recording ? (
              <span className="counter-num rec">REC {recording.length}s</span>
            ) : settings.mode === 'video' ? (
              <span className="counter-num">{settings.clipLength}s</span>
            ) : (
              <span className="counter-num">{activeRoll ? String(Math.max(0, activeRoll.size - framesTaken - pendingFrames.current)).padStart(2, '0') : '--'}</span>
            )}
          </div>
          {cam.state.status !== 'ready' && (
            <div className="finder-msg">
              {'message' in cam.state ? cam.state.message : '카메라를 켜는 중…'}
            </div>
          )}
          {glError && <div className="finder-msg">{glError}</div>}
        </div>
        {suggest && (
          <button className="suggest" onClick={() => { update({ profileId: suggest.id }); setSuggest(null); }}>
            {situations[0] ? `${SITUATION_LABELS[situations[0]]}엔 ` : '지금은 '}
            <strong>{suggest.name}</strong>가 어울려요
          </button>
        )}
      </div>

      <CameraStrip
        current={profile.id}
        recommended={recommended}
        onPick={(id) => {
          update({ profileId: id });
          setSuggest(null);
          haptic(6);
        }}
      />

      <div className="cam-dials">
        <div className="lenses" role="radiogroup" aria-label="렌즈">
          {LENSES.map((l) => (
            <button key={l} role="radio" aria-checked={settings.lens === l} className={settings.lens === l ? 'is-on' : ''} onClick={() => update({ lens: l })}>
              {l}
              <small>mm</small>
            </button>
          ))}
        </div>
        <EvDial value={settings.ev} onChange={(ev) => update({ ev })} />
      </div>

      <div className="mode-row" role="radiogroup" aria-label="촬영 모드">
        <button role="radio" aria-checked={settings.mode === 'photo'} className={settings.mode === 'photo' ? 'is-on' : ''} disabled={!!recording} onClick={() => update({ mode: 'photo' })}>
          사진
        </button>
        <button role="radio" aria-checked={settings.mode === 'video'} className={settings.mode === 'video' ? 'is-on' : ''} disabled={!!recording} onClick={() => update({ mode: 'video' })}>
          영상
        </button>
        {settings.mode === 'video' && (
          <span className="clip-lengths" role="radiogroup" aria-label="영상 길이">
            {([3, 5, 10] as const).map((n) => (
              <button key={n} role="radio" aria-checked={settings.clipLength === n} className={settings.clipLength === n ? 'is-on' : ''} disabled={!!recording} onClick={() => update({ clipLength: n })}>
                {n}초
              </button>
            ))}
          </span>
        )}
      </div>

      <footer className="cam-bottom">
        <button className="last" onClick={() => setAlbum(true)} aria-label="앨범 열기">
          {activeRoll?.mode === 'wait' && framesTaken > 0 ? (
            <span className="mini-canister" aria-hidden>
              {framesTaken}
            </span>
          ) : thumb ? (
            <img src={thumb} alt="" />
          ) : null}
          {rolls.some((r) => rollState(r) === 'developed' && !r.openedAt) && <span className="new-dot" aria-hidden />}
          {developing > 0 && <span className="developing">현상 중</span>}
        </button>
        <button
          className={`shutter ${countdown ? 'is-timer' : ''} ${settings.mode === 'video' ? 'is-video' : ''} ${recording ? 'is-rec' : ''}`}
          style={recording ? ({ '--len': `${recording.length}s` } as React.CSSProperties) : undefined}
          onClick={onShutter}
          disabled={cam.state.status !== 'ready'}
          aria-label={recording ? `녹화 중, ${recording.length}초` : countdown ? '타이머 취소' : settings.mode === 'video' ? `${settings.clipLength}초 영상 찍기` : '셔터'}
        />
        <button className="bag-btn" onClick={openBag} aria-label="카메라 가방 열기">
          <Icon name="bag" />
          <span>가방</span>
        </button>
      </footer>

      {screenFlash && <div className="screen-flash" aria-hidden />}
      {toast && <div className="toast" role="status">{toast}</div>}

      {sheet && (
        <SettingsSheet
          settings={settings}
          update={update}
          onClose={() => setSheet(false)}
          onLevel={toggleLevel}
          onFiles={onFiles}
          ddayValue={dday}
        />
      )}
      {bag && (
        <CameraBag
          current={profile.id}
          snapshot={bag.snapshot}
          recommended={recommended}
          onSelect={(id) => {
            update({ profileId: id });
            setSuggest(null);
          }}
          onClose={() => setBag(null)}
        />
      )}
      {album && (
        <Album
          rolls={rolls}
          shots={shots}
          activeRoll={activeRoll}
          onClose={() => setAlbum(false)}
          onView={(list, index) => setViewer({ ids: list.map((s) => s.id), index })}
          onLoadRoll={() => setLoader({})}
          onSend={(roll, readyAt) => {
            updateRoll({ ...roll, sentAt: Date.now(), readyAt });
            pendingFrames.current = 0;
            showToast(readyAt - Date.now() < 60000 ? '현상소에 맡겼어요. 곧 봉투가 도착해요.' : '현상소에 맡겼어요. 내일 아침에 봉투가 도착해요.');
          }}
          onOpened={(roll) => {
            if (!roll.openedAt) updateRoll({ ...roll, openedAt: Date.now() });
          }}
        />
      )}
      {fxSheet && <FxSheet settings={settings} update={update} cameraDefaults={profile.look.effects} cameraName={profile.name} onClose={() => setFxSheet(false)} />}
      {loader && <RollLoader reason={loader.reason} onLoad={loadRoll} onClose={() => setLoader(null)} />}
      {viewer && (
        <Viewer
          shots={viewer.ids.map((id) => shots.find((s) => s.id === id)).filter((s): s is Shot => !!s)}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          onDelete={async (id) => {
            await deleteShot(id);
            setShots((s) => s.filter((x) => x.id !== id));
          }}
          onRedevelop={redevelop}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------

/**
 * The cameras as a row of small bodies under the viewfinder. Tap to pick one.
 * Cameras that suit the scene in front of you carry an orange LED; the
 * "추천" button jumps to the best one.
 */
function CameraStrip({ current, recommended, onPick }: { current: string; recommended: string[]; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const currentProfile = profileById(current);
  // Keep the camera in hand in view (after swipes, bag picks, suggestions).
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-id="${current}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [current]);
  const best = recommended.find((id) => id !== current);
  return (
    <div className="strip-wrap">
      <div className="strip-label">
        <strong>{currentProfile.name}</strong>
        <span>{currentProfile.film}</span>
        {best && (
          <button className="strip-rec" onClick={() => onPick(best)}>
            <span className="led-dot" aria-hidden /> 추천 {profileById(best).name}
          </button>
        )}
      </div>
      <div className="cam-strip" ref={ref} role="radiogroup" aria-label="카메라">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            data-id={p.id}
            role="radio"
            aria-checked={p.id === current}
            aria-label={`${p.name}${recommended.includes(p.id) ? ', 지금 장면에 추천' : ''}`}
            className={`mini ${p.id === current ? 'is-on' : ''}`}
            onClick={() => onPick(p.id)}
          >
            {recommended.includes(p.id) && <span className="led-dot" aria-hidden />}
            <CameraBody profileId={p.id} />
          </button>
        ))}
      </div>
    </div>
  );
}

function FxSheet({
  settings,
  update,
  cameraDefaults,
  cameraName,
  onClose,
}: {
  settings: CameraSettings;
  update: (p: Partial<CameraSettings>) => void;
  cameraDefaults?: import('../engine/types').FilmEffects;
  cameraName: string;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label="효과와 프레임" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>효과와 프레임</h2>
          <button className="text" onClick={onClose}>닫기</button>
        </div>
        <div className="group">
          <h3>필름 효과</h3>
          {EFFECTS.map((e) => {
            const mode = settings.fx[e.key] ?? 'auto';
            const def = cameraDefaults?.[e.key] ?? 0;
            return (
              <div className="fx-row" key={e.key}>
                <span>
                  {e.label}
                  <small>{e.hint}</small>
                </span>
                <div className="seg small" role="radiogroup" aria-label={e.label}>
                  {(['auto', 'on', 'off'] as const).map((m) => (
                    <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => update({ fx: { ...settings.fx, [e.key]: m } })}>
                      {m === 'auto' ? (def > 0 ? `${cameraName} 기본(켬)` : `${cameraName} 기본(끔)`) : m === 'on' ? '켜기' : '끄기'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="group">
          <h3>인화 프레임</h3>
          <div className="seg" role="radiogroup" aria-label="인화 프레임">
            {(Object.keys(FRAME_LABELS) as FrameStyle[]).map((f) => (
              <button key={f} role="radio" aria-checked={settings.frame === f} className={settings.frame === f ? 'is-on' : ''} onClick={() => update({ frame: f })}>
                {FRAME_LABELS[f]}
              </button>
            ))}
          </div>
          {settings.frame === 'instant' && (
            <label className="row">
              <span>문구</span>
              <input className="caption-input" value={settings.caption} maxLength={28} placeholder="예: 우리의 첫 여름" onChange={(e) => update({ caption: e.target.value })} />
            </label>
          )}
          <p className="sheet-note">프레임은 저장되는 사진에 들어가요. 뷰파인더에는 보이지 않아요.</p>
        </div>
        <div className="group">
          <Toggle label="영상에 소리 넣기" hint="켜면 처음 한 번 마이크 권한을 물어봐요." on={settings.clipSound} onChange={(v) => update({ clipSound: v })} />
        </div>
      </section>
    </div>
  );
}

function EvDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const drag = useRef<{ x: number; v: number } | null>(null);
  const STEP = 1 / 3;
  const PX = 22;
  const label = value === 0 ? '±0' : `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
  return (
    <div
      className="ev"
      role="slider"
      tabIndex={0}
      aria-label="노출 보정"
      aria-valuemin={-2}
      aria-valuemax={2}
      aria-valuenow={Number(value.toFixed(2))}
      aria-valuetext={`${label} 스톱`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(2, Math.round((value + STEP) * 3) / 3));
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(-2, Math.round((value - STEP) * 3) / 3));
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, v: value };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const steps = Math.round((drag.current.x - e.clientX) / PX);
        const v = Math.max(-2, Math.min(2, Math.round((drag.current.v + steps * STEP) * 3) / 3));
        if (v !== value) {
          onChange(v);
          haptic(4);
        }
      }}
      onPointerUp={() => (drag.current = null)}
      onDoubleClick={() => onChange(0)}
    >
      <span className="ev-value">{label}</span>
      <div className="ev-ruler" style={{ transform: `translateX(${-value * 3 * PX}px)` }} aria-hidden>
        {Array.from({ length: 13 }, (_, i) => i - 6).map((i) => (
          <span key={i} className={`tick ${i % 3 === 0 ? 'major' : ''}`} style={{ left: `calc(50% + ${i * PX}px)` }}>
            {i % 3 === 0 ? (i === 0 ? '0' : i > 0 ? `+${i / 3}` : `−${-i / 3}`) : ''}
          </span>
        ))}
      </div>
      <span className="ev-mark" aria-hidden />
    </div>
  );
}

function SettingsSheet({
  settings,
  update,
  onClose,
  onLevel,
  onFiles,
  ddayValue,
}: {
  settings: CameraSettings;
  update: (p: Partial<CameraSettings>) => void;
  onClose: () => void;
  onLevel: () => void;
  onFiles: (f: FileList | null, fromCamera: boolean) => void;
  ddayValue: number | null;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label="촬영 설정" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>촬영 설정</h2>
          <button className="text" onClick={onClose}>닫기</button>
        </div>

        <div className="group">
          <label className="file-btn">
            <Icon name="camera" />
            <span>
              <strong>기본 카메라로 찍기</strong>
              <small>{isIOS ? '아이폰에서 가장 선명하게 찍는 방법이에요.' : '폰 기본 카메라로 찍습니다.'} 1배로 찍으면 지금 렌즈와 필름으로 현상해요.</small>
            </span>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => { onFiles(e.target.files, true); onClose(); }} />
          </label>
          <label className="file-btn">
            <Icon name="photos" />
            <span>
              <strong>필터 입히기</strong>
              <small>앨범의 사진에 지금 필름을 입힙니다. 여러 장을 한 번에 고를 수 있어요.</small>
            </span>
            <input type="file" accept="image/*" multiple onChange={(e) => { onFiles(e.target.files, false); onClose(); }} />
          </label>
        </div>

        <div className="group">
          <h3>각인</h3>
          <div className="seg" role="radiogroup" aria-label="각인">
            {(['off', 'date', 'dday'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={settings.stamp === m} className={settings.stamp === m ? 'is-on' : ''} onClick={() => update({ stamp: m })}>
                {m === 'off' ? '없음' : m === 'date' ? '날짜' : 'D+day'}
              </button>
            ))}
          </div>
          {settings.stamp === 'dday' && (
            <label className="row">
              <span>사귄 날</span>
              <input type="date" value={settings.ddayStart} onChange={(e) => update({ ddayStart: e.target.value })} />
              {ddayValue != null && <span className="led">D+{ddayValue}</span>}
            </label>
          )}
        </div>

        <div className="group">
          <label className="strength">
            <span>
              필름 강도
              <small>낮추면 원본에 가까워져요.</small>
            </span>
            <input type="range" min={0.4} max={1} step={0.05} value={settings.strength} onChange={(e) => update({ strength: +e.target.value })} />
            <output>{Math.round(settings.strength * 100)}%</output>
          </label>
        </div>

        <div className="group">
          <Toggle label="현상소 보정" hint="컷마다 노출과 색을 잡아 줍니다. 끄면 필름 그대로 나와요." on={settings.labCorrection} onChange={(v) => update({ labCorrection: v })} />
          <Toggle label="격자" on={settings.grid} onChange={(v) => update({ grid: v })} />
          <Toggle label="수평계" on={settings.level} onChange={() => onLevel()} />
          <Toggle label="셔터음" on={settings.sound} onChange={(v) => update({ sound: v })} />
          <Toggle
            label="고해상도 촬영"
            hint={isIOS ? '앱 안에서 찍는 사진이 더 선명해지지만 미리보기가 느려질 수 있어요.' : '갤럭시는 꺼 둬도 원본 해상도로 찍혀요. 켜면 미리보기만 무거워집니다.'}
            on={settings.hiRes}
            onChange={(v) => update({ hiRes: v })}
          />
        </div>

        <p className="sheet-note">
          사진은 이 기기 안에만 저장됩니다. 찍은 사진에서 "사진 앱에 저장"을 눌러 갤러리로 옮겨 주세요.
        </p>
        <a className="sheet-link" href="#/match">실제 필름과 맞추기</a>
        <a className="sheet-link" href="#/lab">현상실 열기</a>
      </section>
    </div>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className={`switch ${on ? 'is-on' : ''}`} aria-hidden />
    </button>
  );
}

function Viewer({
  shots,
  onClose,
  onDelete,
  onRedevelop,
  initialIndex = 0,
}: {
  shots: Shot[];
  initialIndex?: number;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onRedevelop: (shot: Shot, profileId: string) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [picking, setPicking] = useState(false);
  useBackClose(picking, () => setPicking(false));
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current;
    if (el && initialIndex) el.scrollLeft = initialIndex * el.clientWidth;
  }, []); // run once: jump to the tapped frame
  const [compare, setCompare] = useState<string | null>(null);
  const urls = useMemo(() => shots.map((s) => URL.createObjectURL(s.developed)), [shots]);
  const posters = useMemo(() => shots.map((s) => (s.kind === 'video' && s.poster ? URL.createObjectURL(s.poster) : '')), [shots]);
  useEffect(
    () => () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      posters.forEach((u) => u && URL.revokeObjectURL(u));
    },
    [urls, posters],
  );
  const shot = shots[Math.min(index, shots.length - 1)];
  useEffect(() => {
    if (!shots.length) onClose();
  }, [shots.length, onClose]);
  if (!shot) return null;

  const date = new Date(shot.createdAt);
  const meta = shot.meta as { lens?: number; ev?: number; flash?: number; ratio?: string; zoom?: number };
  const info = [
    meta.lens ? `${meta.lens}mm` : null,
    meta.ev ? `노출 ${meta.ev > 0 ? '+' : ''}${meta.ev.toFixed(1)}` : null,
    meta.flash ? '플래시' : null,
  ].filter(Boolean);
  const today = shots.filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString());

  // Hold to see the original. The original is the uncropped frame, so show it
  // centered and cropped like the developed photo.
  const startCompare = () => setCompare(URL.createObjectURL(shot.original));
  const endCompare = () =>
    setCompare((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });

  return (
    <div className="viewer" role="dialog" aria-label="찍은 사진">
      <div className="viewer-head">
        <button className="text" onClick={onClose}>닫기</button>
        <span className="viewer-title">
          <strong>{profileById(shot.profileId).name}</strong>
          <small>
            {date.getMonth() + 1}월 {date.getDate()}일 {String(date.getHours()).padStart(2, '0')}:{String(date.getMinutes()).padStart(2, '0')}
            {info.length ? `, ${info.join(', ')}` : ''}
          </small>
        </span>
        <span className="dim">{index + 1}/{shots.length}</span>
      </div>
      <div
        className="viewer-strip"
        ref={stripRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {urls.map((u, i) => (
          <div className="viewer-slide" key={shots[i].id}>
            <div
              className="viewer-photo"
              style={{ aspectRatio: `${shots[i].width} / ${shots[i].height}` }}
              onPointerDown={i === index && shots[i].kind !== 'video' ? startCompare : undefined}
              onPointerUp={endCompare}
              onPointerLeave={endCompare}
              onPointerCancel={endCompare}
              onContextMenu={(e) => e.preventDefault()}
            >
              {shots[i].kind === 'video' ? (
                <video src={u} poster={posters[i] || undefined} controls playsInline loop preload="metadata" />
              ) : (
                <img src={u} alt="" loading={i < 3 ? 'eager' : 'lazy'} draggable={false} />
              )}
              {compare && i === index && (
                <>
                  <img className="viewer-original" src={compare} alt="" draggable={false} style={{ transform: `scale(${(shots[i].meta as { zoom?: number }).zoom ?? 1})` }} />
                  <span className="viewer-badge">원본</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="viewer-hint">{shot.kind === 'video' ? `${shot.duration ?? ''}초 필름 영상` : '사진을 길게 누르면 원본과 비교할 수 있어요.'}</p>
      <div className="viewer-actions">
        <button onClick={() => exportShots([shot])}>{shot.kind === 'video' ? '영상 저장' : '사진 앱에 저장'}</button>
        {shot.kind !== 'video' && <button onClick={() => setPicking(true)}>다시 현상</button>}
        <button
          className="danger"
          onClick={() => {
            if (confirm('이 사진을 지울까요? 되돌릴 수 없습니다.')) onDelete(shot.id);
          }}
        >
          삭제
        </button>
      </div>
      {today.length > 1 && (
        <button className="viewer-all" onClick={() => exportShots(today)}>
          오늘 찍은 {today.length}장 모두 저장
        </button>
      )}

      {picking && (
        <div className="sheet-backdrop" onClick={() => setPicking(false)}>
          <section className="sheet" role="dialog" aria-label="다른 카메라로 다시 현상" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>다른 카메라로 다시 현상</h2>
              <button className="text" onClick={() => setPicking(false)}>닫기</button>
            </div>
            <p className="sheet-note">같은 순간을 다른 필름으로 한 장 더 현상합니다. 지금 사진은 그대로 남아요.</p>
            <div className="redevelop-grid">
              {PROFILES.filter((p) => p.id !== shot.profileId).map((p) => (
                <button
                  key={p.id}
                  className="redevelop-item"
                  onClick={() => {
                    onRedevelop(shot, p.id);
                    setPicking(false);
                    onClose();
                  }}
                >
                  <CameraBody profileId={p.id} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
