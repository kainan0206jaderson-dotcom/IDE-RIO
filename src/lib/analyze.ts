import type { Finding } from '../data/types';
import { contrast } from './util';

export async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

/** k-means simples em RGB sobre uma miniatura: cores dominantes com participação em %. */
function kmeans(px: number[][], k: number) {
  const centers = px.filter((_, i) => i % Math.max(1, Math.floor(px.length / k)) === 0).slice(0, k).map((c) => [...c]);
  const assign = new Array(px.length).fill(0);
  for (let it = 0; it < 8; it++) {
    for (let i = 0; i < px.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = (px[i][0] - centers[c][0]) ** 2 + (px[i][1] - centers[c][1]) ** 2 + (px[i][2] - centers[c][2]) ** 2;
        if (d < bd) (bd = d), (best = c);
      }
      assign[i] = best;
    }
    const sum = centers.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => {
      const s = sum[assign[i]];
      s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    });
    sum.forEach((s, c) => s[3] && (centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]));
  }
  const counts = centers.map((_, c) => assign.filter((a) => a === c).length);
  return centers.map((c, i) => ({ rgb: c, n: counts[i] })).filter((c) => c.n > 0);
}

export interface PageAnalysis {
  palette: { hex: string; share: number }[];
  findings: Finding[];
}

/** Leitura objetiva de uma página: proporção, paleta, respiro, equilíbrio e contraste. */
export function analyzeImage(img: HTMLImageElement | HTMLCanvasElement, w: number, h: number): PageAnalysis {
  const S = 72;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = Math.max(1, Math.round((S * h) / w));
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const px: number[][] = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) px.push([data[i], data[i + 1], data[i + 2]]);

  const clusters = px.length ? kmeans(px, 8) : [];
  // funde cores muito próximas
  const merged: { rgb: number[]; n: number }[] = [];
  for (const c of clusters.sort((a, b) => b.n - a.n)) {
    const m = merged.find((x) => Math.hypot(x.rgb[0] - c.rgb[0], x.rgb[1] - c.rgb[1], x.rgb[2] - c.rgb[2]) < 38);
    if (m) m.n += c.n;
    else merged.push({ ...c });
  }
  const total = px.length || 1;
  const palette = merged
    .map((c) => ({ hex: hex(c.rgb[0], c.rgb[1], c.rgb[2]), share: Math.round((c.n / total) * 100) }))
    .filter((c) => c.share >= 2)
    .sort((a, b) => b.share - a.share)
    .slice(0, 6);

  const findings: Finding[] = [];

  // proporção
  const ratio = w / h;
  const target = 4 / 5;
  const ratioOk = Math.abs(ratio - target) < 0.02;
  const ratioName = ratio > 1.7 ? '16:9' : ratio > 1.25 ? 'paisagem' : ratio > 0.95 ? 'quadrado' : ratio > 0.74 ? '4:5' : ratio > 0.6 ? 'retrato' : 'vertical alto';
  findings.push({
    ok: ratioOk,
    label: 'Proporção',
    detail: ratioOk ? 'Já está em 4:5, a proporção única da receita.' : `Está em ${ratioName} (${w} × ${h} px). A receita pede 4:5 (1400 × 1750 px): recorte ou recomponha.`,
  });

  // paleta curta
  const strong = palette.filter((c) => c.share >= 5).length;
  findings.push({
    ok: strong <= 4,
    label: 'Paleta',
    detail: strong <= 4 ? `${strong} cores dominantes: paleta curta, bom para bloco de cor.` : `${strong} cores com peso visual. A receita pede até 4 e uma cor-dona clara.`,
  });

  // cor-dona
  const top = palette[0]?.share ?? 0;
  findings.push({
    ok: top >= 35,
    label: 'Cor-dona',
    detail: top >= 35 ? `${palette[0].hex} ocupa ${top}% da página: a cor domina.` : 'Nenhuma cor ocupa mais de um terço. Sem bloco dominante, a cor-dona vira detalhe.',
  });

  // respiro e equilíbrio a partir da luminância em relação ao fundo dominante
  const bg = clusters.sort((a, b) => b.n - a.n)[0]?.rgb ?? [255, 255, 255];
  let ink = 0, cx = 0, cy = 0;
  for (let y = 0; y < cv.height; y++)
    for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
      if (d > 60) {
        ink++;
        cx += x;
        cy += y;
      }
    }
  const n = cv.width * cv.height;
  const fill = ink / n;
  findings.push({
    ok: fill > 0.12 && fill < 0.7,
    label: 'Respiro',
    detail:
      fill >= 0.7 ? `${Math.round(fill * 100)}% da página está ocupada. Falta respiro: tire elementos ou aumente a margem.` : fill <= 0.12 ? 'A página está quase vazia. Se for intencional, o único elemento precisa ser forte.' : `${Math.round(fill * 100)}% ocupado: há respiro para a peça respirar.`,
  });
  if (ink) {
    const ox = cx / ink / cv.width - 0.5;
    const oy = cy / ink / cv.height - 0.5;
    const off = Math.hypot(ox, oy);
    findings.push({
      ok: off < 0.18,
      label: 'Peso visual',
      detail: off < 0.18 ? 'O peso visual está equilibrado.' : `O peso está deslocado para ${oy < -0.1 ? 'cima' : oy > 0.1 ? 'baixo' : ''}${Math.abs(ox) > 0.1 ? (oy < -0.1 || oy > 0.1 ? ' e ' : '') + (ox < 0 ? 'a esquerda' : 'a direita') : ''}. Se não for uma escolha, reequilibre.`,
    });
  }

  // contraste entre as duas cores principais
  if (palette.length >= 2) {
    const c = contrast(palette[0].hex, palette[1].hex);
    findings.push({
      ok: c >= 3,
      label: 'Contraste',
      detail: c >= 3 ? `Contraste ${c.toFixed(1)}:1 entre as cores principais.` : `Contraste ${c.toFixed(1)}:1 entre as duas cores principais. Texto sobre esse fundo fica difícil de ler.`,
    });
  }

  // legibilidade em miniatura
  findings.push({
    ok: w >= 1080,
    label: 'Resolução',
    detail: w >= 1080 ? `${w} px de largura: aguenta Behance e Instagram.` : `Só ${w} px de largura. Exporte em maior resolução (1400 px para Behance).`,
  });

  return { palette, findings };
}

/** Junta as paletas das páginas numa só, ponderando pela participação. */
export function mergePalettes(list: { hex: string; share: number }[][]) {
  const acc: { hex: string; rgb: number[]; w: number }[] = [];
  for (const pal of list)
    for (const c of pal) {
      const rgb = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16));
      const m = acc.find((x) => Math.hypot(x.rgb[0] - rgb[0], x.rgb[1] - rgb[1], x.rgb[2] - rgb[2]) < 40);
      if (m) m.w += c.share;
      else acc.push({ hex: c.hex, rgb, w: c.share });
    }
  const sum = acc.reduce((s, c) => s + c.w, 0) || 1;
  return acc
    .sort((a, b) => b.w - a.w)
    .slice(0, 6)
    .map((c) => ({ hex: c.hex, share: Math.round((c.w / sum) * 100) }));
}
