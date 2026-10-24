const P: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  form: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15.5 15H18a3 3 0 0 0 3-3c0-5-4-9-9-9zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  cloud: 'M7 18a5 5 0 0 1-.5-9.97A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
  device: 'M4 5h16v11H4zM9 20h6M12 16v4',
  warn: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  dot: 'M12 12h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  motion: 'M4 12h3l2-5 4 10 2-5h5',
  wand: 'M5 19L15 9M14 5l1-2 1 2 2 1-2 1-1 2-1-2-2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z',
  send: 'M4 12l16-8-6 16-2.5-6.5z',
  stop: 'M7 7h10v10H7z',
  copy: 'M8 8h11v11H8zM5 16V5h11',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  type: 'M5 6V4h14v2M12 4v16M9 20h6',
  sticker: 'M4 4h16v9l-7 7H4zM13 20v-7h7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  layers: 'M12 4l9 5-9 5-9-5zM3 14l9 5 9-5',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
};

export function Icon({ name, size = 18, stroke = 1.75, title }: { name: keyof typeof P | string; size?: number; stroke?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={P[name] ?? P.dot} />
    </svg>
  );
}
