import { FICHA, MODULES, CHECKLIST, MODULE_BY_ID, ACTS, MEASURES, type ModuleId } from '../data/recipe';
import type { Project } from '../data/types';
import { countWords } from './util';

export function moduleWords(p: Project, id: ModuleId) {
  const m = p.modules[id];
  return m.slots.reduce((n, s) => n + countWords(s.text), 0);
}

export function moduleFilled(p: Project, id: ModuleId) {
  const m = p.modules[id];
  return m.slots.filter((s) => s.text.trim() || s.assetIds.length).length + (Object.values(m.extra).some((v) => v?.trim()) ? 1 : 0) + (id === 'M07' && p.palette.length ? 1 : 0);
}

export function fichaFilled(p: Project) {
  return FICHA.filter((f) => p.ficha[f.key]?.trim()).length;
}

export function progress(p: Project) {
  const required = MODULES.filter((m) => !m.optional);
  const done = required.filter((m) => p.modules[m.id].status === 'pronto').length;
  const started = MODULES.filter((m) => p.modules[m.id].status !== 'vazio').length;
  const score = p.checklist.filter(Boolean).length;
  return { done, total: required.length, started, score, ficha: fichaFilled(p) };
}

/** Tensão + Sistema + Prova = Case */
export function caseFormula(p: Project) {
  const st = (id: ModuleId) => p.modules[id].status;
  const val = (id: ModuleId) => (st(id) === 'pronto' ? 1 : st(id) === 'rascunho' ? 0.5 : 0);
  return {
    tensao: Math.max(val('M02'), p.ficha.tensao?.trim() ? 0.5 : 0),
    sistema: val('M08'),
    prova: val('M13'),
  };
}

export interface ArchCheck {
  rule: string;
  ok: boolean | null;
  detail: string;
  modules?: ModuleId[];
}

export function architecture(p: Project): ArchCheck[] {
  const seq = MODULES.filter((m) => !(m.optional && p.modules[m.id].status === 'vazio'));
  const checks: ArchCheck[] = [];

  checks.push({ rule: '01 Uma proporção só', ok: true, detail: 'Todo módulo do IDEÁRIO é 4:5 (1400 × 1750 px).' });

  const runs: ModuleId[] = [];
  for (let i = 2; i < seq.length; i++) {
    const r = (k: number) => p.modules[seq[k].id].rhythm;
    if (r(i) === r(i - 1) && r(i) === r(i - 2)) runs.push(seq[i].id);
  }
  checks.push({
    rule: '02 Alterne cheio e par',
    ok: runs.length === 0,
    detail: runs.length ? `Três iguais seguidos terminando em ${runs.join(', ')}. Troque um para “par” ou “cheio”.` : 'Nenhuma sequência de três módulos iguais.',
    modules: runs,
  });

  checks.push({ rule: '03 Faixa entre atos', ok: true, detail: 'A prévia insere uma faixa na cor-dona entre cada ato.' });

  const long = MODULES.filter((m) => moduleWords(p, m.id) > MEASURES.maxWords).map((m) => m.id);
  checks.push({
    rule: '04 Zero texto longo',
    ok: long.length === 0,
    detail: long.length ? `Passaram de 40 palavras: ${long.join(', ')}.` : 'Todos os módulos estão dentro de 40 palavras.',
    modules: long,
  });

  const cover = p.modules.M01;
  checks.push({
    rule: '05 Capa legível a 200 px',
    ok: cover.status === 'vazio' ? null : cover.slots.some((s) => s.assetIds.length) && moduleWords(p, 'M01') <= 12,
    detail: cover.status === 'vazio' ? 'A capa ainda não foi montada.' : 'Teste a miniatura no módulo 01. Uma ideia, um elemento, uma cor, pouco texto.',
    modules: ['M01'],
  });

  const app = p.modules.M12;
  checks.push({
    rule: '06 Crescendo físico',
    ok: app.status === 'vazio' ? null : app.slots[0].assetIds.length >= 3,
    detail: app.status === 'vazio' ? 'Aplicações ainda vazias.' : 'Ordene as imagens do slot 1 do módulo 12 do menor ao maior.',
    modules: ['M12'],
  });

  const idx = seq.map((m, i) => (p.modules[m.id].motion ? i : -1)).filter((i) => i >= 0);
  let gapOk: boolean | null = null;
  let gapDetail = 'Nenhum módulo marcado com movimento. Marque GIF ou vídeo a cada 3 ou 4 módulos.';
  if (idx.length) {
    const points = [-1, ...idx, seq.length];
    const maxGap = Math.max(...points.slice(1).map((v, i) => v - points[i] - 1));
    const tooDense = idx.some((v, i) => i > 0 && v - idx[i - 1] < 3);
    gapOk = maxGap <= 4 && !tooDense;
    gapDetail = gapOk
      ? `${idx.length} movimentos bem distribuídos.`
      : tooDense
        ? 'Movimentos muito próximos: cansam quem rola.'
        : `Há ${maxGap} módulos seguidos sem movimento.`;
  }
  checks.push({ rule: '07 Movimento com dose', ok: gapOk, detail: gapDetail });

  const end = p.modules.M14;
  const endOk = !!(end.extra.email?.trim() && end.extra.cta?.trim());
  checks.push({
    rule: '08 Final com conversa',
    ok: end.status === 'vazio' && !endOk ? null : endOk && !!end.extra.price?.trim(),
    detail: endOk ? (end.extra.price?.trim() ? 'Créditos, contato e preço preenchidos.' : 'Falta o preço “a partir de”.') : 'Preencha chamada e e-mail no módulo 14.',
    modules: ['M14'],
  });

  return checks;
}

/** Dica automática por item do checklist, a partir do estado real do projeto. */
export function checklistHint(p: Project, i: number): string | null {
  const it = CHECKLIST[i];
  if (it.m === 'ARQ') {
    const bad = architecture(p).filter((c) => c.ok === false);
    return bad.length ? bad[0].detail : null;
  }
  const st = p.modules[it.m].status;
  if (st === 'vazio') return `${MODULE_BY_ID[it.m].title} ainda está vazio.`;
  if (it.m === 'M02') {
    const w = countWords(p.modules.M02.slots[0].text);
    if (w > MEASURES.maxTensionWords) return `A frase-tensão tem ${w} palavras. O limite é 8.`;
  }
  if (it.m === 'M09' && /lorem|ipsum/i.test(JSON.stringify(p.modules))) return 'Há “lorem ipsum” em algum módulo.';
  if (it.m === 'M07' && p.palette.length > 4) return `A paleta tem ${p.palette.length} cores. A receita pede de 01 a 04.`;
  return null;
}

export function actOf(id: ModuleId) {
  return ACTS.find((a) => a.modules.includes(id))!;
}

export function projectSummary(p: Project) {
  const lines = [`Projeto: ${p.title}${p.client ? ' (' + p.client + ')' : ''}`];
  lines.push('Ficha de partida:');
  for (const f of FICHA) lines.push(`- ${String(f.n).padStart(2, '0')} ${f.title}: ${p.ficha[f.key]?.trim() || '(vazio)'}`);
  if (p.palette.length) lines.push('Paleta do projeto: ' + p.palette.map((c) => `${c.name} ${c.hex} ${c.share}%`).join(', '));
  lines.push('Módulos:');
  for (const m of MODULES) {
    const s = p.modules[m.id];
    const txt = s.slots.map((x) => x.text.trim()).filter(Boolean).join(' / ');
    lines.push(`- ${m.n} ${m.title} [${s.status}]${txt ? ': ' + txt : ''}`);
  }
  lines.push(`Checklist: ${p.checklist.filter(Boolean).length}/12`);
  return lines.join('\n');
}
