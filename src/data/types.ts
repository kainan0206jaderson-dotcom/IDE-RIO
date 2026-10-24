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
  /** histórico da conversa com o assistente (curto) */
  ai: { role: 'user' | 'assistant'; content: string }[];
}
