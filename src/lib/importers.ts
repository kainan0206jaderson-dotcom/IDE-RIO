/**
 * Leitura de material pronto, de qualquer tipo de arquivo.
 * Cada leitor devolve páginas (imagens), textos e fontes encontrados.
 * O que o navegador não consegue abrir fica registrado com uma orientação.
 */
import type { ImportKind } from '../data/types';

export interface Extracted {
  kind: ImportKind;
  pages: { blob: Blob; name: string }[];
  texts: string[];
  fonts: { blob: Blob; family: string; type: string }[];
  /** nomes de fontes citadas no arquivo (sem o arquivo da fonte) */
  fontNames?: string[];
  note?: string;
}

const MAX_PAGES = 24;
const PAGE_WIDTH = 1600;

const ext = (name: string) => (name.split('.').pop() || '').toLowerCase();
const base = (name: string) => name.replace(/\.[^.]+$/, '');

const IMG = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'ico'];
const FONT: Record<string, string> = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
const ZIPS = ['pptx', 'docx', 'xlsx', 'potx', 'ppsx', 'key', 'pages', 'numbers', 'odp', 'odt', 'ods', 'odg', 'zip', 'sketch', 'xd', 'idml', 'epub', 'afdesign', 'procreate'];
const TEXT = ['txt', 'md', 'csv', 'rtf', 'html', 'htm', 'json'];

export function kindOf(file: File): ImportKind {
  const e = ext(file.name);
  if (e === 'svg' || file.type === 'image/svg+xml') return 'svg';
  if (IMG.includes(e) || /^image\//.test(file.type)) return e === 'psd' ? 'psd' : 'image';
  if (e === 'pdf' || e === 'ai' || file.type === 'application/pdf') return 'pdf';
  if (e === 'psd' || e === 'psb') return 'psd';
  if (FONT[e]) return 'font';
  if (/^video\//.test(file.type) || ['mp4', 'webm', 'mov', 'm4v'].includes(e)) return 'video';
  if (['pptx', 'docx', 'xlsx', 'potx', 'ppsx', 'key', 'pages', 'numbers', 'odp', 'odt', 'ods', 'odg'].includes(e)) return 'office';
  if (ZIPS.includes(e)) return 'archive';
  if (TEXT.includes(e) || /^text\//.test(file.type)) return 'text';
  return 'other';
}

function canvasBlob(cv: HTMLCanvasElement, type = 'image/png', q?: number): Promise<Blob> {
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('canvas vazio'))), type, q));
}

/** Converte qualquer imagem que o navegador decodifica (inclusive SVG) em PNG. */
async function rasterize(blob: Blob, maxW = PAGE_WIDTH): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    let w = img.naturalWidth || 1200, h = img.naturalHeight || 1500;
    if (w > maxW * 1.5) (h = Math.round((h * maxW) / w)), (w = maxW);
    if (w < 800 && (blob.type === 'image/svg+xml')) (h = Math.round((h * maxW) / w)), (w = maxW);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await canvasBlob(cv);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readImage(file: File): Promise<Extracted> {
  const e = ext(file.name);
  // formatos que o armazenamento aceita direto
  const direct = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type);
  const blob = direct ? file : await rasterize(file);
  return { kind: 'image', pages: [{ blob, name: base(file.name) + (direct ? '' : '.png') }], texts: [], fonts: [], note: e === 'gif' ? 'GIF animado entra como imagem estática na prévia.' : undefined };
}

async function readSvg(file: File): Promise<Extracted> {
  const svgText = await file.text();
  const texts = [...svgText.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const fonts = [...new Set([...svgText.matchAll(/font-family[=:]\s*["']?([^;"'>,]+)/g)].map((m) => m[1].trim()))];
  const png = await rasterize(new Blob([svgText], { type: 'image/svg+xml' }));
  return { kind: 'svg', pages: [{ blob: png, name: base(file.name) }], texts, fonts: [], fontNames: fonts };
}

async function readPdf(file: File): Promise<Extracted> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false }).promise;
  } catch {
    const isAi = ext(file.name) === 'ai';
    return {
      kind: 'pdf',
      pages: [],
      texts: [],
      fonts: [],
      note: isAi ? 'Este .ai foi salvo sem compatibilidade PDF. No Illustrator, salve com “Criar arquivo compatível com PDF” ou exporte como PDF e importe de novo.' : 'O PDF não pôde ser aberto (protegido por senha ou corrompido).',
    };
  }
  const pages: Extracted['pages'] = [];
  const texts: string[] = [];
  const fontNames = new Set<string>();
  const count = Math.min(doc.numPages, MAX_PAGES);
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const v1 = page.getViewport({ scale: 1 });
    const scale = Math.min(3, PAGE_WIDTH / v1.width);
    const vp = page.getViewport({ scale });
    const cv = document.createElement('canvas');
    cv.width = Math.round(vp.width);
    cv.height = Math.round(vp.height);
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    pages.push({ blob: await canvasBlob(cv, 'image/jpeg', 0.9), name: `${base(file.name)} · p${i}` });
    try {
      const tc = await page.getTextContent();
      const t = tc.items.map((it: any) => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();
      if (t) texts.push(t.slice(0, 600));
      for (const st of Object.values(tc.styles ?? {}) as any[]) if (st?.fontFamily && !/^(sans-serif|serif|monospace)$/.test(st.fontFamily)) fontNames.add(st.fontFamily);
    } catch {
      /* páginas só com imagem */
    }
  }
  return {
    kind: 'pdf',
    pages,
    texts,
    fonts: [],
    fontNames: [...fontNames],
    note: doc.numPages > MAX_PAGES ? `O arquivo tem ${doc.numPages} páginas; as primeiras ${MAX_PAGES} foram importadas.` : undefined,
  };
}

async function readPsd(file: File): Promise<Extracted> {
  const { readPsd } = await import('ag-psd');
  const buf = await file.arrayBuffer();
  let psd;
  try {
    psd = readPsd(buf, { skipThumbnail: true, skipLayerImageData: true, useImageData: false });
  } catch {
    return { kind: 'psd', pages: [], texts: [], fonts: [], note: 'O PSD não pôde ser lido. Salve com “Maximizar compatibilidade” ou exporte como PNG/PDF.' };
  }
  const texts: string[] = [];
  const fonts = new Set<string>();
  const walk = (layers: any[] = []) => {
    for (const l of layers) {
      if (l.text?.text) {
        texts.push(String(l.text.text).trim());
        const f = l.text.style?.font?.name;
        if (f) fonts.add(f);
      }
      if (l.children) walk(l.children);
    }
  };
  walk(psd.children);
  const pages: Extracted['pages'] = [];
  if (psd.canvas) pages.push({ blob: await canvasBlob(psd.canvas as HTMLCanvasElement), name: base(file.name) });
  return {
    kind: 'psd',
    pages,
    texts,
    fonts: [],
    fontNames: [...fonts],
    note: !psd.canvas ? 'O PSD não tem imagem composta salva. No Photoshop, ative “Maximizar compatibilidade”.' : undefined,
  };
}

async function readZip(file: File): Promise<Extracted> {
  const JSZip = (await import('jszip')).default;
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return { kind: 'archive', pages: [], texts: [], fonts: [], note: 'Não foi possível abrir este arquivo compactado.' };
  }
  const e = ext(file.name);
  const entries = Object.values(zip.files).filter((f) => !f.dir && !/__MACOSX|\/\._/.test(f.name));
  const pages: Extracted['pages'] = [];
  const fonts: Extracted['fonts'] = [];
  const texts: string[] = [];

  // prévias completas que alguns formatos guardam (Keynote, Pages, Sketch, XD, Procreate)
  const previews = entries.filter((f) => /(^|\/)(preview|thumbnail|quicklook\/preview|previews\/preview|renditions\/.*)\.(png|jpe?g)$/i.test(f.name) || /QuickLook\/Thumbnail/i.test(f.name));
  const media = entries.filter((f) => /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name));
  const ordered = [...previews, ...media.filter((m) => !previews.includes(m))];
  const fontRefs = new Set<string>();
  // PowerPoint: redesenha cada slide com a composição original
  let slidesDrawn = 0;
  let slidesTotal = 0;
  if (['pptx', 'potx', 'ppsx'].includes(e)) {
    try {
      const { renderPptxSlides } = await import('./pptxSlides');
      const r = await renderPptxSlides(zip, MAX_PAGES, PAGE_WIDTH);
      r.blobs.forEach((b, i) => pages.push({ blob: b, name: `${base(file.name)} · slide ${i + 1}` }));
      r.fonts.forEach((f) => fontRefs.add(f));
      slidesDrawn = r.blobs.length;
      slidesTotal = r.total;
    } catch (err) {
      console.warn('pptx', err);
    }
  }
  // demais formatos: prévias e imagens internas; ignora miniaturas pequenas
  for (const f of slidesDrawn ? [] : ordered) {
    if (pages.length >= MAX_PAGES) break;
    const raw = await f.async('blob');
    if (raw.size < 2500) continue;
    const isSvg = /\.svg$/i.test(f.name);
    const typed = new Blob([raw], { type: isSvg ? 'image/svg+xml' : /\.png$/i.test(f.name) ? 'image/png' : /\.gif$/i.test(f.name) ? 'image/gif' : /\.webp$/i.test(f.name) ? 'image/webp' : 'image/jpeg' });
    try {
      pages.push({ blob: isSvg ? await rasterize(typed) : typed, name: base(f.name.split('/').pop()!) });
    } catch {
      /* imagem que o navegador não decodifica (ex.: EMF/TIFF) */
    }
  }
  for (const f of entries.filter((f) => /\.(ttf|otf|woff2?)$/i.test(f.name)).slice(0, 8)) {
    const fe = ext(f.name);
    fonts.push({ blob: await f.async('blob'), family: base(f.name.split('/').pop()!), type: FONT[fe] });
  }
  // textos de PowerPoint, Word e OpenDocument
  const xmls = entries.filter((f) => /^(ppt\/slides\/slide\d+|word\/document|content)\.xml$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const x of xmls.slice(0, 40)) {
    const xml = await x.async('string');
    const t = [...xml.matchAll(/<(?:a:t|w:t|text:p|text:span)[^>]*>([^<]*)</g)].map((m) => m[1]).join(' ').replace(/\s+/g, ' ').trim();
    if (t) texts.push(t.slice(0, 600));
  }
  for (const x of entries.filter((f) => /(theme\d*|fontTable|styles)\.xml$/i.test(f.name)).slice(0, 6)) {
    const xml = await x.async('string');
    for (const m of xml.matchAll(/<a:latin typeface="([^"]+)"|w:name="([^"]+)"|style:font-name="([^"]+)"/g)) {
      const n = (m[1] || m[2] || m[3]).trim();
      if (n && !n.startsWith('+')) fontRefs.add(n);
    }
  }
  const office = ['pptx', 'docx', 'xlsx', 'potx', 'ppsx', 'key', 'pages', 'numbers', 'odp', 'odt', 'ods', 'odg'].includes(e);
  const notes = [];
  if (slidesDrawn) {
    notes.push('Os slides foram redesenhados a partir do arquivo para a leitura de composição. Gradientes, efeitos e fontes que o navegador não tem podem variar; para o visual exato, importe também a versão em PDF.');
    if (slidesTotal > slidesDrawn) notes.push(`A apresentação tem ${slidesTotal} slides; os primeiros ${slidesDrawn} foram importados.`);
  } else if (!pages.length) notes.push('Não havia imagens dentro do arquivo. Para ver o layout completo, exporte como PDF e importe de novo.');
  else if (office) notes.push('As imagens internas do arquivo foram extraídas. Para o layout exato de cada página, importe também a versão em PDF.');
  return { kind: office ? 'office' : 'archive', pages, texts, fonts, fontNames: [...fontRefs].slice(0, 12), note: notes.join(' ') || undefined };
}

async function readVideo(file: File): Promise<Extracted> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  try {
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error('vídeo'));
      setTimeout(() => rej(new Error('tempo')), 15000);
    });
    const pages: Extracted['pages'] = [];
    const dur = isFinite(v.duration) ? v.duration : 1;
    for (const f of [0.08, 0.35, 0.62, 0.9]) {
      v.currentTime = dur * f;
      await new Promise<void>((res) => {
        v.onseeked = () => res();
        setTimeout(res, 3000);
      });
      const cv = document.createElement('canvas');
      const scale = Math.min(1, PAGE_WIDTH / (v.videoWidth || PAGE_WIDTH));
      cv.width = Math.round((v.videoWidth || 1280) * scale);
      cv.height = Math.round((v.videoHeight || 720) * scale);
      cv.getContext('2d')!.drawImage(v, 0, 0, cv.width, cv.height);
      pages.push({ blob: await canvasBlob(cv, 'image/jpeg', 0.88), name: `${base(file.name)} · ${Math.round(dur * f)}s` });
    }
    return { kind: 'video', pages, texts: [], fonts: [], note: `Vídeo de ${Math.round(dur)} s: quatro quadros foram capturados para análise. Para o módulo 11 (Motion), guarde o arquivo original.` };
  } catch {
    return { kind: 'video', pages: [], texts: [], fonts: [], note: 'Este vídeo não abre no navegador (codec não suportado). Exporte em MP4 (H.264) e importe de novo.' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readFont(file: File): Promise<Extracted> {
  const family = base(file.name).replace(/[-_](regular|bold|italic|light|medium|black|semibold|thin)$/i, '').replace(/[-_]+/g, ' ');
  return { kind: 'font', pages: [], texts: [], fonts: [{ blob: file, family, type: FONT[ext(file.name)] }], note: `Fonte “${family}” adicionada ao projeto. Ela aparece na escolha de registros do módulo 06.` };
}

async function readText(file: File): Promise<Extracted> {
  let t = await file.text();
  if (/html?$/.test(ext(file.name))) t = t.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const clean = t.replace(/\s+/g, ' ').trim();
  return { kind: 'text', pages: [], texts: clean ? [clean.slice(0, 4000)] : [], fonts: [], note: 'Texto importado. Use-o como base para a ficha de partida e para a voz verbal (módulo 09).' };
}

export async function extract(file: File): Promise<Extracted> {
  const k = kindOf(file);
  try {
    if (k === 'image') return await readImage(file);
    if (k === 'svg') return await readSvg(file);
    if (k === 'pdf') return await readPdf(file);
    if (k === 'psd') return await readPsd(file);
    if (k === 'office' || k === 'archive') return await readZip(file);
    if (k === 'video') return await readVideo(file);
    if (k === 'font') return await readFont(file);
    if (k === 'text') return await readText(file);
  } catch (e) {
    return { kind: k, pages: [], texts: [], fonts: [], note: 'Não foi possível ler este arquivo no navegador. Exporte como PDF, PNG ou SVG e importe de novo.' };
  }
  // tenta como imagem (HEIC, TIFF etc. abrem em alguns navegadores)
  try {
    const png = await rasterize(file);
    return { kind: 'image', pages: [{ blob: png, name: base(file.name) }], texts: [], fonts: [] };
  } catch {
    return {
      kind: 'other',
      pages: [],
      texts: [],
      fonts: [],
      note: `O formato .${ext(file.name) || '?'} não abre no navegador. Exporte do programa original como PDF (layout completo), PNG/JPG (imagens) ou SVG (vetores) e importe de novo.`,
    };
  }
}

export const ACCEPT_HINT = 'PDF, AI, PSD, PNG, JPG, WEBP, GIF, SVG, PPTX, DOCX, Keynote, Pages, Sketch, XD, ZIP, MP4, WEBM, MOV, TTF, OTF, WOFF, TXT, MD, HTML';
