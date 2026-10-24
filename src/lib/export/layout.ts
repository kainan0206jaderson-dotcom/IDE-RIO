/**
 * Layout de exportação: descreve cada página como uma lista de formas
 * (retângulos, imagens, textos). A mesma lista vira PNG/JPG/WebP (canvas),
 * SVG (vetor editável), PDF e PPTX (editável no Canva, PowerPoint, Keynote).
 * Espelha a composição de ModulePage.
 */
import { ACTS, MODULES, MODULE_BY_ID, type ModuleId } from '../../data/recipe';
import type { Asset, Project } from '../../data/types';
import { tokens } from '../../design/tokens';
import { hexToRgb, readableOnHex } from '../util';
import { DEFAULT_LOOSE, DEFAULT_RIGID } from '../fonts';

export type Op =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string; opacity?: number }
  | { t: 'shade'; x: number; y: number; w: number; h: number }
  | { t: 'image'; x: number; y: number; w: number; h: number; asset: Asset; /** recorte da imagem de origem, em frações (0–1) */ crop?: { x: number; y: number; w: number; h: number } }
  | { t: 'text'; x: number; y: number; w: number; lines: string[]; raw: string; size: number; lh: number; font: string; weight: number; italic?: boolean; color: string; upper?: boolean; opacity?: number; mono?: boolean };

export interface PageLayout {
  id: string;
  title: string;
  w: number;
  h: number;
  bg: string;
  ops: Op[];
}

const T = (k: string) => {
  const v = tokens[k];
  return v.startsWith('var(--') ? tokens[v.slice(6, -1)] : v;
};
const PAPER = T('c-paper');
const DARK = T('c-dark');
const CLOUD = T('c-cloud');
const CLOUD80 = T('c-cloud-80');
const MUTED = '#7A746E';
const MONO = 'DM Mono';

let measureCtx: CanvasRenderingContext2D | null = null;
function ctx() {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!;
  return measureCtx;
}
export const fontCss = (o: { size: number; font: string; weight: number; italic?: boolean }) => `${o.italic ? 'italic ' : ''}${o.weight} ${o.size}px "${o.font}", ${o.font === MONO ? 'monospace' : 'sans-serif'}`;

/** Quebra o texto em linhas que cabem na largura, medindo com a fonte real. */
export function wrap(text: string, w: number, o: { size: number; font: string; weight: number; italic?: boolean; upper?: boolean }, maxLines = 12): string[] {
  const c = ctx();
  c.font = fontCss(o);
  const out: string[] = [];
  for (const para of (o.upper ? text.toUpperCase() : text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (c.measureText(test).width <= w || !line) line = test;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  if (out.length > maxLines) {
    const cut = out.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return cut;
  }
  return out;
}

const textOp = (x: number, y: number, w: number, text: string, o: Omit<Extract<Op, { t: 'text' }>, 't' | 'x' | 'y' | 'w' | 'lines' | 'raw'>, maxLines?: number): Extract<Op, { t: 'text' }> => ({
  t: 'text',
  x,
  y,
  w,
  raw: o.upper ? text.toUpperCase() : text,
  lines: wrap(text, w, o, maxLines),
  ...o,
});

const height = (op: Extract<Op, { t: 'text' }>) => op.lines.length * op.size * op.lh;

export function fontsOf(p: Project) {
  return { rigid: p.modules.M06.extra.rigid || DEFAULT_RIGID, loose: p.modules.M06.extra.loose || DEFAULT_LOOSE };
}

export function moduleLayout(p: Project, id: ModuleId, W: number, H: number): PageLayout {
  const m = MODULE_BY_ID[id];
  const st = p.modules[id];
  const { rigid, loose } = fontsOf(p);
  const u = W / 100; // 1% da largura, como o cqw da tela
  const dona = p.palette[0]?.hex;
  const bg = id === 'M01' && dona ? dona : id === 'M14' ? DARK : PAPER;
  const fg = id === 'M01' && dona ? readableOnHex(dona) : id === 'M14' ? CLOUD : DARK;
  const ops: Op[] = [{ t: 'rect', x: 0, y: 0, w: W, h: H, fill: bg }];
  const imgs = st.slots.flatMap((s) => s.assetIds).map((a) => p.assets.find((x) => x.id === a)).filter(Boolean) as Asset[];
  const texts = st.slots.map((s) => s.text.trim()).filter(Boolean);
  const tag = () => ops.push(textOp(4 * u, 3.4 * u, 60 * u, `${m.n} · ${m.short}`, { size: Math.max(10, 2.6 * u), lh: 1.2, font: MONO, weight: 400, color: fg, upper: true, opacity: 0.7, mono: true }, 1));

  if (id === 'M07' && p.palette.length) {
    const total = p.palette.reduce((s, c) => s + Math.max(c.share, 4), 0);
    let y = 0;
    p.palette.forEach((c, i) => {
      const h = (Math.max(c.share, 4) / total) * H;
      const col = readableOnHex(c.hex);
      ops.push({ t: 'rect', x: 0, y, w: W, h, fill: c.hex });
      const rgb = hexToRgb(c.hex);
      const codes = `${c.pms ? 'PMS ' + c.pms + ' · ' : ''}${c.hex.toUpperCase()}${rgb ? ' · RGB ' + rgb.join(' ') : ''} · ${c.share}%`;
      const name = textOp(5 * u, 0, 80 * u, c.name, { size: 6 * u, lh: 0.95, font: rigid, weight: 700, color: col, upper: true }, 1);
      const code = textOp(5 * u, 0, 90 * u, codes, { size: 2.3 * u, lh: 1.2, font: MONO, weight: 400, color: col, mono: true, opacity: 0.85 }, 1);
      const num = textOp(5 * u, 0, 20 * u, String(i + 1).padStart(2, '0'), { size: 2.6 * u, lh: 1.2, font: MONO, weight: 400, color: col, mono: true }, 1);
      const bottom = y + h - 3 * u;
      code.y = bottom - height(code);
      name.y = code.y - 0.6 * u - height(name);
      num.y = name.y - 0.6 * u - height(num);
      if (h > 14 * u) ops.push(num, name, code);
      else ops.push({ ...name, y: y + (h - height(name)) / 2 });
      y += h;
    });
    tag();
    return { id, title: m.title, w: W, h: H, bg, ops };
  }

  if (id === 'M06' && (st.extra.rigid || st.extra.loose)) {
    let y = 18 * u;
    for (const [fam, label, w] of [
      [rigid, 'Rígido · ' + rigid, 700],
      [loose, 'Solto · ' + loose, 400],
    ] as const) {
      const aa = textOp(8 * u, y, 84 * u, 'Aa', { size: 30 * u, lh: 0.95, font: fam, weight: w, color: fg }, 1);
      ops.push(aa);
      y += height(aa) + u;
      const meta = textOp(8 * u, y, 84 * u, label, { size: 2.8 * u, lh: 1.2, font: MONO, weight: 400, color: fg, mono: true }, 1);
      ops.push(meta);
      y += height(meta) + 3 * u;
      ops.push({ t: 'rect', x: 8 * u, y, w: 84 * u, h: Math.max(1, 0.15 * u), fill: CLOUD80 });
      y += 4 * u;
    }
    if (st.extra.rule) ops.push(textOp(8 * u, y, 84 * u, st.extra.rule, { size: 2.8 * u, lh: 1.35, font: MONO, weight: 400, color: fg, mono: true }, 6));
    tag();
    return { id, title: m.title, w: W, h: H, bg, ops };
  }

  if (id === 'M14') {
    const ex = st.extra;
    const items: Extract<Op, { t: 'text' }>[] = [];
    items.push(textOp(9 * u, 0, 82 * u, ex.cta || 'Vamos conversar?', { size: 11 * u, lh: 0.95, font: loose, weight: 400, color: CLOUD }, 4));
    if (ex.email) items.push(textOp(9 * u, 0, 82 * u, ex.email, { size: 3.8 * u, lh: 1.2, font: MONO, weight: 400, color: CLOUD, mono: true }, 2));
    if (ex.price) items.push(textOp(9 * u, 0, 82 * u, ex.price, { size: 5 * u, lh: 1, font: rigid, weight: 700, color: CLOUD, upper: true }, 3));
    if (ex.credits) items.push(textOp(9 * u, 0, 82 * u, ex.credits, { size: 2.8 * u, lh: 1.5, font: MONO, weight: 400, color: CLOUD, mono: true }, 10));
    const total = items.reduce((s, it) => s + height(it), 0) + (items.length - 1) * 3 * u;
    let y = (H - total) / 2;
    for (const it of items) {
      it.y = y;
      ops.push(it);
      y += height(it) + 3 * u;
    }
    ops.push(textOp(9 * u, H - 10 * u, 82 * u, p.title, { size: 4 * u, lh: 1, font: rigid, weight: 700, color: CLOUD, upper: true }, 1));
    tag();
    return { id, title: m.title, w: W, h: H, bg, ops };
  }

  if (!imgs.length && !texts.length) {
    const n = textOp(7 * u, 0, 86 * u, m.n, { size: 34 * u, lh: 0.8, font: rigid, weight: 700, color: CLOUD80 }, 1);
    const ob = textOp(7 * u, 0, 86 * u, m.objective, { size: 3.6 * u, lh: 1.3, font: rigid, weight: 400, color: MUTED }, 5);
    ob.y = H - 7 * u - height(ob);
    n.y = ob.y - 3 * u - height(n);
    ops.push(n, ob);
    tag();
    return { id, title: m.title, w: W, h: H, bg, ops };
  }

  const par = st.rhythm === 'par' && imgs.length > 0;
  const gap = 1.2 * u;
  const ix = 0, iy = 0, iw = par ? W / 2 : W, ih = H;
  const list = imgs.slice(0, 4);
  const cells: [number, number, number, number][] =
    list.length === 1
      ? [[ix, iy, iw, ih]]
      : list.length === 2
        ? [[ix, iy, iw, (ih - gap) / 2], [ix, iy + (ih + gap) / 2, iw, (ih - gap) / 2]]
        : list.length === 3
          ? [[ix, iy, iw, (ih - gap) / 2], [ix, iy + (ih + gap) / 2, (iw - gap) / 2, (ih - gap) / 2], [ix + (iw + gap) / 2, iy + (ih + gap) / 2, (iw - gap) / 2, (ih - gap) / 2]]
          : [[ix, iy, (iw - gap) / 2, (ih - gap) / 2], [ix + (iw + gap) / 2, iy, (iw - gap) / 2, (ih - gap) / 2], [ix, iy + (ih + gap) / 2, (iw - gap) / 2, (ih - gap) / 2], [ix + (iw + gap) / 2, iy + (ih + gap) / 2, (iw - gap) / 2, (ih - gap) / 2]];
  list.forEach((a, i) => ops.push({ t: 'image', asset: a, x: cells[i][0], y: cells[i][1], w: cells[i][2], h: cells[i][3] }));

  if (texts.length) {
    const big = id === 'M02' || id === 'M09';
    if (par) {
      const x = W / 2 + 5 * u, w = W / 2 - 10 * u;
      const head = textOp(x, 0, w, texts[0], { size: 6.4 * u, lh: 0.95, font: rigid, weight: 700, color: fg, upper: true }, 8);
      const rest = texts.slice(1, 4).map((t) => textOp(x, 0, w, t, { size: 4.2 * u, lh: 1.2, font: loose, weight: 400, color: fg }, 6));
      const all = [head, ...rest];
      const total = all.reduce((s, it) => s + height(it), 0) + (all.length - 1) * 2 * u;
      let y = (H - total) / 2;
      for (const it of all) {
        it.y = y;
        ops.push(it);
        y += height(it) + 2 * u;
      }
    } else {
      const onImg = imgs.length > 0;
      const col = onImg ? CLOUD : fg;
      const x = 6 * u, w = 88 * u;
      const head = textOp(x, 0, w, texts[0], { size: (big ? 12 : 8) * u, lh: big ? 0.88 : 0.95, font: rigid, weight: 700, color: col, upper: true }, 6);
      const rest = texts.slice(1, 4).map((t) => textOp(x, 0, w, t, { size: 4.2 * u, lh: 1.2, font: loose, weight: 400, color: col }, 4));
      const all = [head, ...rest];
      const total = all.reduce((s, it) => s + height(it), 0) + (all.length - 1) * 2 * u;
      let y = onImg ? H - 6 * u - total : (H - total) / 2;
      if (onImg) ops.push({ t: 'shade', x: 0, y: Math.max(0, y - 10 * u), w: W, h: H - Math.max(0, y - 10 * u) });
      for (const it of all) {
        it.y = y;
        ops.push(it);
        y += height(it) + 2 * u;
      }
    }
  }
  tag();
  return { id, title: m.title, w: W, h: H, bg, ops };
}

/** Faixa entre atos (regra 03 da arquitetura), como página própria. */
export function actBandLayout(p: Project, actIndex: number, W: number, H: number): PageLayout {
  const a = ACTS[actIndex];
  const { rigid, loose } = fontsOf(p);
  const bg = p.palette[0]?.hex ?? DARK;
  const fg = readableOnHex(bg);
  const u = W / 100;
  const name = textOp(8 * u, 0, 84 * u, a.name, { size: 16 * u, lh: 0.88, font: rigid, weight: 700, color: fg, upper: true }, 3);
  const q = textOp(8 * u, 0, 84 * u, a.question, { size: 5 * u, lh: 1.15, font: loose, weight: 400, italic: false, color: fg }, 3);
  const n = textOp(8 * u, 0, 84 * u, `Ato ${a.n}`, { size: 3 * u, lh: 1.2, font: MONO, weight: 400, color: fg, mono: true, upper: true }, 1);
  q.y = H - 10 * u - height(q);
  name.y = q.y - 3 * u - height(name);
  n.y = name.y - 2 * u - height(n);
  return { id: 'ato-' + a.n, title: `Ato ${a.n} · ${a.name}`, w: W, h: H, bg, ops: [{ t: 'rect', x: 0, y: 0, w: W, h: H, fill: bg }, n, name, q] };
}

export interface ExportOptions {
  W: number;
  H: number;
  onlyFilled: boolean;
  bands: boolean;
}

/** Sequência completa do brandbook na ordem da receita. */
export function bookLayouts(p: Project, o: ExportOptions): PageLayout[] {
  const out: PageLayout[] = [];
  ACTS.forEach((a, i) => {
    const mods = a.modules.filter((id) => {
      const st = p.modules[id];
      if (MODULE_BY_ID[id].optional && st.status === 'vazio') return false;
      if (!o.onlyFilled) return true;
      return st.status !== 'vazio' || st.slots.some((s) => s.text.trim() || s.assetIds.length) || (id === 'M07' && p.palette.length > 0);
    });
    if (!mods.length) return;
    if (o.bands) out.push(actBandLayout(p, i, o.W, o.H));
    for (const id of mods) out.push(moduleLayout(p, id, o.W, o.H));
  });
  return out;
}

export const ALL_MODULES = MODULES.map((m) => m.id);
