/**
 * Redesenha os slides de um .pptx em canvas: fundo, formas, imagens e textos nas posições do arquivo.
 * É uma aproximação para leitura de composição; efeitos, gradientes e autoformas complexas ficam simplificados.
 */
import type JSZip from 'jszip';

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const kids = (el: Element | null | undefined, ns: string, name: string) => (el ? [...el.children].filter((c) => c.namespaceURI === ns && c.localName === name) : []);
const kid = (el: Element | null | undefined, ns: string, name: string) => kids(el, ns, name)[0] as Element | undefined;
const deep = (el: Element | Document | null | undefined, ns: string, name: string) => (el ? (el.getElementsByTagNameNS(ns, name)[0] as Element | undefined) : undefined);

type Theme = Record<string, string>;
const ALIAS: Record<string, string> = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' };

function colorOf(el: Element | undefined, theme: Theme): string | null {
  if (!el) return null;
  const srgb = deep(el, NS_A, 'srgbClr');
  if (srgb) return '#' + srgb.getAttribute('val');
  const sch = deep(el, NS_A, 'schemeClr');
  if (sch) {
    const v = sch.getAttribute('val') || '';
    return theme[ALIAS[v] ?? v] ?? null;
  }
  const sys = deep(el, NS_A, 'sysClr');
  if (sys) return '#' + (sys.getAttribute('lastClr') || '000000');
  return null;
}

async function readTheme(zip: JSZip): Promise<Theme> {
  const f = zip.file(/ppt\/theme\/theme\d+\.xml$/)[0];
  const t: Theme = { dk1: '#000000', lt1: '#FFFFFF', dk2: '#1F1F1F', lt2: '#EEEEEE' };
  if (!f) return t;
  const doc = parse(await f.async('string'));
  const scheme = deep(doc, NS_A, 'clrScheme');
  for (const c of scheme ? [...scheme.children] : []) {
    const v = colorOf(c, {});
    if (v) t[c.localName] = v;
  }
  return t;
}

function xfrm(el: Element) {
  const x = deep(el, NS_A, 'xfrm');
  const off = kid(x, NS_A, 'off');
  const ext = kid(x, NS_A, 'ext');
  if (!off || !ext) return null;
  return { x: +off.getAttribute('x')!, y: +off.getAttribute('y')!, w: +ext.getAttribute('cx')!, h: +ext.getAttribute('cy')! };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/)) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > max && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

export async function renderPptxSlides(zip: JSZip, maxPages: number, width: number): Promise<{ blobs: Blob[]; fonts: string[]; total: number }> {
  const pres = zip.file('ppt/presentation.xml');
  if (!pres) return { blobs: [], fonts: [], total: 0 };
  const presDoc = parse(await pres.async('string'));
  const sz = deep(presDoc, NS_P, 'sldSz');
  const SW = +(sz?.getAttribute('cx') || 12192000);
  const SH = +(sz?.getAttribute('cy') || 6858000);
  const theme = await readTheme(zip);
  const fonts = new Set<string>();

  const slides = zip
    .file(/^ppt\/slides\/slide\d+\.xml$/)
    .sort((a, b) => +a.name.match(/(\d+)\.xml$/)![1] - +b.name.match(/(\d+)\.xml$/)![1]);
  const s = width / SW;
  const H = Math.round(SH * s);
  const blobs: Blob[] = [];

  for (const sf of slides.slice(0, maxPages)) {
    const doc = parse(await sf.async('string'));
    const relsFile = zip.file(sf.name.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels'));
    const rels: Record<string, string> = {};
    if (relsFile) {
      for (const r of [...parse(await relsFile.async('string')).getElementsByTagName('Relationship')]) {
        rels[r.getAttribute('Id')!] = 'ppt/' + (r.getAttribute('Target') || '').replace(/^\.\.\//, '');
      }
    }
    const cv = document.createElement('canvas');
    cv.width = width;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    const bg = deep(doc, NS_P, 'bg');
    ctx.fillStyle = colorOf(bg, theme) ?? '#FFFFFF';
    ctx.fillRect(0, 0, width, H);

    const tree = deep(doc, NS_P, 'spTree');
    const items = tree ? [...tree.querySelectorAll('*')].filter((e) => e.namespaceURI === NS_P && (e.localName === 'sp' || e.localName === 'pic')) : [];
    for (const el of items) {
      let box = xfrm(el);
      if (el.localName === 'pic') {
        const blip = deep(el, NS_A, 'blip');
        const target = rels[blip?.getAttributeNS(NS_R, 'embed') || ''];
        const f = target && zip.file(target);
        if (!box || !f) continue;
        try {
          const bmp = await createImageBitmap(await f.async('blob'));
          ctx.drawImage(bmp, box.x * s, box.y * s, box.w * s, box.h * s);
        } catch {
          /* formato de imagem que o navegador não abre (EMF, WMF, TIFF) */
        }
        continue;
      }
      const ph = deep(el, NS_P, 'ph');
      if (!box && ph) {
        // posição herdada do layout: aproxima pelo tipo de placeholder
        const t = ph.getAttribute('type') || 'body';
        box = /title/i.test(t) ? { x: SW * 0.07, y: SH * 0.06, w: SW * 0.86, h: SH * 0.18 } : { x: SW * 0.07, y: SH * 0.28, w: SW * 0.86, h: SH * 0.62 };
      }
      if (!box) continue;
      const spPr = deep(el, NS_P, 'spPr');
      const fill = kid(spPr, NS_A, 'solidFill');
      const fc = colorOf(fill, theme);
      if (fc) {
        ctx.fillStyle = fc;
        const geom = deep(spPr, NS_A, 'prstGeom')?.getAttribute('prst');
        if (geom === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse((box.x + box.w / 2) * s, (box.y + box.h / 2) * s, (box.w / 2) * s, (box.h / 2) * s, 0, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(box.x * s, box.y * s, box.w * s, box.h * s);
      }
      const body = deep(el, NS_P, 'txBody');
      if (!body) continue;
      const anchor = deep(body, NS_A, 'bodyPr')?.getAttribute('anchor') || 't';
      const pad = 91440 * s;
      const lines: { text: string; size: number; color: string; font: string; bold: boolean; align: string }[] = [];
      for (const p of kids(body, NS_A, 'p')) {
        const runs = [...p.getElementsByTagNameNS(NS_A, 'r')];
        const text = runs.map((r) => deep(r, NS_A, 't')?.textContent ?? '').join('');
        const rPr = runs[0] ? kid(runs[0], NS_A, 'rPr') : kid(p, NS_A, 'endParaRPr');
        const sizePt = +(rPr?.getAttribute('sz') || (ph && /title/i.test(ph.getAttribute('type') || '') ? 4400 : 1800)) / 100;
        const face = deep(rPr, NS_A, 'latin')?.getAttribute('typeface');
        if (face && !face.startsWith('+')) fonts.add(face);
        lines.push({
          text,
          size: sizePt * 12700 * s,
          color: colorOf(kid(rPr, NS_A, 'solidFill'), theme) ?? (fc ? theme.lt1 : theme.dk1),
          font: face && !face.startsWith('+') ? face : 'Arial',
          bold: rPr?.getAttribute('b') === '1',
          align: kid(p, NS_A, 'pPr')?.getAttribute('algn') || 'l',
        });
      }
      const laid = lines.map((l) => {
        ctx.font = `${l.bold ? 700 : 400} ${l.size}px "${l.font}", Arial, sans-serif`;
        return { ...l, rows: l.text ? wrap(ctx, l.text, box!.w * s - pad * 2) : [''] };
      });
      const total = laid.reduce((n, l) => n + l.rows.length * l.size * 1.2, 0);
      let y = box.y * s + pad;
      if (anchor === 'ctr') y = box.y * s + (box.h * s - total) / 2;
      if (anchor === 'b') y = box.y * s + box.h * s - pad - total;
      ctx.textBaseline = 'top';
      for (const l of laid) {
        ctx.font = `${l.bold ? 700 : 400} ${l.size}px "${l.font}", Arial, sans-serif`;
        ctx.fillStyle = l.color;
        ctx.textAlign = l.align === 'ctr' ? 'center' : l.align === 'r' ? 'right' : 'left';
        const x = l.align === 'ctr' ? (box.x + box.w / 2) * s : l.align === 'r' ? (box.x + box.w) * s - pad : box.x * s + pad;
        for (const row of l.rows) {
          ctx.fillText(row, x, y);
          y += l.size * 1.2;
        }
      }
    }
    blobs.push(await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('slide'))), 'image/jpeg', 0.9)));
  }
  return { blobs, fonts: [...fonts], total: slides.length };
}
