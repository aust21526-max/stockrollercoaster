import { useId } from 'react';

/**
 * Illustrated camera bodies, one per film. Four body types drawn from the
 * cameras people actually loaded these films into; colors are ours.
 */

type Shape = 'rangefinder' | 'compact' | 'slr' | 'disposable';
interface Design {
  shape: Shape;
  body: string;
  leather: string;
  metal: string;
  accent: string;
}

export const DESIGNS: Record<string, Design> = {
  portrait400: { shape: 'rangefinder', body: '#e8dbc4', leather: '#7b5a42', metal: '#d3cdc1', accent: '#b4462f' },
  gold200: { shape: 'compact', body: '#dba632', leather: '#3b2f22', metal: '#e9e3d4', accent: '#7a3b14' },
  superia400: { shape: 'compact', body: '#2f5d4a', leather: '#1c2924', metal: '#c9ccc6', accent: '#e2e2d8' },
  pastel400: { shape: 'compact', body: '#c4e3d6', leather: '#efc7cd', metal: '#f4f1ea', accent: '#7f9e93' },
  ektar100: { shape: 'slr', body: '#1f1f1f', leather: '#2b2b2b', metal: '#cfcfcb', accent: '#d8382c' },
  flash800: { shape: 'disposable', body: '#f1c22e', leather: '#d6402e', metal: '#2a2a2a', accent: '#2b5fae' },
  tungsten800: { shape: 'compact', body: '#202b45', leather: '#141a2b', metal: '#b9bcc4', accent: '#e24a4a' },
  mono400: { shape: 'rangefinder', body: '#d6d6d1', leather: '#1c1c1c', metal: '#d6d6d1', accent: '#1c1c1c' },
};

function Lens({ id, cx, cy, r, metal }: { id: string; cx: number; cy: number; r: number; metal: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={metal} stroke="rgba(0,0,0,.35)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="#161616" />
      <circle cx={cx} cy={cy} r={r * 0.7} fill="#2a2a2a" stroke="#3a3a3a" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill={`url(#${id}-glass)`} />
      <ellipse cx={cx - r * 0.2} cy={cy - r * 0.22} rx={r * 0.16} ry={r * 0.09} fill="rgba(255,255,255,.55)" transform={`rotate(-30 ${cx - r * 0.2} ${cy - r * 0.22})`} />
      <circle cx={cx + r * 0.18} cy={cy + r * 0.2} r={r * 0.05} fill="rgba(180,140,255,.5)" />
    </g>
  );
}

export function CameraBody({ profileId, className }: { profileId: string; className?: string }) {
  const d = DESIGNS[profileId] ?? DESIGNS.portrait400;
  const id = useId().replace(/:/g, '');
  const defs = (
    <defs>
      <radialGradient id={`${id}-glass`} cx="40%" cy="35%" r="70%">
        <stop offset="0" stopColor="#3b3f6b" />
        <stop offset=".55" stopColor="#14162a" />
        <stop offset="1" stopColor="#050508" />
      </radialGradient>
      <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".28" />
        <stop offset=".45" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".22" />
      </linearGradient>
      <pattern id={`${id}-grain`} width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".7" fill="rgba(0,0,0,.25)" />
        <circle cx="3" cy="3" r=".6" fill="rgba(255,255,255,.08)" />
      </pattern>
    </defs>
  );

  let art: JSX.Element;
  switch (d.shape) {
    case 'rangefinder':
      art = (
        <g>
          <rect x="34" y="22" width="22" height="10" rx="2" fill={d.metal} stroke="rgba(0,0,0,.3)" />
          <rect x="146" y="20" width="20" height="12" rx="3" fill={d.metal} stroke="rgba(0,0,0,.3)" />
          <rect x="12" y="32" width="176" height="80" rx="9" fill={d.body} />
          <rect x="12" y="58" width="176" height="54" rx="0" fill={d.leather} />
          <rect x="12" y="58" width="176" height="54" fill={`url(#${id}-grain)`} />
          <rect x="12" y="32" width="176" height="80" rx="9" fill={`url(#${id}-shade)`} />
          <rect x="24" y="40" width="22" height="13" rx="2" fill="#1e2430" stroke={d.metal} strokeWidth="1.5" />
          <rect x="150" y="40" width="26" height="13" rx="2" fill="#2a2e36" stroke={d.metal} strokeWidth="1.5" />
          <rect x="62" y="42" width="14" height="9" rx="1.5" fill="#cfd6dd" opacity=".85" />
          <Lens id={id} cx={100} cy={80} r={31} metal={d.metal} />
          <circle cx="170" cy="70" r="3" fill={d.accent} />
        </g>
      );
      break;
    case 'slr':
      art = (
        <g>
          <path d="M72 44 L82 14 H118 L128 44 Z" fill={d.body} />
          <path d="M72 44 L82 14 H118 L128 44 Z" fill={`url(#${id}-shade)`} />
          <rect x="88" y="20" width="24" height="9" rx="1.5" fill={d.metal} opacity=".9" />
          <rect x="26" y="36" width="20" height="9" rx="2" fill={d.metal} />
          <rect x="152" y="34" width="22" height="11" rx="2" fill={d.metal} />
          <rect x="14" y="44" width="172" height="70" rx="8" fill={d.body} />
          <rect x="14" y="44" width="172" height="12" fill={d.metal} opacity=".9" />
          <rect x="14" y="62" width="172" height="52" fill={d.leather} />
          <rect x="14" y="62" width="172" height="52" fill={`url(#${id}-grain)`} />
          <rect x="14" y="44" width="172" height="70" rx="8" fill={`url(#${id}-shade)`} />
          <Lens id={id} cx={100} cy={86} r={36} metal={d.metal} />
          <circle cx="40" cy="74" r="3.2" fill={d.accent} />
        </g>
      );
      break;
    case 'disposable':
      art = (
        <g>
          <rect x="150" y="22" width="22" height="9" rx="2" fill="#2b2b2b" />
          <rect x="14" y="30" width="172" height="84" rx="7" fill={d.body} />
          <path d="M14 78 H186 V107 a7 7 0 0 1 -7 7 H21 a7 7 0 0 1 -7 -7 Z" fill={d.leather} />
          <rect x="14" y="70" width="172" height="8" fill={d.accent} />
          <rect x="14" y="30" width="172" height="84" rx="7" fill={`url(#${id}-shade)`} />
          <rect x="132" y="38" width="44" height="26" rx="3" fill="#f2f2ee" stroke="#2b2b2b" strokeWidth="2" />
          <rect x="136" y="42" width="36" height="18" rx="1" fill="none" stroke="rgba(0,0,0,.15)" />
          <rect x="26" y="40" width="20" height="13" rx="2" fill="#1d1d1d" />
          <rect x="54" y="88" width="56" height="9" rx="2" fill="rgba(255,255,255,.85)" />
          <text x="82" y="95" fontSize="7" textAnchor="middle" fill="#222" fontFamily="sans-serif" fontWeight="700">ISO 800 · 27</text>
          <circle cx="104" cy="60" r="19" fill="#2b2b2b" />
          <Lens id={id} cx={104} cy={60} r={15} metal="#3a3a3a" />
        </g>
      );
      break;
    default:
      art = (
        <g>
          <rect x="30" y="24" width="18" height="9" rx="3" fill={d.metal} stroke="rgba(0,0,0,.3)" />
          <rect x="14" y="30" width="172" height="84" rx="20" fill={d.body} />
          <path d="M14 50 a20 20 0 0 1 20 -20 H58 V114 H34 a20 20 0 0 1 -20 -20 Z" fill={d.leather} />
          <path d="M14 50 a20 20 0 0 1 20 -20 H58 V114 H34 a20 20 0 0 1 -20 -20 Z" fill={`url(#${id}-grain)`} />
          <rect x="14" y="30" width="172" height="84" rx="20" fill={`url(#${id}-shade)`} />
          <rect x="140" y="40" width="34" height="14" rx="3" fill="#f3f1ea" stroke="rgba(0,0,0,.25)" />
          <rect x="72" y="40" width="20" height="12" rx="2.5" fill="#1d222b" stroke={d.metal} strokeWidth="1.2" />
          <circle cx="160" cy="66" r="2.6" fill={d.accent} />
          <Lens id={id} cx={116} cy={78} r={27} metal={d.metal} />
        </g>
      );
  }

  return (
    <svg className={className} viewBox="0 0 200 130" role="img" aria-hidden>
      {defs}
      <ellipse cx="100" cy="121" rx="84" ry="5" fill="rgba(0,0,0,.35)" />
      {art}
    </svg>
  );
}
