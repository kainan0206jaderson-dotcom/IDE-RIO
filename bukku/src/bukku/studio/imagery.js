/* ================= mundo da marca: fotos geradas por IA =================
 * A IA de texto devolve a direção de arte (b.imagery: estilo + cenas, em inglês,
 * que é o que os modelos de imagem entendem melhor). Aqui isso vira o texto de
 * cada foto, com a paleta e os knobs, e a mesma semente por marca para as fotos
 * conversarem entre si. O logo nunca vai para dentro da foto: ele é aplicado
 * por cima no painel, então fica idêntico em todas as peças.
 */
import { hashStr, hex2hsl } from './color.js';
import { aiImage, peekImage } from './ai.js';

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
  if (st.mov != null) p.push(st.mov > 60 ? 'dynamic motion, energy, dramatic angle' : st.mov < 40 ? 'still, symmetrical, quiet' : '');
  return p.filter(Boolean).join(', ');
}

const SIZES = { foto: [768, 768], collage: [1024, 1024], mundo: [1344, 640], prancha: [1536, 1024] };
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
  if (kind === 'prancha') {
    // prancha de diretrizes no estilo dos geradores de brand kit: um modelo que escreve texto bem monta tudo numa imagem
    const pals = b.palette.map((c) => c.hex.toUpperCase()).join(', ');
    return `Premium brand guidelines board for the brand "${b.name}" (${b.tagline}). A clean 4x3 grid of tiles on a neutral background: cover with the wordmark "${b.name}" set in a ${b.fonts.display}-like typeface; logo and symbol tile; color palette tile with swatches ${pals} and their hex codes; typography tile showing "${b.fonts.display}" and "${b.fonts.body}"; icon set; graphic pattern; brand photography (${scenesOf(b)[0]}); t-shirt mockup; stationery set; packaging box; storefront signage; social media post. Every tile uses only this palette and the same symbol. Look: ${style}. Editorial, minimal, high-end studio presentation, crisp legible text.`;
  }
  if (kind === 'collage') {
    const sc = scenesOf(b);
    return `Editorial brand moodboard: a 2x2 grid of four separate photographs with thin off-white gutters. ${sc.map((x, j) => `(${j + 1}) ${x}`).join(' ')}. All four share one look: ${style}. Color palette dominated by ${pal}. No text, no letters, no logo, no watermark.`;
  }
  return `${scenesOf(b)[i]}. ${style}. Color palette dominated by ${pal}. Professional editorial brand photography, art directed, natural light, high detail. No text, no letters, no logo, no watermark.`;
}

const seedOf = (b) => (b.imagery && b.imagery.seed) || (hashStr(b.name + '|' + (b.concept || '')) % 100000);
function optsOf(b, kind, i) { const [w, h] = SIZES[kind]; return { w, h, seed: seedOf(b) + i, quality: b.quality || 'default', model: kind === 'prancha' ? 'gpt-image' : null }; }

/** Imagem já baixada, ou null. */
function photoNow(b, kind, i) { return peekImage(photoPrompt(b, i, kind), optsOf(b, kind, i)); }

/** Pede as fotos de um painel; chama onEach a cada uma que chega. */
function loadPhotos(b, kind, n, onEach, signal) {
  return Promise.allSettled([...Array(n)].map((_, i) =>
    aiImage(photoPrompt(b, i, kind), { ...optsOf(b, kind, i), signal }).then((img) => { onEach?.(i, img); return img; })));
}

export { colorName, loadPhotos, photoNow, photoPrompt, scenesOf, styleFromKnobs };
