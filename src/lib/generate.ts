/**
 * Gerador de modelos novos a partir de material importado.
 * Usa só o que veio no arquivo: páginas (recortadas em closes), paleta detectada,
 * textos e fontes. Cada modelo segue uma regra da Receita do Brandbook e
 * vira uma página 4:5 no mesmo motor de exportação (PNG, SVG, PDF, PPTX).
 * Funciona sem IA; com IA (no claude.ai), os textos e a cor-dona ficam mais afinados.
 */
import type { Asset, ImportRecord, Project } from '../data/types';
import type { ModuleId } from '../data/recipe';
import { tokens } from '../design/tokens';
import { wrap, fontsOf, type Op, type PageLayout } from './export/layout';
import { loadImage } from './export/render';
import { ensureFont, loadFont } from './fonts';
import { hexToRgb, readableOnHex } from './util';
import { useCapability } from './claude';

export const W = 1080;
export const H = 1350;

export interface GenCopy {
  titulo: string;
  linha: string;
}
export interface GenState {
  seed: number;
  dona?: string;
  copy?: GenCopy[];
  aiAt?: number;
}

export interface Model {
  key: string;
  name: string;
  why: string;
  module: ModuleId;
  layout: PageLayout;
}

const T = (k: string) => {
  const v = tokens[k];
  return v.startsWith('var(--') ? tokens[v.slice(6, -1)] : v;
};

/* ---------- utilidades ---------- */

function rand(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hsl(hex: string) {
  const [r, g, b] = (hexToRgb(hex) ?? [0, 0, 0]).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const s = mx === mn ? 0 : l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
  return { s, l };
}

/** Separa a paleta do material em cor-dona (a mais viva com área), neutros claro e escuro, e acentos. */
function paletteRoles(rec: ImportRecord, seed: number, forced?: string) {
  const cols = rec.palette.filter((c) => c.share >= 1).map((c) => ({ ...c, ...hsl(c.hex) }));
  const vivid = cols.filter((c) => c.s > 0.28 && c.l > 0.15 && c.l < 0.85).sort((a, b) => b.s * Math.sqrt(b.share) - a.s * Math.sqrt(a.share));
  const pick = forced && cols.some((c) => c.hex.toLowerCase() === forced.toLowerCase()) ? forced : vivid.length ? vivid[seed % vivid.length].hex : cols[0]?.hex ?? T('c-dark');
  const light = [...cols].sort((a, b) => b.l - a.l)[0];
  const dark = [...cols].sort((a, b) => a.l - b.l)[0];
  const lightHex = light && light.l > 0.78 ? light.hex : T('c-paper');
  const darkHex = dark && dark.l < 0.25 ? dark.hex : T('c-dark');
  const accents = vivid.map((c) => c.hex).filter((h) => h !== pick);
  return { dona: pick, light: lightHex, dark: darkHex, accents, all: cols.map((c) => ({ hex: c.hex, share: c.share })) };
}

/** Frases do material: título curto e linha de apoio. Nada inventado. */
function phrases(rec: ImportRecord, p: Project) {
  const sentences = rec.texts
    .flatMap((t) => t.split(/(?<=[.!?])\s+|\s*[|•·\n]\s*/))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 2 && !/^(lorem|ipsum)/i.test(s));
  const words = (s: string) => s.split(' ').length;
  const titles = sentences.filter((s) => words(s) >= 1 && words(s) <= 6);
  const lines = sentences.filter((s) => words(s) >= 6 && words(s) <= 30);
  const name = p.title || rec.fileName.replace(/\.[^.]+$/, '');
  return { titles: titles.length ? titles : [name], lines, name };
}

/** Ponto de maior detalhe da imagem: a célula com mais contraste local, para recortar um close. */
async function focusOf(a: Asset) {
  const img = await loadImage(a);
  if (!img) return { x: 0.5, y: 0.5, ar: 1 };
  const N = 48;
  const cv = document.createElement('canvas');
  cv.width = N;
  cv.height = Math.max(8, Math.round((N * img.naturalHeight) / img.naturalWidth));
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(img, 0, 0, cv.width, cv.height);
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  const G = 6;
  const cells: { v: number; x: number; y: number }[] = [];
  const cw = cv.width / G, ch = cv.height / G;
  for (let gy = 0; gy < G; gy++)
    for (let gx = 0; gx < G; gx++) {
      let sum = 0, sq = 0, n = 0;
      for (let y = Math.floor(gy * ch); y < (gy + 1) * ch; y++)
        for (let x = Math.floor(gx * cw); x < (gx + 1) * cw; x++) {
          const i = (y * cv.width + x) * 4;
          const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
          sum += l;
          sq += l * l;
          n++;
        }
      const v = sq / n - (sum / n) ** 2;
      // leve preferência pelo centro, onde costuma estar o assunto
      const centre = 1 - Math.hypot(gx + 0.5 - G / 2, gy + 0.5 - G / 2) / G;
      const score = v * (0.7 + 0.3 * centre);
      cells.push({ v: score, x: (gx + 0.5) / G, y: (gy + 0.5) / G });
    }
  // centro de massa das células mais ricas: o recorte pega o assunto inteiro, não meia palavra
  const top = Math.max(...cells.map((k) => k.v));
  const rich = cells.filter((k) => k.v >= top * 0.55);
  const sv = rich.reduce((s, k) => s + k.v, 0) || 1;
  const x = rich.reduce((s, k) => s + k.x * k.v, 0) / sv;
  const y = rich.reduce((s, k) => s + k.y * k.v, 0) / sv;
  return { x, y, ar: img.naturalWidth / img.naturalHeight };
}

/** Recorte em frações ao redor do foco, com a proporção do quadro de destino. */
function cropAround(f: { x: number; y: number; ar: number }, zoom: number, boxAr: number) {
  let w = 1 / zoom;
  let h = (w * f.ar) / boxAr;
  if (h > 1) {
    w = w / h;
    h = 1;
  }
  const x = Math.min(1 - w, Math.max(0, f.x - w / 2));
  const y = Math.min(1 - h, Math.max(0, f.y - h / 2));
  return { x, y, w, h };
}

type TextOp = Extract<Op, { t: 'text' }>;
function text(x: number, y: number, w: number, raw: string, o: Omit<TextOp, 't' | 'x' | 'y' | 'w' | 'lines' | 'raw'>, max = 6): TextOp {
  return { t: 'text', x, y, w, raw: o.upper ? raw.toUpperCase() : raw, lines: wrap(raw, w, o, max), ...o };
}
const blockH = (op: TextOp) => op.lines.length * op.size * op.lh;

/* ---------- modelos ---------- */

export async function buildModels(p: Project, rec: ImportRecord, gen: GenState): Promise<Model[]> {
  const seed = gen.seed;
  const r = rand(seed + 1);
  const pal = paletteRoles(rec, seed, gen.dona);
  const ph = phrases(rec, p);
  const own = (p.fonts ?? []).filter((f) => rec.fonts.includes(f.family)).map((f) => f.family);
  const base = fontsOf(p);
  const rigid = own[0] ?? base.rigid;
  const loose = own[1] ?? base.loose;
  [rigid, loose].forEach((f) => loadFont(f));
  await Promise.all([ensureFont(rigid, 800), ensureFont(rigid, 400), ensureFont(loose, 400), ensureFont('DM Mono', 400)]);

  const imgs = rec.pages.map((pg) => p.assets.find((a) => a.id === pg.assetId)).filter(Boolean) as Asset[];
  const foci = await Promise.all(imgs.map(focusOf));
  const img = (i: number) => (imgs.length ? { a: imgs[(i + seed) % imgs.length], f: foci[(i + seed) % imgs.length] } : null);

  const c = (i: number) => gen.copy?.[i];
  const title = (i: number) => c(i)?.titulo || ph.titles[(i + seed) % ph.titles.length];
  const line = (i: number) => c(i)?.linha || (ph.lines.length ? ph.lines[(i + seed) % ph.lines.length] : '');

  const M = 84;
  const on = (bg: string) => readableOnHex(bg);
  const mono = (x: number, y: number, s: string, color: string, w = 600) => text(x, y, w, s, { size: 20, lh: 1.2, font: 'DM Mono', weight: 400, color, upper: true, opacity: 0.75, mono: true }, 1);
  const out: Model[] = [];
  const add = (key: string, name: string, why: string, module: ModuleId, bg: string, ops: Op[]) => out.push({ key, name, why, module, layout: { id: key, title: name, w: W, h: H, bg, ops: [{ t: 'rect', x: 0, y: 0, w: W, h: H, fill: bg }, ...ops] } });

  // 1. Capa: cor-dona chapada + um elemento em close
  {
    const bg = pal.dona;
    const ops: Op[] = [mono(M, M, ph.name, on(bg))];
    const im = img(0);
    const box = { x: M + 40, y: 230, w: W - 2 * M - 80, h: 640 };
    if (im) ops.push({ t: 'image', ...box, asset: im.a, crop: cropAround(im.f, 2.2, box.w / box.h) });
    const t = text(M, im ? 940 : 420, W - 2 * M, title(0), { size: im ? 104 : 150, lh: 0.92, font: rigid, weight: 800, color: on(bg), upper: true }, 3);
    ops.push(t);
    add('capa', 'Capa · cor-dona e um close', 'Uma ideia, um elemento, uma cor: legível a 200 px.', 'M01', bg, ops);
  }

  // 2. Manifesto: bloco de cor com título grande e linha no registro solto
  {
    const top = 820;
    const ops: Op[] = [{ t: 'rect', x: 0, y: 0, w: W, h: top, fill: pal.dona }];
    const t = text(M, 0, W - 2 * M, title(1), { size: 128, lh: 0.9, font: rigid, weight: 800, color: on(pal.dona), upper: true }, 4);
    t.y = top - M - blockH(t);
    ops.push(mono(M, M, '02 · manifesto', on(pal.dona)), t);
    const l = line(1);
    if (l) ops.push(text(M, top + 70, W - 2 * M - 120, l, { size: 42, lh: 1.25, font: loose, weight: 400, color: on(pal.light) }, 6));
    add('manifesto', 'Manifesto · bloco e frase', 'Cor-dona com a maior área e dois registros tipográficos.', 'M02', pal.light, ops);
  }

  // 3. Par: imagem inteira de um lado, texto do outro (ritmo cheio/par)
  {
    const im = img(1);
    const half = W / 2;
    const ops: Op[] = [];
    if (im) ops.push({ t: 'image', x: 0, y: 0, w: half, h: H, asset: im.a, crop: cropAround(im.f, 1.15, half / H) });
    else ops.push({ t: 'rect', x: 0, y: 0, w: half, h: H, fill: pal.dona });
    const t = text(half + 56, 0, half - 56 - M, title(2), { size: 72, lh: 0.95, font: rigid, weight: 800, color: on(pal.light), upper: true }, 5);
    const l = line(2) ? text(half + 56, 0, half - 56 - M, line(2), { size: 30, lh: 1.35, font: loose, weight: 400, color: on(pal.light) }, 9) : null;
    const total = blockH(t) + (l ? 40 + blockH(l) : 0);
    t.y = (H - total) / 2;
    ops.push(t);
    if (l) {
      l.y = t.y + blockH(t) + 40;
      ops.push(l);
    }
    ops.push(mono(half + 56, M, 'par · imagem e texto', on(pal.light), half - 56 - M));
    add('par', 'Página par · imagem e texto', 'Alterna com as páginas cheias e dá respiro ao leitor.', 'M09', pal.light, ops);
  }

  // 4. Paleta proporcional: até 4 cores, sem degradê, a maior área para a dona
  {
    const order = [pal.dona, ...pal.all.map((x) => x.hex).filter((h) => h !== pal.dona)].slice(0, 4);
    const shares = order.map((h, i) => (i === 0 ? 55 : (pal.all.find((x) => x.hex === h)?.share ?? 10) + 8));
    const sum = shares.reduce((a, b) => a + b, 0);
    let y = 0;
    const ops: Op[] = [];
    order.forEach((h, i) => {
      const hh = i === order.length - 1 ? H - y : Math.round((shares[i] / sum) * H);
      ops.push({ t: 'rect', x: 0, y, w: W, h: hh, fill: h });
      const fg = on(h);
      ops.push(text(M, y + hh - 70, 500, `${String(i + 1).padStart(2, '0')}  ${i === 0 ? 'cor-dona' : 'apoio'}`, { size: 34, lh: 1, font: rigid, weight: 800, color: fg, upper: true }, 1));
      ops.push(text(W - M - 300, y + hh - 62, 300, `${h.toUpperCase()} · ${Math.round((shares[i] / sum) * 100)}%`, { size: 22, lh: 1, font: 'DM Mono', weight: 400, color: fg, mono: true }, 1));
      y += hh;
    });
    add('paleta', 'Cor · paleta proporcional', 'Paleta curta, 01 a 04 cores, com a proporção de uso.', 'M07', pal.dona, ops);
  }

  // 5. Gerador gráfico: peça feita só com as cores e a forma, sem o logo
  {
    const bg = pal.light;
    const ops: Op[] = [];
    const cols = 6, rows = 7;
    const cw = (W - 2 * M) / cols, chh = (H - 2 * M - 120) / rows;
    const inks = [pal.dona, pal.dona, pal.dark, ...(pal.accents.slice(0, 1))];
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < cols; gx++) {
        const v = r();
        const x = M + gx * cw, y = M + gy * chh;
        const fill = inks[Math.floor(r() * inks.length)];
        if (v < 0.28) ops.push({ t: 'rect', x, y, w: cw, h: chh, fill });
        else if (v < 0.5) ops.push({ t: 'rect', x, y: y + chh / 2, w: cw, h: chh / 2, fill });
        else if (v < 0.68) ops.push({ t: 'rect', x: x + cw / 2, y, w: cw / 2, h: chh, fill });
        else if (v < 0.78) ops.push({ t: 'rect', x: x + cw * 0.3, y: y + chh * 0.3, w: cw * 0.4, h: chh * 0.4, fill });
      }
    ops.push(mono(M, H - M - 20, 'gerador gráfico · sem logo', on(bg)));
    add('gerador', 'Sistema · gerador gráfico', 'Um padrão que cria peças novas sem precisar do logo.', 'M08', bg, ops);
  }

  // 6. Close com respiro: detalhe pequeno, muita margem, legenda
  {
    const bg = pal.light;
    const im = img(2);
    const ops: Op[] = [];
    const box = { x: M + Math.round(r() * 120), y: M + 80, w: 560, h: 700 };
    if (im) ops.push({ t: 'image', ...box, asset: im.a, crop: cropAround(im.f, 2.4, box.w / box.h) });
    else ops.push({ t: 'rect', ...box, fill: pal.dona });
    const cap = line(5) || title(5);
    ops.push(text(W - M - 420, H - M - 260, 420, cap, { size: 32, lh: 1.3, font: loose, weight: 400, color: on(bg), italic: true }, 6));
    ops.push(mono(W - M - 420, H - M - 300, 'origem · detalhe', on(bg), 420));
    add('close', 'Origem · close com respiro', 'O processo visível: um detalhe ampliado com espaço em volta.', 'M03', bg, ops);
  }

  // 7. Aplicação: cartaz em sangria com o título sobre a foto
  {
    const im = img(3);
    const ops: Op[] = [];
    if (im) {
      ops.push({ t: 'image', x: 0, y: 0, w: W, h: H, asset: im.a, crop: cropAround(im.f, 1.05, W / H) });
      ops.push({ t: 'shade', x: 0, y: H * 0.45, w: W, h: H * 0.55 });
    }
    const bg = im ? pal.dark : pal.dona;
    const fg = im ? T('c-cloud') : on(bg);
    const t = text(M, 0, W - 2 * M, title(6), { size: 112, lh: 0.92, font: rigid, weight: 800, color: fg, upper: true }, 3);
    t.y = H - M - blockH(t);
    ops.push({ t: 'rect', x: M, y: t.y - 40, w: 120, h: 14, fill: pal.dona }, t);
    add('cartaz', 'Aplicação · cartaz', 'A marca no mundo, do pequeno ao grande.', 'M12', bg, ops);
  }

  return out;
}

/* ---------- IA: textos e cor-dona afinados, só com o material ---------- */

export async function aiDirection(p: Project, rec: ImportRecord): Promise<Pick<GenState, 'dona' | 'copy'> | null> {
  const sample = await useCapability('sample');
  if (!sample) return null;
  const palette = rec.palette.map((c) => `${c.hex} ${c.share}%`).join(', ');
  const prompt = `Você é diretor de arte. Vai reorganizar um material de identidade visual em 7 páginas novas de brandbook (4:5), usando SOMENTE o que veio no material.
Textos do material: ${rec.texts.join(' / ').slice(0, 2500) || '(nenhum)'}
Paleta detectada: ${palette || '(nenhuma)'}
Marca: ${p.title}

Páginas, na ordem: 1 capa, 2 manifesto, 3 página par imagem+texto, 4 paleta, 5 gerador gráfico, 6 close de origem (legenda), 7 cartaz de aplicação.
Regras: títulos de 1 a 5 palavras; linhas de até 25 palavras; reescreva a partir dos textos do material, sem inventar fatos, nomes, números ou promessas; português do Brasil; nada de lorem ipsum.
Escolha a cor-dona: a cor mais incomum e forte da paleta detectada (copie o hex exatamente).
Responda só JSON: {"dona":"#RRGGBB","copy":[{"titulo":"...","linha":"..."}, ... 7 itens]}`;
  const res: any = await sample.json(prompt, { modelTier: 'default' });
  const copy = Array.isArray(res?.copy) ? res.copy.slice(0, 7).map((x: any) => ({ titulo: String(x?.titulo ?? '').slice(0, 60), linha: String(x?.linha ?? '').slice(0, 220) })) : undefined;
  const dona = typeof res?.dona === 'string' && /^#[0-9a-f]{6}$/i.test(res.dona) ? res.dona : undefined;
  return { dona, copy };
}
