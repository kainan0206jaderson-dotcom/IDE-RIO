import { cmyk, hashStr, inkOn, luma, rolesOf, shadeHex, slugify } from './color.js';
import { loadFont } from './fonts.js';
import { svgImg, tintImg } from './svg.js';
import { localSymbol } from './brand.js';
import { MOCKUPS } from './mockups.js';
import { imgURL, loadImage } from '../lib/store.js';
import { artCanvas, hexRgb, makeCanvas, roundRect } from '../lib/util.js';
import { BK } from '../brand/mark.js';
import { boardNow, photoNow } from './imagery.js';

/* ---------- imagens enviadas pelo cliente ---------- */
const dims = (img) => [img.naturalWidth || img.width, img.naturalHeight || img.height];

/** Lê a borda da imagem: se ela é de uma cor só, aquela cor é fundo e vira transparente.
 *  Sem isso, um símbolo em JPG ou PNG com fundo branco, tingido de uma cor, vira um quadrado chapado. */
function cutout(img) {
  const [w, h] = dims(img);
  const c = makeCanvas(w, h, (g) => g.drawImage(img, 0, 0));
  const g = c.getContext('2d', { willReadFrequently: true });
  const id = g.getImageData(0, 0, w, h), d = id.data;
  const samp = [];
  const step = Math.max(1, Math.floor((w + h) / 240));
  const take = (x, y) => { const i = (y * w + x) * 4; samp.push([d[i], d[i + 1], d[i + 2], d[i + 3]]); };
  for (let x = 0; x < w; x += step) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y += step) { take(0, y); take(w - 1, y); }
  if (samp.filter((s) => s[3] < 24).length / samp.length > 0.5) return { img: c, clean: true };
  const avg = [0, 1, 2].map((k) => samp.reduce((s, p) => s + p[k], 0) / samp.length);
  const dev = samp.reduce((s, p) => s + Math.hypot(p[0] - avg[0], p[1] - avg[1], p[2] - avg[2]), 0) / samp.length;
  // borda variada: é foto ou ilustração com cenário, recortar estragaria
  if (dev > 38) return { img: c, clean: false };
  const t0 = 26, t1 = 72;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i] - avg[0], d[i + 1] - avg[1], d[i + 2] - avg[2]);
    if (dist < t1) d[i + 3] = Math.round(d[i + 3] * Math.max(0, (dist - t0) / (t1 - t0)));
  }
  g.putImageData(id, 0, 0);
  return { img: trim(c), clean: true };
}

/** Corta a área transparente em volta, para o símbolo ocupar o quadro que recebe. */
function trim(c) {
  const g = c.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = c;
  const d = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return c;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  return makeCanvas(x1 - x0 + 1, y1 - y0 + 1, (gg) => gg.drawImage(c, -x0, -y0));
}

/** Fração do quadro coberta de tinta: ~0 é símbolo vazio, ~1 é um quadrado cheio. */
function coverage(img) {
  if (!img) return 0;
  const s = 64;
  const c = makeCanvas(s, s, (g) => g.drawImage(img, 0, 0, s, s));
  const d = c.getContext('2d').getImageData(0, 0, s, s).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
  return n / (s * s);
}

/** Imagem com cores próprias que não dá para tingir: entra inteira, com cantos arredondados. */
function badge(img) {
  const [w, h] = dims(img);
  const r = Math.min(w, h) * 0.12;
  return makeCanvas(w, h, (g) => { roundRect(g, 0, 0, w, h, r); g.clip(); g.drawImage(img, 0, 0, w, h); });
}

/* ---------- lettering recortado à mão ---------- */
const isBukku = (b) => slugify(b.name) === 'bukku';

/** Letras de tamanhos, alturas e inclinações diferentes, como recortadas de papel, impressas com borda irregular. */
function handCut(text, font) {
  let s = hashStr(text + font) | 0;
  const rr = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return ((s >>> 8) & 0xffff) / 65536; };
  const H = 240;
  const chars = [...text];
  const c = makeCanvas(Math.max(240, chars.length * H * 1.05 + 80), H * 1.7);
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.textBaseline = 'alphabetic';
  let x = 30;
  chars.forEach((ch, i) => {
    if (ch === ' ') { x += H * 0.32; return; }
    const big = i === 0 || rr() > 0.62;
    const sc = big ? 0.92 + rr() * 0.14 : 0.56 + rr() * 0.22;
    const px = H * sc;
    g.font = `700 ${px}px "${font}", Georgia, serif`;
    const w = g.measureText(ch).width;
    const lift = big ? rr() * H * 0.06 : (rr() > 0.5 ? H * (0.28 + rr() * 0.18) : rr() * H * 0.05);
    const base = H * 1.42 - lift;
    g.save();
    g.translate(x + w / 2, base - px * 0.35);
    g.rotate((rr() - 0.5) * 0.24);
    g.fillText(ch, -w / 2, px * 0.35);
    g.restore();
    x += w * (0.98 + rr() * 0.05);
  });
  return BK.print(trim(c), { ink: '#111111', blur: 0.006, edge: 0.3, f1: 0.007, f2: 0.05, holes: 0.005, holeF: 0.09 });
}

/* ---------- preparação de cada marca ---------- */
const prepCache = new WeakMap();
const readyMap = new WeakMap();

function prepare(b) {
  if (prepCache.has(b)) return prepCache.get(b);
  const pr = (async () => {
    const R_ = rolesOf(b);
    const P = R_.P;
    await Promise.all([loadFont(b.fonts.display), loadFont(b.fonts.body)]);
    const mono = (h) => [h, h, h, h, h];
    let [pos, light, dark, pat, patLight, ...icons] = await Promise.all([
      svgImg(b.symbol, P, 1000), svgImg(b.symbol, mono(R_.light), 1000), svgImg(b.symbol, mono(R_.dark), 1000),
      svgImg(b.pattern, P, 400), svgImg(b.pattern, mono(R_.light), 400),
      ...b.icons.map((i) => svgImg(i.svg, [R_.dark, R_.primary, R_.accent, R_.light, R_.dark], 240)),
    ]);
    // símbolo gerado que não renderizou, ou saiu vazio ou como um bloco cheio: volta para um símbolo base
    const cv = coverage(pos);
    if (!pos || cv < 0.015 || cv > 0.9) {
      const fb = localSymbol(b);
      b.symbol = fb;
      [pos, light, dark] = await Promise.all([svgImg(fb, P, 1000), svgImg(fb, mono(R_.light), 1000), svgImg(fb, mono(R_.dark), 1000)]);
    }
    const u = b.user || {};
    const [uSym, uWord, uRef] = await Promise.all(['symbol', 'wordmark', 'ref'].map((k) => (u[k] ? loadImage(imgURL(u[k])).catch(() => null) : null)));
    let symSource = 'gerado';
    if (uSym) {
      const cut = cutout(uSym);
      pos = cut.img;
      if (cut.clean) { light = tintImg(cut.img, R_.light); dark = tintImg(cut.img, R_.dark); }
      else light = dark = badge(cut.img);
      symSource = 'cliente';
    } else if (isBukku(b)) {
      pos = BK.symbol(900, R_.dark);
      light = BK.symbol(900, R_.light);
      dark = BK.symbol(900, R_.dark);
      symSource = 'bukku';
    }
    // logotipo: o do cliente, o lettering do BUKKU, um lettering recortado, ou a fonte de títulos
    let wm = null, wmTint = true;
    if (uWord) { const cut = cutout(uWord); wm = cut.img; wmTint = cut.clean; }
    else if (isBukku(b)) wm = BK.wordmark(320, '#111111');
    else if (b.wordmark.style === 'recortado') wm = handCut(wmText(b), b.fonts.display);
    const A = { R: R_, P, pos, light, dark, pat, patLight, icons, uWord, uRef, wm, wmTint, wmCache: new Map(), symSource };
    readyMap.set(b, A);
    return A;
  })();
  prepCache.set(b, pr);
  return pr;
}

/* ---------- texto ---------- */
const wmText = (b) => (b.wordmark.case === 'upper' ? b.name.toUpperCase() : b.wordmark.case === 'lower' ? b.name.toLowerCase() : b.name);
const dispFont = (b, px, w) => `${w || b.wordmark.weight || 400} ${px}px "${b.fonts.display}", Georgia, serif`;
const bodyFont = (b, px, w = 400) => `${w} ${px}px "${b.fonts.body}", system-ui, sans-serif`;

function drawTracked(g, text, x, y, sp, align) {
  const ch = [...text];
  const ws = ch.map((c) => g.measureText(c).width);
  const tot = ws.reduce((a, c) => a + c, 0) + sp * (ch.length - 1);
  let cx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
  g.textAlign = 'left';
  ch.forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + sp; });
  return tot;
}

/** Desenha o logotipo com a base em y. Usa a imagem do logotipo quando existe; senão, a fonte de títulos. */
function wordmark(g, b, x, y, maxW, px, color, align = 'left') {
  const A = readyMap.get(b);
  if (A && A.wm) {
    let img = A.wm;
    if (A.wmTint) {
      if (!A.wmCache.has(color)) A.wmCache.set(color, tintImg(A.wm, color));
      img = A.wmCache.get(color);
    }
    const [iw, ih] = dims(img);
    let h = px * 1.05, w = (h * iw) / ih;
    if (w > maxW) { w = maxW; h = (w * ih) / iw; }
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.drawImage(img, x0, y - h * 0.9, w, h);
    return w;
  }
  const t = wmText(b);
  let size = px;
  for (let i = 0; i < 40; i++) {
    g.font = dispFont(b, size);
    const sp = (size * b.wordmark.tracking) / 100;
    const w = [...t].reduce((a, c) => a + g.measureText(c).width, 0) + sp * ([...t].length - 1);
    if (w <= maxW) break;
    size *= 0.93;
  }
  g.fillStyle = color;
  g.textBaseline = 'alphabetic';
  return drawTracked(g, t, x, y, (size * b.wordmark.tracking) / 100, align);
}

function wrapAll(g, text, maxW) {
  const out = [];
  let line = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
function lines(g, text, maxW, max = 99) { return wrapAll(g, text, maxW).slice(0, max); }

/** Acha o maior tamanho em que o texto inteiro cabe em maxLines linhas de largura maxW.
 *  Só corta com reticências se nem no tamanho mínimo couber. */
function fit(g, text, maxW, maxLines, fontAt, px, min = px * 0.45) {
  let size = px, ls;
  for (;;) {
    g.font = fontAt(size);
    ls = wrapAll(g, text, maxW);
    const ok = ls.length <= maxLines && ls.every((l) => g.measureText(l).width <= maxW);
    if (ok || size <= min) break;
    size = Math.max(min, size * 0.93);
  }
  if (ls.length > maxLines) {
    ls = ls.slice(0, maxLines);
    let last = ls[maxLines - 1];
    while (last.includes(' ') && g.measureText(last + '…').width > maxW) last = last.replace(/\s*\S+$/, '');
    ls[maxLines - 1] = last + '…';
  }
  return { ls, size, lh: size * 1.14 };
}

/* ---------- desenho ---------- */
function symDraw(g, A, v, x, y, s) {
  const img = A[v];
  if (!img) return;
  const [iw, ih] = dims(img);
  const ar = iw / ih || 1;
  let w = s, h = s;
  if (ar > 1) h = s / ar; else w = s * ar;
  g.drawImage(img, x + (s - w) / 2, y + (s - h) / 2, w, h);
}
function tile(g, img, x, y, w, h, size, alpha = 1) {
  if (!img) return;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalAlpha = alpha;
  for (let yy = y; yy < y + h; yy += size) for (let xx = x; xx < x + w; xx += size) g.drawImage(img, xx, yy, size, size);
  g.restore();
}
function cover(g, img, x, y, w, h) {
  const [iw, ih] = dims(img);
  const s = Math.max(w / iw, h / ih);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
  g.restore();
}

async function drawPanel(k, b, c) {
  const A = await prepare(b);
  const W = c.width, H = c.height, g = c.getContext('2d'), R_ = A.R;
  g.save();
  g.clearRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';
  const bg = (col) => { g.fillStyle = col; g.fillRect(0, 0, W, H); };
  const txt = (t, x, y, font, col, align = 'left', a = 1) => { g.font = font; g.fillStyle = col; g.textAlign = align; g.globalAlpha = a; g.fillText(t, x, y); g.globalAlpha = 1; g.textAlign = 'left'; };
  const block = (f, x, y, col, a = 1) => { g.fillStyle = col; g.globalAlpha = a; f.ls.forEach((l, i) => g.fillText(l, x, y + i * f.lh)); g.globalAlpha = 1; };
  const varOn = (bgc) => (luma(bgc) > 0.3 ? 'dark' : 'light');
  const ctx = { g, W, H, A, b, R: R_, wordmark, symDraw, tile, fit, bodyFont, dispFont, varOn };
  switch (k) {
    case 'capa': {
      bg(R_.primary);
      tile(g, A.patLight, 0, 0, W, H, 120, 0.06);
      const ik = inkOn(R_.primary, R_);
      symDraw(g, A, varOn(R_.primary), 90, H / 2 - 130, 230);
      wordmark(g, b, 370, H / 2 + 30, W - 440, 150, ik);
      const f = fit(g, b.tagline, W - 450, 2, (s) => bodyFont(b, s), 30, 18);
      block(f, 374, H / 2 + 92, ik, 0.85);
      break;
    }
    case 'logo': {
      bg(R_.light);
      g.strokeStyle = R_.dark; g.globalAlpha = 0.08; g.lineWidth = 1;
      for (let i = 40; i < W; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
      g.globalAlpha = 1;
      symDraw(g, A, 'pos', W / 2 - 130, 60, 260);
      wordmark(g, b, W / 2, 470, 460, 96, R_.dark, 'center');
      txt('área de respiro = altura do símbolo', W / 2, 560, bodyFont(b, 16), R_.dark, 'center', 0.55);
      break;
    }
    case 'lockup': {
      bg(R_.dark);
      symDraw(g, A, 'light', 50, 110, 130);
      wordmark(g, b, 200, 215, 350, 80, R_.light);
      [[R_.light, 'pos'], [R_.primary, varOn(R_.primary)], [R_.accent, varOn(R_.accent)]].forEach(([c_, v], i) => {
        const x = 40 + i * 180;
        g.fillStyle = c_; g.fillRect(x, 330, 160, 200);
        symDraw(g, A, v, x + 30, 370, 100);
        txt(['positivo', 'sobre a cor', 'sobre o acento'][i], x + 80, 512, bodyFont(b, 14), inkOn(c_, R_), 'center', 0.8);
      });
      break;
    }
    case 'paleta': {
      const cw = W / 5, pad = 22, inner = cw - pad * 2;
      b.palette.forEach((p, i) => {
        g.fillStyle = p.hex; g.fillRect(i * cw, 0, cw + 1, H);
        const ik = inkOn(p.hex, R_);
        const x = i * cw + pad;
        const nf = fit(g, p.name, inner, 2, (s) => dispFont(b, s, 400), 40, 18);
        block(nf, x, H - 150 - (nf.ls.length - 1) * nf.lh, ik);
        const rgb = hexRgb(p.hex), cm = cmyk(p.hex);
        const small = fit(g, 'CMYK ' + cm.join(' '), inner, 1, (s) => bodyFont(b, s), 15, 10).size;
        txt(p.hex.toUpperCase(), x, H - 104, bodyFont(b, 18, 700), ik);
        txt('RGB ' + rgb.join(' '), x, H - 78, bodyFont(b, small), ik, 'left', 0.85);
        txt('CMYK ' + cm.join(' '), x, H - 54, bodyFont(b, small), ik, 'left', 0.85);
        if (p.role) { const rf = fit(g, p.role, inner, 2, (s) => bodyFont(b, s), 14, 10); block(rf, x, 44, ik, 0.7); }
      });
      break;
    }
    case 'tipografia': {
      bg(R_.light);
      txt('Aa', 36, 300, dispFont(b, 280), R_.dark);
      txt('títulos', 380, 120, bodyFont(b, 15), R_.primary);
      txt(b.fonts.display, 380, 152, bodyFont(b, 22, 700), R_.dark);
      txt('texto', 380, 210, bodyFont(b, 15), R_.primary);
      txt(b.fonts.body, 380, 242, bodyFont(b, 22, 700), R_.dark);
      block(fit(g, b.tagline, 520, 2, (s) => dispFont(b, s), 40, 22), 40, 390, R_.dark);
      g.font = bodyFont(b, 19);
      g.globalAlpha = 0.75; g.fillStyle = R_.dark;
      lines(g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !?&', 520, 3).forEach((l, i) => g.fillText(l, 40, 500 + i * 28));
      g.globalAlpha = 1;
      break;
    }
    case 'padrao': bg(R_.light); tile(g, A.pat, 0, 0, W, H, 100); break;
    case 'icones': {
      bg(R_.light);
      A.icons.slice(0, 6).forEach((im, i) => {
        const cx = 110 + (i % 3) * 190, cy = 150 + Math.floor(i / 3) * 220;
        if (im) g.drawImage(im, cx - 55, cy - 55, 110, 110);
        txt(b.icons[i].name, cx, cy + 95, bodyFont(b, 17), R_.dark, 'center', 0.7);
      });
      break;
    }
    case 'voz': {
      bg(R_.accent);
      const ik = inkOn(R_.accent, R_);
      const hf = fit(g, b.voice.headline, 520, 3, (s) => dispFont(b, s), 66, 34);
      block(hf, 40, 120, ik);
      let y = 120 + hf.ls.length * hf.lh + 20;
      b.voice.slogans.forEach((s_) => { const sf = fit(g, '— ' + s_, 520, 2, (s) => bodyFont(b, s), 24, 15); block(sf, 40, y, ik, 0.9); y += sf.ls.length * sf.lh + 8; });
      const cf = fit(g, b.voice.cta, 460, 1, (s) => bodyFont(b, s, 700), 22, 14);
      g.fillStyle = ik; g.globalAlpha = 0.9;
      roundRect(g, 40, H - 110, Math.min(520, g.measureText(cf.ls[0]).width + 48), 56, 28); g.fill();
      g.globalAlpha = 1;
      txt(cf.ls[0], 64, H - 73, bodyFont(b, cf.size, 700), R_.accent);
      break;
    }
    case 'mundo': {
      // foto do mundo da marca, gerada por IA, com a assinatura aplicada por cima
      const ph = photoNow(b, 'mundo', 0);
      if (ph) {
        cover(g, ph, 0, 0, W, H);
        const gr = g.createLinearGradient(0, 0, W * 0.7, 0);
        gr.addColorStop(0, 'rgba(10,8,6,.72)'); gr.addColorStop(1, 'rgba(10,8,6,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        symDraw(g, A, 'light', 64, H - 300, 120);
        wordmark(g, b, 64, H - 110, W * 0.45, 96, R_.light);
        const f = fit(g, b.tagline, W * 0.42, 2, (s) => bodyFont(b, s), 26, 16);
        block(f, 66, H - 66, R_.light, 0.9);
      } else {
        // sem foto (ainda chegando, ou sem rede): cartaz com o símbolo grande e o padrão
        bg(R_.dark);
        tile(g, A.patLight, 0, 0, W, H, 90, 0.08);
        g.save(); g.globalAlpha = 0.9; symDraw(g, A, varOn(R_.dark), W - 520, -40, 680); g.restore();
        wordmark(g, b, 64, H - 150, W * 0.5, 110, R_.light);
        const f = fit(g, b.tagline, W * 0.45, 2, (s) => bodyFont(b, s), 28, 16);
        block(f, 66, H - 96, R_.light, 0.85);
      }
      break;
    }
    case 'prancha1': case 'prancha2': case 'prancha3': case 'prancha4': {
      // prancha desenhada pela IA com o logo como referência; até chegar, um esboço da grade
      const ph = boardNow(b, +k.slice(-1) - 1);
      if (ph) { cover(g, ph, 0, 0, W, H); break; }
      bg(R_.light);
      const cols = 4, rows = 3, gap = 10, cw = (W - gap * (cols + 1)) / cols, ch = (H - gap * (rows + 1)) / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        g.fillStyle = b.palette[(r * cols + c + +k.slice(-1)) % 5].hex; g.globalAlpha = 0.18;
        g.fillRect(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch);
      }
      g.globalAlpha = 1;
      symDraw(g, A, 'pos', W / 2 - 70, H / 2 - 120, 140);
      txt(b.prancha === 'falhou' ? 'a prancha não veio · gere de novo' : 'a IA está desenhando esta prancha…', W / 2, H / 2 + 70, bodyFont(b, 24), R_.dark, 'center', 0.75);
      break;
    }
    case 'foto': {
      // sem chave a IA gratuita faz uma imagem só, já em grade; com chave, quatro fotos separadas
      const col = photoNow(b, 'collage', 0);
      const ph = col ? [] : [0, 1, 2, 3].map((i) => photoNow(b, 'foto', i));
      if (col || ph.some(Boolean)) {
        // moodboard: quatro fotos da IA, com as cores da paleta onde a foto ainda não chegou
        bg(R_.light);
        if (col) cover(g, col, 0, 0, W, H);
        const gap = 8, cw = (W - gap * 3) / 2, ch = (H - gap * 3) / 2;
        ph.forEach((im, i) => {
          const x = gap + (i % 2) * (cw + gap), y = gap + Math.floor(i / 2) * (ch + gap);
          if (im) cover(g, im, x, y, cw, ch); else { g.fillStyle = b.palette[i % 5].hex; g.fillRect(x, y, cw, ch); }
        });
        const gr = g.createLinearGradient(0, H * 0.6, 0, H);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,14,10,.8)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const f = fit(g, b.photo, W - 80, 3, (s) => bodyFont(b, s), 22, 14);
        block(f, 40, H - 36 - (f.ls.length - 1) * f.lh, '#fbf6ef');
        break;
      }
      if (A.uRef) cover(g, A.uRef, 0, 0, W, H);
      else g.drawImage(artCanvas(W, H, [R_.primary, R_.accent, R_.second, R_.light], 1, shadeHex(R_.light, -0.05)), 0, 0);
      const gr = g.createLinearGradient(0, H * 0.45, 0, H);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,14,10,.78)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const f = fit(g, b.photo, W - 80, 4, (s) => bodyFont(b, s), 24, 15);
      block(f, 40, H - 40 - (f.ls.length - 1) * f.lh, '#fbf6ef');
      break;
    }
    default:
      if (MOCKUPS[k]) await MOCKUPS[k](ctx);
  }
  g.restore();
}

export { bodyFont, cover, dispFont, drawPanel, fit, lines, prepare, symDraw, tile, wordmark };
