/* ================= mundo da marca: fotos geradas por IA =================
 * A IA de texto devolve a direção de arte (b.imagery: estilo + cenas, em inglês,
 * que é o que os modelos de imagem entendem melhor). Aqui isso vira o texto de
 * cada foto, com a paleta e os knobs, e a mesma semente por marca para as fotos
 * conversarem entre si. O logo nunca vai para dentro da foto: ele é aplicado
 * por cima no painel, então fica idêntico em todas as peças.
 */
import { hashStr, hex2hsl } from './color.js';
import { aiBoard, aiImage, peekBoard, peekImage } from './ai.js';

/** Nome em inglês de uma cor HEX, para o modelo de imagem. */
function colorName(hex) {
  const [h, s, l] = hex2hsl(hex);
  if (l < 0.12) return 'near-black';
  if (l > 0.9) return s > 0.3 ? 'pale ' + hueName(h) : 'off-white';
  if (s < 0.12) return l < 0.45 ? 'charcoal grey' : 'warm grey';
  const tone = l < 0.3 ? 'deep ' : l > 0.7 ? 'light ' : s < 0.35 ? 'muted ' : '';
  return tone + hueName(h);
}
function hueName(h) {
  const n = [[15, 'red'], [40, 'orange'], [55, 'amber'], [68, 'yellow'], [90, 'lime'], [150, 'green'], [175, 'teal'], [200, 'cyan'], [235, 'blue'], [265, 'indigo'], [290, 'violet'], [330, 'magenta'], [350, 'pink'], [361, 'red']];
  return n.find(([m]) => h < m)[1];
}

/** Estilo das fotos a partir dos knobs, quando a IA não mandou um. */
function styleFromKnobs(st) {
  const p = [];
  p.push(st.fut > 60 ? 'futuristic, clean, high-tech surfaces' : st.fut < 40 ? 'timeless, classic, analog film feel' : 'contemporary');
  p.push(st.sat > 60 ? 'saturated bold colors' : st.sat < 40 ? 'restrained muted tones' : 'balanced color');
  p.push(st.geo > 60 ? 'graphic geometric composition' : st.geo < 40 ? 'soft organic shapes' : '');
  p.push(st.fun > 60 ? 'playful, warm, candid' : st.fun < 40 ? 'serious, calm, premium' : '');
  if (st.tex != null) p.push(st.tex > 60 ? 'rich tactile textures, grain' : st.tex < 40 ? 'flat minimal surfaces' : '');
  if (st.ene != null) p.push(st.ene > 60 ? 'high energy, bold contrast' : st.ene < 40 ? 'calm, airy, soft contrast' : '');
  if (st.lux != null) p.push(st.lux > 60 ? 'luxurious, refined materials, premium finish' : st.lux < 40 ? 'friendly, everyday, accessible' : '');
  if (st.ous != null) p.push(st.ous > 60 ? 'daring, unexpected compositions' : st.ous < 40 ? 'understated, discreet' : '');
  if (st.tip != null) p.push(st.tip > 60 ? 'experimental expressive typography' : st.tip < 40 ? 'classic refined typography' : '');
  if (st.mov != null) p.push(st.mov > 60 ? 'dynamic motion, energy, dramatic angle' : st.mov < 40 ? 'still, symmetrical, quiet' : '');
  return p.filter(Boolean).join(', ');
}

const SIZES = { foto: [768, 768], collage: [1024, 1024], mundo: [1344, 640] };
const MAX = 4;

/** As cenas da marca: as da IA, ou cenas montadas do briefing. */
function scenesOf(b) {
  const im = b.imagery || {};
  const sc = Array.isArray(im.scenes) ? im.scenes.filter((x) => typeof x === 'string' && x.trim()) : [];
  if (sc.length) return sc.slice(0, MAX);
  const about = (b.briefing || b.concept || b.name).slice(0, 160);
  return [
    `atmospheric still life that captures the world of: ${about}`,
    `people enjoying the experience of: ${about}, candid moment`,
    `close-up macro detail of materials and textures related to: ${about}`,
    `wide establishing shot of a place for: ${about}`,
  ];
}

function photoPrompt(b, i, kind) {
  const im = b.imagery || {};
  const pal = b.palette.slice(0, 4).map((c) => colorName(c.hex)).join(', ');
  const style = (typeof im.style === 'string' && im.style.trim()) || styleFromKnobs(b.style || {});
  if (kind === 'collage') {
    const sc = scenesOf(b);
    return `Editorial brand moodboard: a 2x2 grid of four separate photographs with thin off-white gutters. ${sc.map((x, j) => `(${j + 1}) ${x}`).join(' ')}. All four share one look: ${style}. Color palette dominated by ${pal}. No text, no letters, no logo, no watermark.`;
  }
  return `${scenesOf(b)[i]}. ${style}. Color palette dominated by ${pal}. Professional editorial brand photography, art directed, natural light, high detail. No text, no letters, no logo, no watermark.`;
}

const seedOf = (b) => (b.imagery && b.imagery.seed) || (hashStr(b.name + '|' + (b.concept || '')) % 100000);
function optsOf(b, kind, i) { const [w, h] = SIZES[kind]; return { w, h, seed: seedOf(b) + i, quality: b.quality || 'default' }; }

/** Imagem já baixada, ou null. */
function photoNow(b, kind, i) { return peekImage(photoPrompt(b, i, kind), optsOf(b, kind, i)); }

/** Pede as fotos de um painel; chama onEach a cada uma que chega. */
function loadPhotos(b, kind, n, onEach, signal) {
  return Promise.allSettled([...Array(n)].map((_, i) =>
    aiImage(photoPrompt(b, i, kind), { ...optsOf(b, kind, i), signal }).then((img) => { onEach?.(i, img); return img; })));
}

/* ---------- as 4 pranchas, no padrão dos geradores de brand kit ----------
 * Cada prancha é uma grade de ~12 quadros que o modelo desenha de uma vez, com o
 * logo enviado como referência. As quatro dividem o kit como um brand book:
 * identidade, produto, comunicação e mundo da marca. */
const BOARD_N = 4;
const APP_EN = { embalagem: 'product packaging box', camiseta: 't-shirt and cap', sacola: 'canvas tote bag', social: 'Instagram post and story', foto: 'lifestyle photography', papelaria: 'business cards, letterhead and envelope', fachada: 'storefront facade with sign', icones: 'icon set', padrao: 'graphic pattern', voz: 'manifesto typography poster' };
function boardTiles(b, i) {
  const apps = (b.apps && b.apps.length ? b.apps : Object.keys(APP_EN)).map((k) => APP_EN[k]).filter(Boolean);
  const sc = scenesOf(b);
  const pal = b.palette.map((c) => c.hex.toUpperCase()).join(' ');
  // primeira linha de toda página: o núcleo da identidade, em arranjos diferentes
  const core = [
    ['cover with the logo large and the tagline', 'logo on the primary color', `color palette with swatches and hex codes ${pal}`, `typography specimen: big "Aa" in a ${b.fonts.display}-like typeface`],
    ['logo on light background with clear space', 'logo on dark background', `color palette bars with hex codes ${pal}`, `type hierarchy: headline, subhead and body in ${b.fonts.display} and ${b.fonts.body} style`],
    ['symbol alone as app icon', 'wordmark alone, large', `color palette as stacked cards with hex codes ${pal}`, 'graphic pattern built from the symbol'],
    ['logo construction grid', 'logo minimum sizes and misuse examples', `color proportions chart ${pal}`, 'set of six line icons'],
  ][i];
  const pages = [
    ['set of six line icons', 'graphic elements and shapes', ...apps.slice(0, 4), `photo: ${sc[0]}`, 'business cards', 'product packaging box', 't-shirt mockup', 'poster with the headline', 'closing tile with the logo'],
    ['merch: t-shirt, cap and tote bag', 'product packaging box', 'paper coffee cup', 'stickers and badges', 'business cards', 'letterhead and envelope', 'delivery van livery', 'storefront facade with sign', `photo: ${sc[1]}`, 'product label close-up', 'gift card', 'closing tile with the logo'],
    ['Instagram feed grid', 'Instagram story', 'street billboard', 'subway poster', 'website hero on a laptop', 'mobile app on a phone', 'email newsletter', `headline poster: "${b.voice?.headline || b.tagline}"`, 'event banner', `photo: ${sc[2]}`, 'outdoor flag or banner', 'closing tile with the logo'],
    [...sc.map((s) => `photo: ${s}`), 'texture and material close-up', 'brand manifesto spread', 'interior with brand signage', 'logo printed on a real object', 'apparel worn by a person', 'tote bag on the street', 'packaging still life', 'thank-you closing tile'],
  ][i];
  return [...core, ...pages].slice(0, 16);
}
function boardPrompt(b, i) {
  const im = b.imagery || {};
  const style = (typeof im.style === 'string' && im.style.trim()) || styleFromKnobs(b.style || {});
  const pal = b.palette.map((c) => `${c.hex.toUpperCase()} (${c.role || c.name})`).join(', ');
  const tiles = boardTiles(b, i);
  return [
    `Premium brand identity presentation board for "${b.name}"${b.tagline ? ` — ${b.tagline}` : ''}.`,
    `The attached image is THE logo (symbol + wordmark). Reproduce this exact logo faithfully wherever a logo appears; never redesign, distort or replace it.`,
    `Strict color palette: ${pal}. Typography: headlines in a ${b.fonts.display}-like typeface, text in a ${b.fonts.body}-like typeface.`,
    `Layout: a 4x4 grid of ${tiles.length} equal tiles with thin gutters, like a page of a professional brand guidelines book from a top design studio; page ${i + 1} of 4, labelled "0${i + 1}" in a small corner. Tiles: ${tiles.map((t, j) => `(${j + 1}) ${t}`).join('; ')}.`,
    `Art direction: ${style}. ${b.concept ? 'Concept: ' + b.concept.slice(0, 240) + '. ' : ''}Realistic mockups with soft natural light, consistent across every tile; crisp legible text; no watermark; no other brand names.`,
  ].join(' ');
}
const boardId = (b, i, ref) => 'b' + hashStr(boardPrompt(b, i) + '|' + (ref || '').length + '|' + (ref || '').slice(-200) + '|' + (b.quality || ''));
const refs = new WeakMap();
function boardNow(b, i) { const r = refs.get(b); return r ? peekBoard(boardId(b, i, r)) : null; }
function loadBoards(b, ref, onEach, signal) {
  refs.set(b, ref);
  return Promise.allSettled([...Array(BOARD_N)].map((_, i) =>
    aiBoard(boardId(b, i, ref), boardPrompt(b, i), ref, { quality: b.quality || 'default', seed: seedOf(b) + 50 + i, signal }).then((img) => { onEach?.(i, img); return img; })));
}

export { BOARD_N, boardNow, boardPrompt, loadBoards, colorName, loadPhotos, photoNow, photoPrompt, scenesOf, styleFromKnobs };
