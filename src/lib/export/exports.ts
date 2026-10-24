import type { Project } from '../../data/types';
import type { ModuleId } from '../../data/recipe';
import { MODULE_BY_ID } from '../../data/recipe';
import { slug } from '../util';
import { bookLayouts, fontsOf, moduleLayout, type ExportOptions } from './layout';
import { canvasBlob, paletteKit, prepareFonts, toCanvas, toCsv, toHtml, toMarkdown, toPdf, toPptx, toSvg } from './render';
import { palette as ui } from '../../design/tokens';

export const SIZES = [
  { id: 'behance', label: 'Behance', w: 1400, h: 1750, note: '1400 × 1750 px' },
  { id: 'social', label: 'Instagram e Canva', w: 1080, h: 1350, note: '1080 × 1350 px' },
  { id: 'hd', label: 'Alta resolução', w: 2800, h: 3500, note: '2800 × 3500 px' },
] as const;
export type SizeId = (typeof SIZES)[number]['id'];
export const sizeOf = (id: SizeId) => SIZES.find((s) => s.id === id)!;

export type BookFormat = 'pdf' | 'pptx' | 'png' | 'jpg' | 'webp' | 'svg' | 'html';
export interface Out {
  filename: string;
  data: Blob | string;
}

type Step = (msg: string) => void;
const pad = (n: number) => String(n).padStart(2, '0');

const IMG_TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' } as const;

export async function exportBook(p: Project, format: BookFormat, opts: ExportOptions, step: Step): Promise<Out> {
  step('Carregando fontes');
  await prepareFonts(p);
  const layouts = bookLayouts(p, opts);
  if (!layouts.length) throw new Error('O brandbook ainda não tem páginas com conteúdo. Desmarque “só módulos com conteúdo” ou preencha um módulo.');
  const name = slug(p.title) + '-brandbook';
  const prog = (i: number) => step(`Página ${i + 1} de ${layouts.length}`);
  if (format === 'pdf') return { filename: name + '.pdf', data: await toPdf(layouts, prog) };
  if (format === 'pptx') return { filename: name + '.pptx', data: await toPptx(p, layouts, prog) };
  if (format === 'html') return { filename: name + '.html', data: await toHtml(p, layouts, prog) };
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (let i = 0; i < layouts.length; i++) {
    prog(i);
    const l = layouts[i];
    const fname = `${pad(i + 1)}-${slug(l.title)}`;
    if (format === 'svg') zip.file(fname + '.svg', await toSvg(l));
    else zip.file(`${fname}.${format}`, await canvasBlob(await toCanvas(l), IMG_TYPES[format], 0.92));
  }
  step('Compactando');
  return { filename: `${name}-${format}.zip`, data: await zip.generateAsync({ type: 'blob' }) };
}

export async function exportPage(p: Project, id: ModuleId, format: 'png' | 'jpg' | 'webp' | 'svg', W: number, H: number): Promise<Out> {
  await prepareFonts(p);
  const l = moduleLayout(p, id, W, H);
  const fname = `${slug(p.title)}-${id.toLowerCase()}-${slug(MODULE_BY_ID[id].short)}`;
  if (format === 'svg') return { filename: fname + '.svg', data: await toSvg(l) };
  return { filename: `${fname}.${format}`, data: await canvasBlob(await toCanvas(l), IMG_TYPES[format], 0.92) };
}

/** Capa do Behance: recorte 808 × 632 do centro do módulo 01. */
export async function exportBehanceCover(p: Project): Promise<Out> {
  await prepareFonts(p);
  const page = await toCanvas(moduleLayout(p, 'M01', 1400, 1750));
  const cw = 1400, ch = Math.round((1400 * 632) / 808);
  const cv = document.createElement('canvas');
  cv.width = 808;
  cv.height = 632;
  cv.getContext('2d')!.drawImage(page, 0, (1750 - ch) / 2, cw, ch, 0, 0, 808, 632);
  return { filename: `${slug(p.title)}-capa-behance-808x632.png`, data: await canvasBlob(cv, 'image/png') };
}

export function exportText(p: Project, kind: 'md' | 'txt' | 'csv' | 'json'): Out {
  const name = slug(p.title);
  if (kind === 'json') return { filename: `${name}.ideario.json`, data: JSON.stringify(p, null, 2) };
  if (kind === 'csv') return { filename: `${name}-textos.csv`, data: toCsv(p) };
  const md = toMarkdown(p);
  return kind === 'md' ? { filename: `${name}-roteiro.md`, data: md } : { filename: `${name}-roteiro.txt`, data: md.replace(/[#*_]/g, '') };
}

export async function exportPalette(p: Project, which: 'project' | 'interface'): Promise<Out> {
  const colors = which === 'project' ? p.palette.map((c) => ({ name: c.name, hex: c.hex, share: c.share, pms: c.pms })) : Object.values(ui).map((c) => ({ name: c.name, hex: c.hex, pms: c.pantone }));
  if (!colors.length) throw new Error('A paleta do projeto está vazia. Defina as cores no módulo 07.');
  return { filename: `${slug(which === 'project' ? p.title : 'ideario-interface')}-paleta.zip`, data: await paletteKit(which === 'project' ? p : { ...p, title: 'IDEÁRIO interface' }, colors) };
}

/** Pacote pronto para o Canva: PPTX editável, PDF, PNGs no tamanho do Canva, cores e fontes. */
export async function exportCanva(p: Project, opts: Omit<ExportOptions, 'W' | 'H'>, step: Step): Promise<Out> {
  step('Carregando fontes');
  await prepareFonts(p);
  const o = { ...opts, W: 1080, H: 1350 };
  const layouts = bookLayouts(p, o);
  if (!layouts.length) throw new Error('O brandbook ainda não tem páginas com conteúdo.');
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const name = slug(p.title);
  step('Montando o PPTX editável');
  zip.file(`${name}-editavel.pptx`, await toPptx(p, layouts, (i) => step(`PPTX: página ${i + 1} de ${layouts.length}`)));
  step('Montando o PDF');
  zip.file(`${name}.pdf`, await toPdf(layouts, (i) => step(`PDF: página ${i + 1} de ${layouts.length}`)));
  for (let i = 0; i < layouts.length; i++) {
    step(`Imagens: ${i + 1} de ${layouts.length}`);
    zip.file(`paginas/${pad(i + 1)}-${slug(layouts[i].title)}.png`, await canvasBlob(await toCanvas(layouts[i]), 'image/png'));
  }
  const f = fontsOf(p);
  zip.file('cores-hex.txt', p.palette.length ? p.palette.map((c) => `${c.hex.toUpperCase()}  ${c.name}${c.share ? ' (' + c.share + '%)' : ''}`).join('\n') + '\n' : 'Paleta do projeto ainda vazia (módulo 07).\n');
  const custom = (p.fonts ?? []).map((x) => x.family);
  zip.file(
    'fontes.txt',
    `Registro rígido: ${f.rigid}\nRegistro solto: ${f.loose}\nApoio: DM Mono\n\nNo Canva, procure as fontes pelo nome. Se alguma não existir no Canva, envie o arquivo da fonte em Brand Kit > Fontes (Canva Pro) ou baixe em https://fonts.google.com\n` +
      (custom.length ? `\nFontes enviadas ao projeto: ${custom.join(', ')}\n` : ''),
  );
  zip.file(
    'LEIA-ME-CANVA.txt',
    `Como levar ${p.title} para o Canva\n\n1. Design editável: no Canva, clique em Criar design > Importar arquivo e escolha ${name}-editavel.pptx.\n   Cada módulo vira uma página 1080 × 1350 px com textos, formas e imagens editáveis.\n2. Versão fiel: importe ${name}.pdf do mesmo jeito. O visual fica idêntico ao IDEÁRIO.\n3. Imagens soltas: arraste a pasta /paginas para Uploads.\n4. Cores: em Brand Kit > Paleta de cores, cole os códigos de cores-hex.txt.\n5. Fontes: veja fontes.txt.\n\nOrdem das páginas segue a Receita do Brandbook (atos e módulos).\n`,
  );
  step('Compactando');
  return { filename: `${name}-pacote-canva.zip`, data: await zip.generateAsync({ type: 'blob' }) };
}
