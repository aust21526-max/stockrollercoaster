import { useEffect, useState } from 'react';

export type FlashMode = 'off' | 'auto' | 'on';
export type StampMode = 'off' | 'date' | 'dday';
export type Ratio = '3:4' | '2:3' | '1:1' | '9:16';
export type Lens = 28 | 35 | 50;

export const RATIOS: { id: Ratio; label: string; aspect: number }[] = [
  { id: '2:3', label: '3:2', aspect: 2 / 3 },
  { id: '3:4', label: '4:3', aspect: 3 / 4 },
  { id: '1:1', label: '1:1', aspect: 1 },
  { id: '9:16', label: '16:9', aspect: 9 / 16 },
];

/** Phone main cameras are ~26mm equivalent. */
export const MAIN_FOCAL = 26;
export const LENSES: Lens[] = [28, 35, 50];

export interface CameraSettings {
  profileId: string;
  lens: Lens;
  ratio: Ratio;
  ev: number;
  flash: FlashMode;
  timer: 0 | 3 | 10;
  stamp: StampMode;
  /** YYYY-MM-DD, the day we started dating. */
  ddayStart: string;
  grid: boolean;
  level: boolean;
  sound: boolean;
  labCorrection: boolean;
  facing: 'environment' | 'user';
  /** 12MP camera stream: sharper in-app iPhone shots, heavier live preview. */
  hiRes: boolean;
  /** Film strength, 0.4..1. */
  strength: number;
}

const DEFAULTS: CameraSettings = {
  profileId: 'portrait400',
  lens: 28,
  ratio: '2:3',
  ev: 0,
  flash: 'off',
  timer: 0,
  stamp: 'off',
  ddayStart: '',
  grid: false,
  level: false,
  sound: true,
  labCorrection: true,
  facing: 'environment',
  hiRes: false,
  strength: 1,
};

const KEY = 'camera.settings.v1';

function load(): CameraSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<CameraSettings>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* private mode: settings last for this session */
    }
  }, [settings]);
  const update = (patch: Partial<CameraSettings>) => setSettings((s) => ({ ...s, ...patch }));
  return [settings, update] as const;
}

/** Days since start, counting the first day as D+1 (Korean couple convention). */
export function ddayCount(start: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const [y, m, d] = start.split('-').map(Number);
  const s = Date.UTC(y, m - 1, d);
  const t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((t - s) / 86400000) + 1;
}
