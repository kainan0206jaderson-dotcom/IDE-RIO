import { MODULES, CHECKLIST, FICHA, type ModuleId } from './recipe';
import type { Cover, ModuleState, Project } from './types';
import { uid } from '../lib/util';
import { palette as ui } from '../design/tokens';

const SUN = ui.sunGlare.hex, ORANGE = ui.exuberantOrange.hex, VIOLET = ui.blueViolet.hex, CLOUD = ui.cloudDancer.hex, DARK = ui.darkestHour.hex;

const emptyModule = (i: number): ModuleState => ({
  status: 'vazio',
  /* alterna cheio e par por padrão, como pede a arquitetura */
  rhythm: i % 2 === 0 ? 'cheio' : 'par',
  motion: false,
  slots: [0, 1, 2, 3].map(() => ({ text: '', assetIds: [] })),
  notes: '',
  extra: {},
});

/** Capas iniciais: variam a cada sketchbook novo, mas o usuário troca tudo depois. */
const COVER_PRESETS: Omit<Cover, 'stickers'>[] = [
  { bg: DARK, pattern: 'dots', patternColor: '#3A3738', texture: 'leather', titleColor: SUN, titleFont: 'display', band: ORANGE },
  { bg: VIOLET, pattern: 'none', patternColor: '#4C40A8', texture: 'linen', titleColor: CLOUD, titleFont: 'serif', band: SUN },
  { bg: CLOUD, pattern: 'grid', patternColor: '#DCD7CE', texture: 'paper', titleColor: DARK, titleFont: 'mono', band: VIOLET },
  { bg: '#C9A57B', pattern: 'none', patternColor: '#B08A60', texture: 'kraft', titleColor: DARK, titleFont: 'display', band: DARK },
  { bg: ORANGE, pattern: 'waves', patternColor: '#E24A20', texture: 'grain', titleColor: DARK, titleFont: 'display', band: DARK },
];

export function newProject(title: string, client = '', presetIndex?: number): Project {
  const i = presetIndex ?? Math.floor(Math.random() * COVER_PRESETS.length);
  const now = Date.now();
  return {
    id: uid('p'),
    title: title.trim() || 'Sem título',
    client,
    createdAt: now,
    updatedAt: now,
    cover: { ...COVER_PRESETS[i % COVER_PRESETS.length], stickers: [] },
    palette: [],
    ficha: Object.fromEntries(FICHA.map((f) => [f.key, ''])),
    modules: Object.fromEntries(MODULES.map((m, i) => [m.id, emptyModule(i)])) as Record<ModuleId, ModuleState>,
    checklist: CHECKLIST.map(() => false),
    assets: [],
    ai: [],
  };
}

/** Exemplo montado só com o conteúdo da própria receita (casos AYLA e Grove). */
export function exampleProject(): Project {
  const p = newProject('AYLA Furniture', 'Exemplo da receita', 4);
  p.example = true;
  p.cover = {
    bg: ORANGE, pattern: 'none', patternColor: '#E24A20', texture: 'grain', titleColor: DARK, titleFont: 'serif', band: DARK,
    stickers: [
      { id: uid('s'), kind: 'shape', value: 'blob', color: CLOUD, x: 62, y: 58, size: 42, rotate: -8 },
      { id: uid('s'), kind: 'text', value: '15% OFF', color: DARK, x: 24, y: 78, size: 26, rotate: -6 },
    ],
  };
  p.ficha = Object.fromEntries(FICHA.map((f) => [f.key, f.example.replace(/^“|”$/g, '')]));
  p.ficha.slogan = 'Sua casa, seu estilo.';
  p.ficha.tensao = 'Móveis se vendem em render cinza e frio. Nós vendemos em laranja e luz do dia.';
  p.palette = [
    { id: uid('c'), name: 'Laranja AYLA', hex: '#F2601F', pms: '', share: 60 },
    { id: uid('c'), name: 'Madeira', hex: '#B9875A', pms: '', share: 25 },
    { id: uid('c'), name: 'Papel', hex: '#F5EFE6', pms: '', share: 10 },
    { id: uid('c'), name: 'Grafite', hex: '#232021', pms: '', share: 5 },
  ];
  const m = p.modules;
  m.M02.slots[0].text = 'Casa não é render.';
  m.M02.slots[1].text = 'A categoria: cinza, azul e render frio. Nós: laranja, madeira e luz do dia.';
  m.M02.status = 'rascunho';
  m.M06.extra = { rigid: 'Archivo Narrow', loose: 'Playfair Display', rule: 'Didone no logo e na assinatura. Condensada no preço, no varejo e na sinalização. Nunca as duas na mesma linha.' };
  m.M06.status = 'rascunho';
  m.M07.status = 'pronto';
  m.M07.slots[3].text = 'Etiqueta laranja na perna da cadeira.';
  m.M08.slots[0].text = 'As silhuetas dos produtos da própria loja.';
  m.M08.slots[3].text = 'Padrão, cartaz e embalagem feitos só com as silhuetas.';
  m.M08.rhythm = 'par';
  m.M08.motion = true;
  m.M08.status = 'rascunho';
  m.M09.slots[0].text = 'Sua casa, seu estilo.';
  m.M09.status = 'rascunho';
  m.M13.slots[0].text = 'Loja real em Sinop: cartazes no chão, etiquetas nos móveis, fachada com letras em relevo.';
  m.M14.extra = { cta: 'Vamos conversar?', email: 'contato@estudio.com', price: 'Identidade a partir de US$ 7 mil', credits: 'Cliente: AYLA Furniture\nDesign: LOTIPA' };
  p.checklist = p.checklist.map((_, i) => i === 5 || i === 6);
  return p;
}
