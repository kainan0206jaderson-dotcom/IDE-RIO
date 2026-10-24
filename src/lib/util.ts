export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToCmyk([r, g, b]: [number, number, number]) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1) return [0, 0, 0, 100];
  return [(1 - rr - k) / (1 - k), (1 - gg - k) / (1 - k), (1 - bb - k) / (1 - k), k].map((v) => Math.round(v * 100));
}

function lum(rgb: [number, number, number]) {
  const c = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a: string, b: string) {
  const ra = hexToRgb(a), rb = hexToRgb(b);
  if (!ra || !rb) return 1;
  const [x, y] = [lum(ra), lum(rb)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Texto legível sobre um fundo qualquer: usa os tokens da interface. */
export function readableOn(bg: string): string {
  const dark = getComputedStyle(document.documentElement).getPropertyValue('--c-dark').trim() || '#201E1F';
  const light = getComputedStyle(document.documentElement).getPropertyValue('--c-cloud').trim() || '#F3F0EB';
  return contrast(bg, dark) >= contrast(bg, light) ? dark : light;
}

export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const d = (...a: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  d.flush = () => {
    if (t) clearTimeout(t);
  };
  return d;
}

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
