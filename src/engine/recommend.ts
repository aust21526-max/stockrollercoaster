import type { SceneStats } from './analyze';
import { PROFILES } from './profiles';
import type { FilmProfile, Situation } from './types';

/**
 * Guesses which situations a frame belongs to, from cheap stats only.
 * Deliberately conservative: a wrong recommendation is worse than none.
 * Pass `hour` for live camera frames; omit for imported photos (time unknown).
 */
export function detectSituations(s: SceneStats, hour?: number): Situation[] {
  const lowSun = hour === undefined ? s.warmth > 0.5 : hour >= 16 || hour <= 8;
  const out: Situation[] = [];
  const dark = s.key < 0.025;
  const dim = s.key < 0.06;
  if (dark) out.push('night');
  else if (dim && s.warmth > 0.45) out.push('tungsten');
  else if (dim) out.push('flash');
  if (!dim) {
    if (s.warmth > 0.35 && s.contrastStops > 4 && lowSun) out.push('golden');
    else if (s.warmth > 0.55) out.push('tungsten');
    if (s.contrastStops < 3.2 && s.warmth < 0.1) out.push('overcast');
    if (s.key > 0.12 && s.contrastStops >= 3.2 && !out.includes('golden')) out.push('sunny');
    if (s.blueShare > 0.25) out.push('sea');
    if (s.greenShare > 0.25) out.push('green');
  }
  if (out.length === 0) out.push(dim ? 'window' : 'sunny');
  return out;
}

export function rankProfiles(situations: Situation[]): { profile: FilmProfile; score: number }[] {
  return PROFILES.map((profile) => ({
    profile,
    score: situations.reduce((acc, s, i) => acc + (profile.situations[s] ?? 0) * (i === 0 ? 1.5 : 1), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}
