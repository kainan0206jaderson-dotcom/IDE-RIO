import type { ModuleId } from './recipe';

export type ModuleStatus = 'vazio' | 'rascunho' | 'pronto';
/** cheio = uma composição ocupa o módulo; par = duas metades; faixa = banda entre atos */
export type ModuleRhythm = 'cheio' | 'par';

export interface Slot {
  text: string;
  assetIds: string[];
}

export interface ModuleState {
  status: ModuleStatus;
  rhythm: ModuleRhythm;
  /** o módulo terá GIF ou vídeo na apresentação */
  motion: boolean;
  slots: Slot[];
  notes: string;
  /** campos extras usados por módulos especiais (M02, M06, M07, M14) */
  extra: Record<string, string>;
}

export interface ProjectColor {
  id: string;
  name: string;
  hex: string;
  pms: string;
  /** proporção de uso em % */
  share: number;
}

export type CoverPattern = 'none' | 'dots' | 'grid' | 'lines' | 'diagonal' | 'checker' | 'waves';
export type CoverTexture = 'none' | 'paper' | 'linen' | 'leather' | 'kraft' | 'grain';
export type CoverFont = 'display' | 'serif' | 'mono';

export interface Sticker {
  id: string;
  kind: 'shape' | 'text' | 'image';
  /** shape: circle | star | blob | arrow | asterisk | square — text: o texto — image: asset id */
  value: string;
  color: string;
  /** posição em % da capa */
  x: number;
  y: number;
  /** tamanho em % da largura da capa */
  size: number;
  rotate: number;
}

export interface Cover {
  bg: string;
  pattern: CoverPattern;
  patternColor: string;
  texture: CoverTexture;
  titleColor: string;
  titleFont: CoverFont;
  band: string;
  stickers: Sticker[];
  imageAssetId?: string;
}

export interface Asset {
  id: string;
  name: string;
  /** onde o binário mora: nuvem do artifact ou IndexedDB do navegador */
  store: 'cloud' | 'local';
  ref: string;
  type: string;
  tags: string[];
  createdAt: number;
  w?: number;
  h?: number;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  createdAt: number;
  updatedAt: number;
  example?: boolean;
  cover: Cover;
  palette: ProjectColor[];
  ficha: Record<string, string>;
  modules: Record<ModuleId, ModuleState>;
  checklist: boolean[];
  assets: Asset[];
  /** material pronto importado (arquivos de qualquer tipo) */
  imports?: ImportRecord[];
  /** fontes enviadas pelo usuário (TTF/OTF/WOFF) */
  fonts?: ProjectFont[];
  /** histórico da conversa com o assistente (curto) */
  ai: { role: 'user' | 'assistant'; content: string }[];
}

export interface ProjectFont {
  id: string;
  family: string;
  /** onde o arquivo da fonte mora (mesma lógica dos assets) */
  store: 'cloud' | 'local';
  ref: string;
  type: string;
}

export type ImportKind = 'image' | 'svg' | 'pdf' | 'psd' | 'office' | 'archive' | 'video' | 'font' | 'text' | 'other';

export interface Finding {
  ok: boolean;
  label: string;
  detail: string;
}

export interface ImportedPage {
  assetId: string;
  w: number;
  h: number;
  palette: { hex: string; share: number }[];
  findings: Finding[];
  /** módulo para onde a página foi enviada */
  sentTo?: string;
}

export interface AiReview {
  nivel: string;
  resumo: string;
  composicao: string[];
  hierarquia: string[];
  cor: string[];
  tipografia: string[];
  modulos: { pagina: number; modulo: string; porque: string }[];
  proximos: string[];
  at: number;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  kind: ImportKind;
  size: number;
  createdAt: number;
  pages: ImportedPage[];
  /** paleta consolidada do arquivo */
  palette: { hex: string; share: number }[];
  texts: string[];
  fonts: string[];
  note?: string;
  ai?: AiReview;
  /** modelos novos gerados a partir do material: rodada e direção (IA opcional) */
  gen?: { seed: number; dona?: string; copy?: { titulo: string; linha: string }[]; aiAt?: number };
}
