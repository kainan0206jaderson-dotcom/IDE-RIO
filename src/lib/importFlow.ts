import type { AiReview, Asset, ImportRecord, Project } from '../data/types';
import { extract, kindOf } from './importers';
import { analyzeImage, blobToImage, mergePalettes } from './analyze';
import { uid } from './util';
import { assetUrl } from '../store/storage';
import { useCapability } from './claude';
import { MODULES } from '../data/recipe';
import { projectSummary } from './progress';
import { registerFonts } from './fonts';

type AddBlobs = (id: string, items: { blob: Blob; name: string; type?: string; tags?: string[] }[]) => Promise<Asset[]>;
type Update = (id: string, fn: (p: Project) => void) => void;

export interface ImportProgress {
  file: string;
  step: string;
  done: number;
  total: number;
}

/** Importa arquivos de qualquer tipo para um sketchbook: páginas viram assets analisados, fontes entram no projeto. */
export async function importFiles(projectId: string, files: File[], addBlobs: AddBlobs, update: Update, onProgress?: (p: ImportProgress) => void) {
  const records: ImportRecord[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.({ file: f.name, step: 'Lendo o arquivo', done: i, total: files.length });
    const ex = await extract(f);
    onProgress?.({ file: f.name, step: ex.pages.length ? `Analisando ${ex.pages.length} ${ex.pages.length === 1 ? 'página' : 'páginas'}` : 'Registrando', done: i, total: files.length });

    const tag = f.name.replace(/\.[^.]+$/, '').toLowerCase().slice(0, 30);
    const assets = ex.pages.length ? await addBlobs(projectId, ex.pages.map((p) => ({ blob: p.blob, name: p.name, tags: ['importado', tag] }))) : [];
    const pages: ImportRecord['pages'] = [];
    for (let j = 0; j < assets.length; j++) {
      try {
        const img = await blobToImage(ex.pages[j].blob);
        const a = analyzeImage(img, img.naturalWidth, img.naturalHeight);
        pages.push({ assetId: assets[j].id, w: img.naturalWidth, h: img.naturalHeight, ...a });
      } catch {
        pages.push({ assetId: assets[j].id, w: assets[j].w ?? 0, h: assets[j].h ?? 0, palette: [], findings: [] });
      }
    }

    const fontAssets = ex.fonts.length ? await addBlobs(projectId, ex.fonts.map((fo) => ({ blob: fo.blob, name: fo.family, type: fo.type }))) : [];
    const fonts = fontAssets.map((a, k) => ({ id: uid('f'), family: ex.fonts[k].family, store: a.store, ref: a.ref, type: a.type }));

    const rec: ImportRecord = {
      id: uid('i'),
      fileName: f.name,
      kind: ex.kind ?? kindOf(f),
      size: f.size,
      createdAt: Date.now(),
      pages,
      palette: mergePalettes(pages.map((p) => p.palette)),
      texts: ex.texts.slice(0, 30),
      fonts: [...new Set([...fonts.map((x) => x.family), ...(ex.fontNames ?? []).filter((n) => n && !/^(sans-serif|serif|monospace|g_d\d)/i.test(n))])].slice(0, 12),
      note: ex.note,
    };
    records.push(rec);
    update(projectId, (p) => {
      p.imports = [rec, ...(p.imports ?? [])];
      if (fonts.length) p.fonts = [...(p.fonts ?? []), ...fonts];
    });
    if (fonts.length) registerFonts(fonts);
  }
  onProgress?.({ file: '', step: 'Pronto', done: files.length, total: files.length });
  return records;
}

async function toJpeg(blob: Blob, max = 1280): Promise<Blob> {
  const img = await blobToImage(blob);
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * s);
  cv.height = Math.round(img.naturalHeight * s);
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('jpeg'))), 'image/jpeg', 0.85));
}

export async function visionAvailable() {
  const sample = await useCapability('sample');
  if (!sample) return { ok: false, max: 0 };
  try {
    const lim = await sample.limits();
    return { ok: !!lim?.images, max: lim?.images?.maxCount ?? 0 };
  } catch {
    return { ok: false, max: 0 };
  }
}

/** Diagnóstico de direção visual com IA: o Claude olha as páginas importadas e responde pela receita. */
export async function reviewWithAi(p: Project, rec: ImportRecord): Promise<AiReview> {
  const sample = await useCapability('sample');
  if (!sample) throw { code: 'unavailable' };
  const lim = await sample.limits().catch(() => null);
  const max = Math.max(0, Math.min(lim?.images?.maxCount ?? 0, 8));
  const pages = rec.pages.slice(0, max);
  const images: Blob[] = [];
  for (const pg of pages) {
    const a = p.assets.find((x) => x.id === pg.assetId);
    if (!a) continue;
    const url = await assetUrl(a);
    if (!url) continue;
    const blob = await (await fetch(url)).blob();
    images.push(await toJpeg(blob));
  }
  const objective = rec.pages
    .slice(0, max)
    .map((pg, i) => `Página ${i + 1} (${pg.w}×${pg.h}px): ` + pg.findings.map((f) => `${f.label}: ${f.detail}`).join(' | '))
    .join('\n');
  const prompt = `Você é diretor de arte do IDEÁRIO e revisa material pronto de identidade visual que o designer quer MELHORAR em composição e direção visual, seguindo a Receita do Brandbook.
Regras da receita: proporção única 4:5; até 40 palavras por módulo; cor-dona incomum ocupando a maior parte, paleta curta 01–04 sem degradê; dois registros tipográficos (rígido e solto) com regra de uso; um gerador gráfico que cria peças sem o logo; texto real, nada de lorem ipsum; capa legível a 200 px (uma ideia, um elemento, uma cor); foto própria da marca no mundo; aplicações do pequeno ao grande.
Módulos: ${MODULES.map((m) => `${m.id} ${m.title}`).join(', ')}.

Arquivo: ${rec.fileName} (${rec.kind}). ${images.length ? `Seguem ${images.length} imagens, na ordem das páginas.` : 'Sem imagens, analise só os dados.'}
Leitura automática:
${objective || '(sem páginas)'}
Paleta detectada: ${rec.palette.map((c) => `${c.hex} ${c.share}%`).join(', ') || '—'}
Textos encontrados: ${rec.texts.join(' / ').slice(0, 1500) || '—'}
${rec.note ? 'Observação: ' + rec.note : ''}

Contexto do projeto:
${projectSummary(p)}

Responda em português do Brasil, direto e específico ao que você VÊ (cite página e elemento), sem inventar fatos sobre a marca.
Responda só com JSON neste formato:
{"nivel":"básico"|"acima da média"|"case","resumo":"2 frases","composicao":["até 4 ajustes de grid, margem, escala, respiro, recorte"],"hierarquia":["até 3 ajustes de leitura e foco"],"cor":["até 3 ajustes de cor-dona e proporção"],"tipografia":["até 3 ajustes de registros"],"modulos":[{"pagina":1,"modulo":"M07","porque":"curto"}],"proximos":["3 ações em ordem de impacto"]}`;
  const r: any = await sample.json(prompt, images.length ? { images, modelTier: 'default' } : { modelTier: 'default' });
  const arr = (v: any) => (Array.isArray(v) ? v.map(String).slice(0, 5) : []);
  return {
    nivel: String(r?.nivel ?? ''),
    resumo: String(r?.resumo ?? ''),
    composicao: arr(r?.composicao),
    hierarquia: arr(r?.hierarquia),
    cor: arr(r?.cor),
    tipografia: arr(r?.tipografia),
    modulos: Array.isArray(r?.modulos)
      ? r.modulos
          .filter((m: any) => /^M\d\d$/.test(String(m?.modulo)) && Number(m?.pagina) >= 1)
          .map((m: any) => ({ pagina: Number(m.pagina), modulo: String(m.modulo), porque: String(m.porque ?? '') }))
          .slice(0, 24)
      : [],
    proximos: arr(r?.proximos),
    at: Date.now(),
  };
}
