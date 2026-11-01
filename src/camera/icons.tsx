const PATHS: Record<string, string> = {
  flash: 'M13 2 4 14h7l-1 8 9-12h-7z',
  timer: 'M10 2h4M12 14V9M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  flip: 'M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4',
  camera: 'M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  photos: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  bag: 'M4 9h16l-1 11H5zM9 9V7a3 3 0 0 1 6 0v2M4 13h16',
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
