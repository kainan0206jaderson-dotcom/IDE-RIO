/** Saídas da lista de formas: canvas (PNG/JPG/WebP), SVG, PDF, PPTX, HTML e kits. */
import type { Asset, Project } from '../../data/types';
import * as recipe from '../../data/recipe';
import { assetUrl } from '../../store/storage';
import { ensureFont } from '../fonts';
import { hexToRgb, rgbToCmyk, slug } from '../util';
import { fontCss, fontsOf, type Op, type PageLayout } from './layout';

/* ---------- imagens ---------- */

const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(a: Asset) {
  if (!imgCache.has(a.ref))
    imgCache.set(
      a.ref,
      (async () => {
        const url = await assetUrl(a);
        if (!url) return null;
        const img = new Image();
        img.src = url;
        try {
          await img.decode();
          return img;
        } catch {
          return null;
        }
      })(),
    );
  return imgCache.get(a.ref)!;
}

const dataCache = new Map<string, Promise<string | null>>();
/** Imagem como data URI JPEG/PNG reduzida ao tamanho de uso (para SVG, PPTX e HTML). */
function imageData(a: Asset, maxW: number) {
  const key = a.ref + ':' + maxW;
  if (!dataCache.has(key))
    dataCache.set(
      key,
      (async () => {
        const img = await loadImage(a);
        if (!img) return null;
        const s = Math.min(1, maxW / img.naturalWidth);
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * s));
        cv.height = Math.max(1, Math.round(img.naturalHeight * s));
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        return a.type === 'image/png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9);
      })(),
    );
  return dataCache.get(key)!;
}

export async function prepareFonts(p: Project) {
  const { rigid, loose } = fontsOf(p);
  await Promise.all([ensureFont(rigid, 700), ensureFont(rigid, 400), ensureFont(loose, 400), ensureFont('DM Mono', 400)]);
}

/* ---------- canvas ---------- */

const baseline = (op: Extract<Op, { t: 'text' }>, i: number) => op.y + i * op.size * op.lh + op.size * 0.82;

export async function toCanvas(l: PageLayout, scale = 1): Promise<HTMLCanvasElement> {
  const cv = document.createElement('canvas');
  cv.width = Math.round(l.w * scale);
  cv.height = Math.round(l.h * scale);
  const c = cv.getContext('2d')!;
  c.scale(scale, scale);
  for (const op of l.ops) {
    c.save();
    if (op.t === 'rect') {
      c.globalAlpha = op.opacity ?? 1;
      c.fillStyle = op.fill;
      c.fillRect(op.x, op.y, op.w, op.h);
    } else if (op.t === 'shade') {
      const g = c.createLinearGradient(0, op.y, 0, op.y + op.h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.62)');
      c.fillStyle = g;
      c.fillRect(op.x, op.y, op.w, op.h);
    } else if (op.t === 'image') {
      const img = await loadImage(op.asset);
      if (img) {
        const r = Math.max(op.w / img.naturalWidth, op.h / img.naturalHeight);
        const sw = op.w / r, sh = op.h / r;
        c.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, op.x, op.y, op.w, op.h);
      } else {
        c.fillStyle = '#DCD7CE';
        c.fillRect(op.x, op.y, op.w, op.h);
      }
    } else {
      c.globalAlpha = op.opacity ?? 1;
      c.fillStyle = op.color;
      c.font = fontCss(op);
      c.textBaseline = 'alphabetic';
      op.lines.forEach((ln, i) => c.fillText(ln, op.x, baseline(op, i)));
    }
    c.restore();
  }
  return cv;
}

export function canvasBlob(cv: HTMLCanvasElement, type: string, q = 0.92): Promise<Blob> {
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar imagem'))), type, q));
}

/* ---------- SVG (vetor com texto editável) ---------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function toSvg(l: PageLayout): Promise<string> {
  const parts: string[] = [];
  let gid = 0;
  const defs: string[] = [];
  const fams = new Set<string>();
  for (const op of l.ops) {
    if (op.t === 'rect') parts.push(`<rect x="${op.x.toFixed(1)}" y="${op.y.toFixed(1)}" width="${op.w.toFixed(1)}" height="${op.h.toFixed(1)}" fill="${op.fill}"${op.opacity != null ? ` opacity="${op.opacity}"` : ''}/>`);
    else if (op.t === 'shade') {
      const id = 'sh' + gid++;
      defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>`);
      parts.push(`<rect x="${op.x}" y="${op.y.toFixed(1)}" width="${op.w}" height="${op.h.toFixed(1)}" fill="url(#${id})"/>`);
    } else if (op.t === 'image') {
      const d = await imageData(op.asset, Math.round(op.w * 1.5));
      if (d) parts.push(`<image x="${op.x.toFixed(1)}" y="${op.y.toFixed(1)}" width="${op.w.toFixed(1)}" height="${op.h.toFixed(1)}" preserveAspectRatio="xMidYMid slice" href="${d}"/>`);
    } else {
      fams.add(op.font);
      const tsp = op.lines.map((ln, i) => `<tspan x="${op.x.toFixed(1)}" y="${baseline(op, i).toFixed(1)}">${esc(ln)}</tspan>`).join('');
      parts.push(`<text font-family="${esc(op.font)}" font-size="${op.size.toFixed(1)}" font-weight="${op.weight}"${op.italic ? ' font-style="italic"' : ''} fill="${op.color}"${op.opacity != null ? ` opacity="${op.opacity}"` : ''}>${tsp}</text>`);
    }
  }
  const gf = [...fams].map((f) => `family=${f.replace(/ /g, '+')}:wght@400;700`).join('&');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}">
<title>${esc(l.title)}</title>
<defs><style>@import url('https://fonts.googleapis.com/css2?${gf}&amp;display=swap');</style>${defs.join('')}</defs>
${parts.join('\n')}
</svg>`;
}

/* ---------- PDF ---------- */

export async function toPdf(layouts: PageLayout[], onStep?: (i: number) => void): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const first = layouts[0];
  const doc = new jsPDF({ unit: 'px', format: [first.w, first.h], orientation: first.w > first.h ? 'landscape' : 'portrait', hotfixes: ['px_scaling'], compress: true });
  for (let i = 0; i < layouts.length; i++) {
    onStep?.(i);
    const l = layouts[i];
    if (i > 0) doc.addPage([l.w, l.h], l.w > l.h ? 'landscape' : 'portrait');
    const cv = await toCanvas(l, 1);
    doc.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, l.w, l.h, undefined, 'FAST');
  }
  return doc.output('blob');
}

/* ---------- PPTX (editável: Canva, PowerPoint, Keynote, Google Slides) ---------- */

export async function toPptx(p: Project, layouts: PageLayout[], onStep?: (i: number) => void): Promise<Blob> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  const first = layouts[0];
  const inW = 10;
  const inH = (10 * first.h) / first.w;
  pptx.defineLayout({ name: 'IDEARIO', width: inW, height: inH });
  pptx.layout = 'IDEARIO';
  pptx.title = p.title;
  pptx.company = 'IDEÁRIO';
  const k = inW / first.w; // px → polegadas
  const pt = (px: number) => Math.max(6, Math.round(px * k * 72 * 10) / 10);
  const col = (c: string) => c.replace('#', '').toUpperCase();
  for (let i = 0; i < layouts.length; i++) {
    onStep?.(i);
    const l = layouts[i];
    const s = pptx.addSlide();
    s.background = { color: col(l.bg) };
    for (const op of l.ops) {
      if (op.t === 'rect') {
        if (op.x === 0 && op.y === 0 && op.w === l.w && op.h === l.h) continue;
        s.addShape('rect', { x: op.x * k, y: op.y * k, w: op.w * k, h: op.h * k, fill: { color: col(op.fill), transparency: op.opacity != null ? Math.round((1 - op.opacity) * 100) : 0 }, line: { type: 'none' } });
      } else if (op.t === 'shade') {
        s.addShape('rect', { x: op.x * k, y: (op.y + op.h * 0.35) * k, w: op.w * k, h: op.h * 0.65 * k, fill: { color: '000000', transparency: 55 }, line: { type: 'none' } });
      } else if (op.t === 'image') {
        const d = await imageData(op.asset, Math.round(op.w * 1.5));
        if (d) s.addImage({ data: d, x: op.x * k, y: op.y * k, w: op.w * k, h: op.h * k, sizing: { type: 'cover', w: op.w * k, h: op.h * k } });
      } else {
        const h = op.lines.length * op.size * op.lh + op.size * 0.3;
        s.addText(op.raw, {
          x: op.x * k,
          y: op.y * k,
          w: op.w * k + 0.05,
          h: h * k,
          margin: 0,
          valign: 'top',
          fontFace: op.font,
          fontSize: pt(op.size),
          bold: op.weight >= 600,
          italic: !!op.italic,
          color: col(op.color),
          transparency: op.opacity != null ? Math.round((1 - op.opacity) * 100) : 0,
          lineSpacingMultiple: Math.max(0.8, op.lh),
          fit: 'none',
        });
      }
    }
    s.addNotes(`${l.title} · IDEÁRIO`);
  }
  return (await pptx.write({ outputType: 'blob' })) as Blob;
}

/* ---------- HTML de rolagem ---------- */

export async function toHtml(p: Project, layouts: PageLayout[], onStep?: (i: number) => void): Promise<string> {
  const imgs: string[] = [];
  for (let i = 0; i < layouts.length; i++) {
    onStep?.(i);
    const cv = await toCanvas(layouts[i], 1);
    imgs.push(`<figure><img src="${cv.toDataURL('image/jpeg', 0.88)}" alt="${esc(layouts[i].title)}" width="${layouts[i].w}" height="${layouts[i].h}"></figure>`);
  }
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)} · Brandbook</title>
<style>body{margin:0;background:#201E1F;color:#F3F0EB;font-family:system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:32px 16px;display:grid;gap:16px}h1{font-size:14px;letter-spacing:.1em;text-transform:uppercase;font-weight:500;margin:0 0 8px}figure{margin:0}img{display:block;width:100%;height:auto}</style>
</head><body><main><h1>${esc(p.title)} · Brandbook</h1>
${imgs.join('\n')}
</main></body></html>`;
}

/* ---------- textos ---------- */

export function toCsv(p: Project) {
  const rows = [['modulo', 'titulo', 'status', 'ritmo', 'slot', 'texto']];
  for (const m of recipe.MODULES) {
    const st = p.modules[m.id];
    st.slots.forEach((s, i) => s.text.trim() && rows.push([m.id, m.title, st.status, st.rhythm, String(i + 1), s.text.trim()]));
  }
  return '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\r\n');
}

export function toMarkdown(p: Project) {
  const lines: string[] = [`# ${p.title}`, ''];
  if (p.client) lines.push(`_${p.client}_`, '');
  lines.push('## Ficha de partida', '');
  for (const f of recipe.FICHA) lines.push(`**${String(f.n).padStart(2, '0')} ${f.title}.** ${p.ficha[f.key]?.trim() || '—'}`, '');
  for (const a of recipe.ACTS) {
    lines.push(`## Ato ${a.n} — ${a.name}`, '');
    for (const id of a.modules) {
      const m = recipe.MODULE_BY_ID[id];
      const st = p.modules[id];
      if (m.optional && st.status === 'vazio') continue;
      lines.push(`### ${m.n} ${m.title} (${st.status}, ${st.rhythm}${st.motion ? ', movimento' : ''})`);
      st.slots.forEach((s, i) => s.text.trim() && lines.push(`${i + 1}. ${s.text.trim()}`));
      if (id === 'M07' && p.palette.length) p.palette.forEach((c, i) => lines.push(`- ${String(i + 1).padStart(2, '0')} ${c.name} ${c.hex}${c.pms ? ' · PMS ' + c.pms : ''} · ${c.share}%`));
      if (id === 'M06') {
        const f = fontsOf(p);
        lines.push(`- Rígido: ${f.rigid}`, `- Solto: ${f.loose}`);
        if (st.extra.rule) lines.push(`- Regra: ${st.extra.rule}`);
      }
      if (id === 'M14') for (const k of ['cta', 'email', 'price', 'credits']) st.extra[k] && lines.push(`- ${st.extra[k]}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

/* ---------- kit de paleta ---------- */

function ase(colors: { name: string; hex: string }[]) {
  // Adobe Swatch Exchange 1.0, cores RGB globais
  const chunks: number[] = [];
  const u16 = (v: number) => chunks.push((v >> 8) & 255, v & 255);
  const u32 = (v: number) => chunks.push((v >>> 24) & 255, (v >> 16) & 255, (v >> 8) & 255, v & 255);
  const f32 = (v: number) => {
    const b = new DataView(new ArrayBuffer(4));
    b.setFloat32(0, v);
    for (let i = 0; i < 4; i++) chunks.push(b.getUint8(i));
  };
  [65, 83, 69, 70].forEach((c) => chunks.push(c)); // ASEF
  u16(1);
  u16(0);
  u32(colors.length);
  for (const c of colors) {
    const name = (c.name || c.hex) + '\0';
    const rgb = hexToRgb(c.hex) ?? [0, 0, 0];
    const len = 2 + name.length * 2 + 4 + 12 + 2;
    u16(0x0001);
    u32(len);
    u16(name.length);
    for (const ch of name) u16(ch.charCodeAt(0));
    [82, 71, 66, 32].forEach((x) => chunks.push(x)); // 'RGB '
    rgb.forEach((v) => f32(v / 255));
    u16(0); // global
  }
  return new Uint8Array(chunks);
}

export async function paletteKit(p: Project, colors: { name: string; hex: string; share?: number; pms?: string }[]) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const name = slug(p.title);
  zip.file(`${name}.ase`, ase(colors));
  zip.file(
    `${name}.gpl`,
    `GIMP Palette\nName: ${p.title}\nColumns: ${colors.length}\n#\n` + colors.map((c) => `${(hexToRgb(c.hex) ?? [0, 0, 0]).map((v) => String(v).padStart(3)).join(' ')}\t${c.name}`).join('\n') + '\n',
  );
  zip.file(`${name}.css`, `:root {\n${colors.map((c, i) => `  --cor-${String(i + 1).padStart(2, '0')}: ${c.hex}; /* ${c.name} */`).join('\n')}\n}\n`);
  zip.file(
    `${name}.json`,
    JSON.stringify(
      colors.map((c, i) => {
        const rgb = hexToRgb(c.hex) ?? [0, 0, 0];
        return { n: i + 1, name: c.name, hex: c.hex, rgb, cmyk: rgbToCmyk(rgb as [number, number, number]), pms: c.pms || null, share: c.share ?? null };
      }),
      null,
      2,
    ),
  );
  zip.file(`${name}-hex.txt`, colors.map((c) => c.hex.toUpperCase()).join('\n') + '\n');
  const W = 1200, rowH = 200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${rowH * colors.length}">${colors
    .map((c, i) => {
      const rgb = hexToRgb(c.hex) ?? [0, 0, 0];
      const t = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 150 ? '#201E1F' : '#F3F0EB';
      return `<rect y="${i * rowH}" width="${W}" height="${rowH}" fill="${c.hex}"/><text x="40" y="${i * rowH + 110}" font-family="Archivo, sans-serif" font-size="56" font-weight="700" fill="${t}">${esc(c.name)}</text><text x="40" y="${i * rowH + 160}" font-family="monospace" font-size="26" fill="${t}">${c.hex.toUpperCase()} · RGB ${rgb.join(' ')} · CMYK ${rgbToCmyk(rgb as [number, number, number]).join(' ')}${c.pms ? ' · PMS ' + esc(c.pms) : ''}</text>`;
    })
    .join('')}</svg>`;
  zip.file(`${name}-amostras.svg`, svg);
  zip.file(
    'LEIA-ME.txt',
    `Paleta de ${p.title}\n\n.ase  → Adobe Illustrator, Photoshop, InDesign (Amostras > Abrir biblioteca)\n.gpl  → GIMP, Inkscape, Krita\n.css  → sites e protótipos\n.json → código e design tokens (inclui RGB, CMYK e Pantone)\n-hex.txt → Canva: Brand Kit > Cores > cole cada código HEX\n-amostras.svg → folha de cores para imprimir ou importar\n\nCMYK é conversão aproximada a partir do RGB. Confirme Pantone e CMYK no leque físico antes de imprimir.\n`,
  );
  return zip.generateAsync({ type: 'blob' });
}
