/**
 * IDEÁRIO — tokens de design.
 *
 * Única fonte de cor da interface. Nenhum componente usa hexadecimal solto:
 * tudo passa por estas variáveis, aplicadas em :root por `applyTokens()`.
 *
 * Paleta oficial (aproximações digitais da referência Pantone enviada):
 *   01 Sun Glare         PANTONE 13-0663 TSX
 *   02 Exuberant Orange  PANTONE 17-1363 TSX
 *   03 Blue Violet       PANTONE 2725 C
 *   04 Cloud Dancer      PANTONE 11-4201 TPG
 *   05 Darkest Hour      PANTONE 20-0199 TPM
 *
 * Contraste verificado (WCAG):
 *   Darkest Hour sobre Sun Glare ........ 14.4 : 1  → texto escuro
 *   Darkest Hour sobre Exuberant Orange .. 5.2 : 1  → texto escuro
 *   Branco sobre Blue Violet ............. 5.4 : 1  → texto claro
 *   Exuberant Orange sobre Cloud Dancer .. 2.8 : 1  → só decorativo / ≥ 24px
 *   Por isso existem os tons "ink" (versões escurecidas) para texto pequeno.
 */

export const palette = {
  sunGlare: { name: 'Sun Glare', pantone: '13-0663 TSX', hex: '#DAFF02' },
  exuberantOrange: { name: 'Exuberant Orange', pantone: '17-1363 TSX', hex: '#FE572A' },
  blueViolet: { name: 'Blue Violet', pantone: '2725 C', hex: '#685BC7' },
  cloudDancer: { name: 'Cloud Dancer', pantone: '11-4201 TPG', hex: '#F3F0EB' },
  darkestHour: { name: 'Darkest Hour', pantone: '20-0199 TPM', hex: '#201E1F' },
} as const;

export type PaletteKey = keyof typeof palette;

const p = (k: PaletteKey) => palette[k].hex;

/** Tokens semânticos → valor. Os nomes viram `--<nome>` no CSS. */
export const tokens: Record<string, string> = {
  /* núcleo */
  'c-sun': p('sunGlare'),
  'c-orange': p('exuberantOrange'),
  'c-violet': p('blueViolet'),
  'c-cloud': p('cloudDancer'),
  'c-dark': p('darkestHour'),

  /* derivados para legibilidade (mesma matiz, mais escuros/claros) */
  'c-orange-ink': '#B83A17',
  'c-violet-ink': '#4C40A8',
  'c-violet-soft': '#E4E1F5',
  'c-sun-soft': '#F1FFB0',
  'c-orange-soft': '#FFE3DA',
  'c-dark-80': '#2C2A2B',
  'c-dark-70': '#3A3738',
  'c-dark-60': '#55514F',
  'c-cloud-90': '#E9E5DE',
  'c-cloud-80': '#DCD7CE',
  'c-cloud-60': '#B9B2A6',
  'c-paper': '#FBF9F6',

  /* superfícies */
  'surface-page': 'var(--c-cloud)',
  'surface-paper': 'var(--c-paper)',
  'surface-sunken': 'var(--c-cloud-90)',
  'surface-raised': '#FFFFFF',
  'surface-inverse': 'var(--c-dark)',
  'surface-inverse-raised': 'var(--c-dark-80)',
  'surface-overlay': 'rgba(32, 30, 31, 0.56)',

  /* texto */
  'text-primary': 'var(--c-dark)',
  'text-secondary': 'var(--c-dark-60)',
  'text-muted': '#7A746E',
  'text-on-inverse': 'var(--c-cloud)',
  'text-on-inverse-muted': '#A9A39B',
  'text-on-sun': 'var(--c-dark)',
  'text-on-orange': 'var(--c-dark)',
  'text-on-violet': '#FFFFFF',
  'text-link': 'var(--c-violet-ink)',

  /* destaques e ações */
  'accent-primary': 'var(--c-sun)',
  'accent-secondary': 'var(--c-orange)',
  'accent-support': 'var(--c-violet)',
  'action-primary-bg': 'var(--c-dark)',
  'action-primary-fg': 'var(--c-cloud)',
  'action-highlight-bg': 'var(--c-sun)',
  'action-highlight-fg': 'var(--c-dark)',
  'action-secondary-bg': 'var(--c-orange)',
  'action-secondary-fg': 'var(--c-dark)',

  /* estados interativos */
  'state-hover': 'rgba(32, 30, 31, 0.06)',
  'state-pressed': 'rgba(32, 30, 31, 0.12)',
  'state-active-bg': 'var(--c-violet)',
  'state-active-fg': 'var(--text-on-violet)',
  'state-selected': 'var(--c-sun)',
  'state-focus': 'var(--c-violet)',

  /* feedback (sempre acompanhado de ícone + texto) */
  'feedback-ok': 'var(--c-violet)',
  'feedback-warn': 'var(--c-orange)',
  'feedback-error': 'var(--c-orange-ink)',
  'feedback-busy': 'var(--c-sun)',

  /* IA */
  'ai-bg': 'var(--c-violet)',
  'ai-fg': 'var(--text-on-violet)',
  'ai-soft': 'var(--c-violet-soft)',

  /* bordas */
  'border-strong': 'var(--c-dark)',
  'border-default': 'var(--c-cloud-80)',
  'border-subtle': 'var(--c-cloud-90)',
  'border-inverse': '#4A4647',

  /* materiais do escritório */
  'desk-top': '#2A2728',
  'desk-edge': '#171516',
  'wall': 'var(--c-cloud)',
  'wall-shade': '#E6E1D9',

  /* palco do escritório (abertura e carrossel): Darkest Hour com um véu de Blue Violet */
  'stage-top': '#2E2B3F',
  'stage-bottom': 'var(--c-dark)',
  'stage-glow': 'rgba(104, 91, 199, 0.28)',
  'stage-line': 'rgba(243, 240, 235, 0.14)',

  /* folha de sketchbook (aba de criação): papel quente, nunca branco puro */
  'sheet': '#ECE6DB',
  'sheet-deep': '#E3DCCF',
  'sheet-card': '#F1EDE5',
  'sheet-line': 'rgba(32, 30, 31, 0.07)',
  'sheet-rule': 'rgba(104, 91, 199, 0.16)',
  'marker': 'rgba(218, 255, 2, 0.55)',
  'sheet-edge': 'rgba(32, 30, 31, 0.16)',
  /* folha noturna: papel amarelado de livro, à luz da luminária */
  'sheet-night': '#E4D5B0',
  'sheet-night-deep': '#D8C79F',
  'sheet-night-card': '#EADDBC',
  'sheet-night-line': 'rgba(74, 52, 22, 0.10)',
  'sheet-night-edge': 'rgba(74, 52, 22, 0.24)',
  'ink-night': '#2B2116',
  'graphite-night': '#5E4E3A',
  'lamp-glow': 'rgba(255, 196, 92, 0.22)',
  'lamp-shade': 'rgba(52, 34, 10, 0.32)',
  'ink-pen': 'var(--c-dark)',
  'ink-graphite': '#57524E',
  'ink-violet': 'var(--c-violet-ink)',

  /* tipografia */
  'font-ui-display': "'Archivo', 'Arial Narrow', system-ui, sans-serif",
  'font-ui-body': "'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  'font-ui-serif': "'Instrument Serif', 'Times New Roman', Georgia, serif",
  'font-ui-mono': "'DM Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
  /* papéis tipográficos: na aba de criação viram escrita à mão (ver workspace.css) */
  'font-display': 'var(--font-ui-display)',
  'font-body': 'var(--font-ui-body)',
  'font-serif': 'var(--font-ui-serif)',
  'font-mono': 'var(--font-ui-mono)',
  /* escrita à mão da aba de criação */
  'font-pen': "'Caveat', 'Segoe Print', 'Bradley Hand', cursive",
  'font-lead': "'Kalam', 'Segoe Print', 'Bradley Hand', cursive",
  'font-pencil': "'Shadows Into Light', 'Segoe Print', 'Bradley Hand', cursive",

  /* forma e espaço */
  'radius-s': '4px',
  'radius-m': '8px',
  'radius-l': '14px',
  'shadow-paper': '0 1px 0 rgba(32,30,31,.06), 0 12px 28px -14px rgba(32,30,31,.35)',
  'shadow-object': '0 2px 0 rgba(0,0,0,.25), 0 22px 40px -18px rgba(0,0,0,.7)',
  'ease-out': 'cubic-bezier(.2,.8,.2,1)',
  'ease-spring': 'cubic-bezier(.34,1.4,.5,1)',
};

/** Cores da sala 3D da abertura. Mesma família da interface: parede Cloud Dancer, mesa Darkest Hour, acentos pontuais. */
export const scene = {
  wall: p('cloudDancer'),
  wallShade: '#D9D3C8',
  floor: '#6B5A4C',
  floorDark: '#4E4136',
  desk: p('darkestHour'),
  deskTop: '#2A2728',
  metal: '#3A3738',
  paper: '#ECE6DB',
  light: '#FFF4E2',
  sky: '#DCE3F0',
  accentSun: p('sunGlare'),
  accentOrange: p('exuberantOrange'),
  accentViolet: p('blueViolet'),
  fog: '#2E2B3F',
} as const;

export function applyTokens(root: HTMLElement = document.documentElement) {
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
}

/** Cores que a interface oferece como ponto de partida para capas — o usuário pode usar qualquer outra. */
export const interfaceSwatches = Object.values(palette).map((c) => c.hex);
