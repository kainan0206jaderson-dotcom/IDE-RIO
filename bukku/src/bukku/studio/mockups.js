import { inkOn, luma, shadeHex, slugify } from './color.js';
import { makeCanvas, roundRect } from '../lib/util.js';

/* Mockups das aplicações: cada peça é desenhada num ambiente com luz de janela,
   sombra de contato, volume e textura do material, e a marca é impressa sobre o
   material (acompanha as dobras), em vez de ser colada chapada por cima. */

let noiseCv = null;
function noise() {
  if (noiseCv) return noiseCv;
  let s = 0x1234567;
  const rr = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return ((s >>> 8) & 0xff) / 255; };
  noiseCv = makeCanvas(256, 256, (g) => {
    const id = g.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = 96 + rr() * 64; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  });
  return noiseCv;
}

/** Granulação do material: papel, tecido, reboco. */
function grain(g, x, y, w, h, a = 0.08) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.globalAlpha = a; g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(noise(), 'repeat');
  g.fillRect(x, y, w, h);
  g.restore();
}

/** Parede e chão com a luz de uma janela à esquerda. horizon = y onde a parede encontra o chão. */
function room(g, W, H, wall, floor, horizon) {
  const wg = g.createLinearGradient(0, 0, W, horizon);
  wg.addColorStop(0, shadeHex(wall, 0.04)); wg.addColorStop(1, shadeHex(wall, -0.06));
  g.fillStyle = wg; g.fillRect(0, 0, W, horizon);
  // mancha de sol entrando pela janela
  g.save(); g.globalAlpha = 0.16; g.fillStyle = '#fff6e6';
  g.beginPath(); g.moveTo(W * 0.05, 0); g.lineTo(W * 0.32, 0); g.lineTo(W * 0.5, horizon); g.lineTo(W * 0.2, horizon); g.closePath(); g.fill();
  g.restore();
  grain(g, 0, 0, W, horizon, 0.07);
  if (horizon < H) {
    const fg = g.createLinearGradient(0, horizon, 0, H);
    fg.addColorStop(0, shadeHex(floor, -0.08)); fg.addColorStop(1, shadeHex(floor, 0.03));
    g.fillStyle = fg; g.fillRect(0, horizon, W, H - horizon);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, horizon, W, 3);
    grain(g, 0, horizon, W, H - horizon, 0.1);
  }
}

/** Sombra de contato: escura bem embaixo do objeto, sumindo para as bordas. */
function contact(g, cx, cy, rx, ry, a = 0.35) {
  g.save();
  g.translate(cx, cy); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, `rgba(20,12,8,${a})`); gr.addColorStop(0.6, `rgba(20,12,8,${a * 0.35})`); gr.addColorStop(1, 'rgba(20,12,8,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Sombreamento de volume dentro de uma forma. stops = [[posição, 'rgba(...)'], ...] */
function shadeIn(g, path, x0, y0, x1, y1, stops, op = 'multiply') {
  g.save(); g.clip(path); g.globalCompositeOperation = op;
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, c]) => gr.addColorStop(p, c));
  g.fillStyle = gr; g.fillRect(-2000, -2000, 6000, 6000);
  g.restore();
}

/** Logo impresso: tinta escura multiplica no material; tinta clara entra por cima, levemente translúcida. */
function printed(g, art, x, y, w, h, onDark) {
  g.save();
  g.globalCompositeOperation = onDark ? 'source-over' : 'multiply';
  g.globalAlpha = onDark ? 0.9 : 0.95;
  g.drawImage(art, x, y, w, h);
  g.restore();
}

/** Símbolo e logotipo juntos numa arte só, para imprimir nas peças. */
function lockArt(c, color, { sym = true, word = true, w = 600, h = 600 } = {}) {
  const v = luma(color) > 0.5 ? 'light' : 'dark';
  return makeCanvas(w, h, (g) => {
    if (sym) c.symDraw(g, c.A, v, w * 0.29, word ? h * 0.06 : h * 0.1, word ? w * 0.42 : w * 0.8);
    if (word) c.wordmark(g, c.b, w / 2, sym ? h * 0.82 : h * 0.62, w * 0.9, sym ? h * 0.2 : h * 0.34, color, 'center');
  });
}

const MOCKUPS = {
  /* camiseta pendurada num cabide, contra a parede */
  async camiseta(c) {
    const { g, W, H, R } = c;
    room(g, W, H, shadeHex(R.light, -0.03), R.light, H);
    // gancho e cabide
    g.strokeStyle = '#8c8680'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(300, 30); g.quadraticCurveTo(318, 34, 314, 50); g.quadraticCurveTo(310, 62, 300, 70); g.stroke();
    const tee = new Path2D('M196 118 C220 104 240 96 256 92 C270 122 330 122 344 92 C360 96 380 104 404 118 L488 186 C480 210 466 232 446 250 L408 226 C410 320 412 410 414 516 C340 530 260 530 186 516 C188 410 190 320 192 226 L154 250 C134 232 120 210 112 186 Z');
    g.save();
    g.shadowColor = 'rgba(30,18,10,.32)'; g.shadowBlur = 30; g.shadowOffsetX = 14; g.shadowOffsetY = 18;
    g.fillStyle = R.primary; g.fill(tee);
    g.restore();
    // cabide de madeira por cima dos ombros
    g.strokeStyle = '#9a6a43'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(206, 112); g.quadraticCurveTo(300, 64, 394, 112); g.stroke();
    g.strokeStyle = 'rgba(255,235,210,.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(210, 108); g.quadraticCurveTo(300, 62, 390, 108); g.stroke();
    // estampa: impressa antes das dobras, para as dobras passarem por cima dela
    const ink = inkOn(R.primary, R);
    const art = lockArt(c, ink, { w: 400, h: 400 });
    g.save(); g.clip(tee); printed(g, art, 228, 168, 144, 144, luma(ink) > luma(R.primary)); g.restore();
    // volume do tecido: bordas mais escuras, centro iluminado pela janela
    shadeIn(g, tee, 150, 0, 450, 0, [[0, 'rgba(0,0,0,.28)'], [0.3, 'rgba(0,0,0,0)'], [0.7, 'rgba(0,0,0,.04)'], [1, 'rgba(0,0,0,.3)']]);
    shadeIn(g, tee, 0, 120, 0, 530, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.18)']]);
    // dobras: desenhadas e desfocadas fora da tela, depois aplicadas dentro da camiseta
    const fold = (gg, pts, w, col) => { gg.strokeStyle = col; gg.lineWidth = w; gg.lineCap = 'round'; gg.beginPath(); gg.moveTo(...pts[0]); gg.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]); gg.stroke(); };
    const soft = (draw) => { const raw = makeCanvas(W, H, draw); return makeCanvas(W, H, (gg) => { gg.filter = 'blur(6px)'; gg.drawImage(raw, 0, 0); }); };
    const darks = soft((gg) => {
      fold(gg, [[230, 330], [250, 400], [236, 460], [250, 520]], 14, 'rgba(0,0,0,.22)');
      fold(gg, [[370, 300], [356, 380], [372, 440], [360, 520]], 12, 'rgba(0,0,0,.2)');
      fold(gg, [[196, 228], [210, 236], [220, 248], [226, 262]], 10, 'rgba(0,0,0,.25)');
      fold(gg, [[404, 228], [392, 236], [382, 248], [376, 262]], 10, 'rgba(0,0,0,.25)');
    });
    const lights = soft((gg) => {
      fold(gg, [[262, 330], [282, 400], [268, 460], [280, 520]], 10, 'rgba(255,255,255,.16)');
      fold(gg, [[340, 300], [330, 380], [344, 440], [336, 520]], 10, 'rgba(255,255,255,.14)');
    });
    g.save(); g.clip(tee);
    g.drawImage(darks, 0, 0);
    g.globalCompositeOperation = 'screen'; g.drawImage(lights, 0, 0);
    g.restore();
    // gola canelada
    g.save(); g.strokeStyle = shadeHex(R.primary, -0.12); g.lineWidth = 9;
    g.beginPath(); g.moveTo(256, 94); g.bezierCurveTo(272, 128, 328, 128, 344, 94); g.stroke(); g.restore();
    grain(g, 100, 80, 400, 460, 0.12);
  },

  /* sacola de papel no chão, encostada na parede */
  async sacola(c) {
    const { g, W, H, R } = c;
    room(g, W, H, shadeHex(R.light, -0.02), shadeHex(R.second || R.light, 0.25), 430);
    const front = new Path2D('M170 200 L400 200 L404 512 L166 512 Z');
    const side = new Path2D('M400 200 L452 186 L458 492 L404 512 Z');
    const back = new Path2D('M170 200 L222 186 L452 186 L400 200 Z');
    // sombra projetada no chão, para a direita
    g.save(); g.filter = 'blur(14px)'; g.fillStyle = 'rgba(30,18,10,.28)';
    g.beginPath(); g.moveTo(404, 512); g.lineTo(560, 470); g.lineTo(590, 520); g.lineTo(420, 540); g.closePath(); g.fill(); g.restore();
    contact(g, 312, 514, 170, 14, 0.4);
    const col = R.primary;
    g.fillStyle = shadeHex(col, -0.35); g.fill(back);
    // alças de corda
    const handle = (x0, x1, top, colr) => { g.strokeStyle = colr; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, 214); g.bezierCurveTo(x0, top, x1, top, x1, 214); g.stroke(); };
    handle(236, 334, 96, shadeHex(R.dark, 0.05));
    g.fillStyle = col; g.fill(front);
    g.fillStyle = shadeHex(col, -0.16); g.fill(side);
    handle(232, 338, 104, R.dark);
    g.save(); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(234, 212); g.bezierCurveTo(234, 108, 336, 108, 336, 212); g.stroke(); g.restore();
    // ilhoses
    [[232, 216], [338, 216]].forEach(([x, y]) => { g.fillStyle = shadeHex(col, -0.3); g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); });
    const ink = inkOn(col, R);
    const art = lockArt(c, ink, { w: 400, h: 400 });
    g.save(); g.clip(front); printed(g, art, 205, 270, 160, 160, luma(ink) > luma(col)); g.restore();
    // luz da janela no papel e vincos da sanfona
    shadeIn(g, front, 166, 0, 404, 0, [[0, 'rgba(255,250,240,.0)'], [1, 'rgba(0,0,0,.12)']]);
    shadeIn(g, front, 0, 200, 0, 512, [[0, 'rgba(0,0,0,.1)'], [0.12, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.12)']]);
    shadeIn(g, side, 400, 0, 458, 0, [[0, 'rgba(0,0,0,.15)'], [0.5, 'rgba(255,255,255,.08)'], [1, 'rgba(0,0,0,.2)']], 'source-over');
    g.save(); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(426, 194); g.lineTo(430, 470); g.lineTo(404, 512); g.stroke();
    g.beginPath(); g.moveTo(166, 470); g.lineTo(404, 470); g.stroke();
    g.restore();
    grain(g, 160, 180, 300, 340, 0.14);
  },

  /* caixa de produto sobre uma mesa de madeira */
  async embalagem(c) {
    const { g, W, H, R } = c;
    room(g, W, H, shadeHex(R.second || R.light, 0.2), '#b9875e', 360);
    // veios da madeira
    g.save(); g.globalAlpha = 0.12; g.strokeStyle = '#5a361f'; g.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) { const y = 368 + i * 9; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 2.5); g.stroke(); }
    g.restore();
    const top = [[300, 130], [470, 210], [300, 290], [130, 210]];
    const lf = [[130, 210], [300, 290], [300, 486], [130, 406]];
    const rt = [[300, 290], [470, 210], [470, 406], [300, 486]];
    const path = (pts) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
    g.save(); g.filter = 'blur(12px)'; g.fillStyle = 'rgba(25,14,8,.4)';
    g.fill(path([[130, 410], [300, 494], [520, 400], [480, 380], [300, 470]])); g.restore();
    contact(g, 300, 470, 190, 34, 0.32);
    const P = { top: path(top), lf: path(lf), rt: path(rt) };
    g.fillStyle = shadeHex(R.light, -0.01); g.fill(P.top);
    g.fillStyle = R.primary; g.fill(P.lf);
    g.fillStyle = R.dark; g.fill(P.rt);
    // padrão no lado iluminado
    g.save(); g.clip(P.lf); g.globalAlpha = 0.22; c.tile(g, c.A.patLight, 130, 200, 170, 290, 56); g.restore();
    // rótulo na frente, na perspectiva da face
    g.save(); g.setTransform(1.7, 0.8, 0, 1.96, 130, 210);
    const ink = inkOn(R.primary, R);
    c.symDraw(g, c.A, luma(ink) > 0.5 ? 'light' : 'dark', 25, 14, 50);
    // o nome já está na face escura; aqui entra só a linha do produto, quando ela diz outra coisa
    const pk = String(c.b.applications.packaging || '').trim();
    if (pk && slugify(pk) !== slugify(c.b.name)) {
      g.textAlign = 'center';
      const lbl = c.fit(g, pk, 90, 1, (s) => c.bodyFont(c.b, s, 700), 9, 5);
      g.font = c.bodyFont(c.b, lbl.size, 700); g.fillStyle = ink; g.fillText(lbl.ls[0], 50, 82);
    }
    g.restore();
    // logotipo de lado na face escura
    g.save(); g.setTransform(1.7, -0.8, 0, 1.96, 300, 290);
    c.wordmark(g, c.b, 50, 50, 84, 18, R.light, 'center');
    g.restore();
    // luz: topo claro, faces com gradiente, arestas com brilho
    shadeIn(g, P.top, 130, 130, 470, 290, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(0,0,0,.06)']], 'source-over');
    shadeIn(g, P.lf, 130, 210, 300, 486, [[0, 'rgba(255,255,255,.08)'], [1, 'rgba(0,0,0,.2)']]);
    shadeIn(g, P.rt, 300, 210, 470, 486, [[0, 'rgba(0,0,0,.05)'], [1, 'rgba(0,0,0,.3)']]);
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(130, 210); g.lineTo(300, 290); g.lineTo(470, 210); g.moveTo(300, 290); g.lineTo(300, 486); g.stroke();
    // emenda da tampa
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(130, 236); g.lineTo(300, 316); g.lineTo(470, 236); g.stroke();
    grain(g, 120, 120, 360, 380, 0.1);
  },

  /* papelaria vista de cima, sobre a mesa */
  async papelaria(c) {
    const { g, W, H, R, b } = c;
    g.fillStyle = shadeHex(R.light, -0.1); g.fillRect(0, 0, W, H);
    grain(g, 0, 0, W, H, 0.16);
    const vg = g.createRadialGradient(W * 0.3, H * 0.25, 40, W * 0.5, H * 0.5, W * 0.8);
    vg.addColorStop(0, 'rgba(255,248,236,.25)'); vg.addColorStop(1, 'rgba(20,12,8,.25)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const sheet = (x, y, w, h, rot, fill, draw) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.shadowColor = 'rgba(25,14,8,.3)'; g.shadowBlur = 18; g.shadowOffsetX = 6; g.shadowOffsetY = 10;
      g.fillStyle = fill; g.fillRect(-w / 2, -h / 2, w, h);
      g.shadowColor = 'transparent';
      draw(w, h);
      grain(g, -w / 2, -h / 2, w, h, 0.08);
      const gl = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      gl.addColorStop(0, 'rgba(255,255,255,.12)'); gl.addColorStop(1, 'rgba(0,0,0,.06)');
      g.fillStyle = gl; g.fillRect(-w / 2, -h / 2, w, h);
      g.restore();
    };
    // papel timbrado
    sheet(210, 270, 300, 424, -0.06, '#fbf8f2', (w, h) => {
      c.symDraw(g, c.A, 'pos', -w / 2 + 24, -h / 2 + 24, 38);
      c.wordmark(g, b, -w / 2 + 72, -h / 2 + 54, 150, 24, R.dark);
      g.fillStyle = R.primary; g.fillRect(-w / 2 + 24, -h / 2 + 76, w - 48, 2);
      g.fillStyle = 'rgba(40,30,25,.18)';
      for (let i = 0; i < 12; i++) g.fillRect(-w / 2 + 24, -h / 2 + 110 + i * 18, (w - 48) * (i % 4 === 3 ? 0.6 : 1), 4);
      g.fillStyle = R.accent; g.fillRect(-w / 2, h / 2 - 10, w, 10);
    });
    // cartões: verso na cor e frente clara
    sheet(430, 380, 220, 128, 0.12, R.primary, () => c.symDraw(g, c.A, c.varOn(R.primary), -40, -40, 80));
    sheet(440, 210, 220, 128, -0.1, R.light, (w, h) => {
      c.wordmark(g, b, -w / 2 + 18, -12, 140, 26, R.dark);
      g.font = c.bodyFont(b, 11, 700); g.fillStyle = R.dark; g.fillText('seu nome · cargo', -w / 2 + 18, 18);
      g.font = c.bodyFont(b, 10); g.globalAlpha = 0.7; g.fillText('@' + slugify(b.name).replace(/-/g, ''), -w / 2 + 18, 36); g.globalAlpha = 1;
    });
    // lápis
    g.save(); g.translate(470, 520); g.rotate(-0.5);
    g.shadowColor = 'rgba(25,14,8,.3)'; g.shadowBlur = 8; g.shadowOffsetY = 5;
    g.fillStyle = R.accent; g.fillRect(-120, -7, 200, 14);
    g.shadowColor = 'transparent';
    g.fillStyle = '#e8c9a0'; g.beginPath(); g.moveTo(80, -7); g.lineTo(108, 0); g.lineTo(80, 7); g.fill();
    g.fillStyle = '#2b2522'; g.beginPath(); g.moveTo(100, -2); g.lineTo(108, 0); g.lineTo(100, 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-120, -7, 200, 4);
    g.restore();
  },

  /* fachada de loja na rua */
  async fachada(c) {
    const { g, W, H, R, b } = c;
    const sky = g.createLinearGradient(0, 0, 0, 120);
    sky.addColorStop(0, '#cfe0ea'); sky.addColorStop(1, '#f1ede4');
    g.fillStyle = sky; g.fillRect(0, 0, W, 120);
    // prédio
    g.fillStyle = shadeHex(R.light, -0.06); g.fillRect(0, 40, W, 500);
    grain(g, 0, 40, W, 500, 0.14);
    g.fillStyle = shadeHex(R.light, -0.14); g.fillRect(0, 40, W, 16);
    g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, 56, W, 6);
    // calçada
    const sw = g.createLinearGradient(0, 540, 0, H);
    sw.addColorStop(0, '#b3aba1'); sw.addColorStop(1, '#cfc8be');
    g.fillStyle = sw; g.fillRect(0, 540, W, 60);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.5;
    for (let x = -200; x < W + 200; x += 110) { g.beginPath(); g.moveTo(x + 40, 540); g.lineTo(x - 30, H); g.stroke(); }
    grain(g, 0, 540, W, 60, 0.18);
    // letreiro
    g.save(); g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 16; g.shadowOffsetY = 8;
    g.fillStyle = R.dark; g.fillRect(220, 110, 800, 120); g.restore();
    shadeIn(g, new Path2D('M220 110 h800 v120 h-800 Z'), 0, 110, 0, 230, [[0, 'rgba(255,255,255,.1)'], [1, 'rgba(0,0,0,.2)']], 'source-over');
    g.save(); g.shadowColor = shadeHex(R.light, 0.1); g.shadowBlur = 12;
    c.wordmark(g, b, 620, 200, 640, 78, R.light, 'center'); g.restore();
    // toldo
    const n = 14, aw = 800 / n;
    for (let i = 0; i < n; i++) {
      const x = 220 + i * aw;
      g.fillStyle = i % 2 ? R.light : R.primary;
      g.beginPath(); g.moveTo(x, 240); g.lineTo(x + aw, 240); g.lineTo(x + aw + 6, 300); g.arc(x + aw / 2 + 3, 300, aw / 2 + 3, 0, Math.PI); g.closePath(); g.fill();
    }
    const awning = new Path2D('M220 240 H1020 L1026 320 H214 Z');
    shadeIn(g, awning, 0, 240, 0, 330, [[0, 'rgba(0,0,0,.18)'], [0.5, 'rgba(255,255,255,.0)'], [1, 'rgba(0,0,0,.12)']]);
    // sombra do toldo na parede
    g.save(); g.filter = 'blur(10px)'; g.fillStyle = 'rgba(20,12,8,.28)'; g.fillRect(226, 322, 790, 34); g.restore();
    // vitrine com reflexo e luz quente de dentro
    const win = new Path2D('M250 360 H600 V540 H250 Z');
    const inside = g.createLinearGradient(0, 360, 0, 540);
    inside.addColorStop(0, '#3a2a20'); inside.addColorStop(1, '#6b4a33');
    g.fillStyle = inside; g.fill(win);
    g.save(); g.clip(win);
    const glow = g.createRadialGradient(420, 470, 10, 420, 470, 220);
    glow.addColorStop(0, 'rgba(255,200,130,.55)'); glow.addColorStop(1, 'rgba(255,200,130,0)');
    g.fillStyle = glow; g.fillRect(250, 360, 350, 180);
    c.symDraw(g, c.A, 'light', 360, 395, 120);
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.beginPath(); g.moveTo(270, 360); g.lineTo(360, 360); g.lineTo(270, 470); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(420, 360); g.lineTo(450, 360); g.lineTo(330, 540); g.lineTo(300, 540); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = R.dark; g.lineWidth = 8; g.stroke(win);
    // porta
    g.fillStyle = R.primary; g.fillRect(640, 350, 170, 190);
    shadeIn(g, new Path2D('M640 350 h170 v190 h-170 Z'), 640, 0, 810, 0, [[0, 'rgba(0,0,0,.05)'], [1, 'rgba(0,0,0,.22)']]);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(660, 370, 130, 70);
    g.fillStyle = R.accent; g.beginPath(); g.arc(790, 450, 7, 0, 7); g.fill();
    // vaso com planta
    contact(g, 900, 540, 60, 8, 0.4);
    g.fillStyle = '#a5603f'; g.beginPath(); g.moveTo(870, 480); g.lineTo(930, 480); g.lineTo(920, 540); g.lineTo(880, 540); g.closePath(); g.fill();
    ['#5f6f45', '#73834f', '#566640'].forEach((cl, i) => { g.fillStyle = cl; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(880 + k * 9 + i * 4, 455 - (k % 3) * 20 - i * 8, 16, 28, (k - 3) * 0.3, 0, 7); g.fill(); } });
    // número
    const sig = String(b.applications.signage || b.name);
    const f = c.fit(g, sig, 160, 1, (s) => c.bodyFont(b, s, 700), 18, 11);
    // placa ao lado da porta
    g.font = c.bodyFont(b, f.size, 700);
    const pw_ = g.measureText(f.ls[0]).width + 28;
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
    g.fillStyle = R.light; roundRect(g, 1030, 392, pw_, 40, 6); g.fill(); g.restore();
    g.fillStyle = R.dark; g.fillText(f.ls[0], 1044, 418);
  },

  /* post na tela de um celular sobre a mesa */
  async social(c) {
    const { g, W, H, R, b } = c;
    g.fillStyle = shadeHex(R.light, -0.07); g.fillRect(0, 0, W, H);
    grain(g, 0, 0, W, H, 0.12);
    const vg = g.createLinearGradient(0, 0, W, H);
    vg.addColorStop(0, 'rgba(255,248,236,.2)'); vg.addColorStop(1, 'rgba(20,12,8,.18)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.save(); g.translate(300, 300); g.rotate(-0.08);
    const pw = 300, ph = 560;
    g.save(); g.shadowColor = 'rgba(20,12,8,.45)'; g.shadowBlur = 40; g.shadowOffsetX = 18; g.shadowOffsetY = 24;
    g.fillStyle = '#1d1b1c'; roundRect(g, -pw / 2, -ph / 2, pw, ph, 42); g.fill(); g.restore();
    g.fillStyle = '#fbfaf7'; roundRect(g, -pw / 2 + 10, -ph / 2 + 10, pw - 20, ph - 20, 34); g.fill();
    g.fillStyle = '#1d1b1c'; roundRect(g, -36, -ph / 2 + 18, 72, 18, 9); g.fill();
    const sx = -pw / 2 + 10, sy = -ph / 2 + 50, sw = pw - 20;
    // cabeçalho do perfil
    g.fillStyle = R.primary; g.beginPath(); g.arc(sx + 26, sy + 18, 14, 0, 7); g.fill();
    c.symDraw(g, c.A, c.varOn(R.primary), sx + 16, sy + 8, 20);
    const handle = '@' + slugify(b.name).replace(/-/g, '');
    g.font = c.bodyFont(b, 12, 700); g.fillStyle = '#1d1b1c'; g.fillText(handle.slice(0, 22), sx + 48, sy + 23);
    // o post
    const py = sy + 42;
    g.fillStyle = R.primary; g.fillRect(sx, py, sw, sw);
    g.save(); g.beginPath(); g.rect(sx, py, sw, sw); g.clip(); c.tile(g, c.A.patLight, sx, py, sw, sw, 48, 0.12); g.restore();
    const ik = inkOn(R.primary, R);
    c.symDraw(g, c.A, c.varOn(R.primary), sx + 18, py + 18, 44);
    const f = c.fit(g, b.applications.social, sw - 40, 4, (s) => c.dispFont(b, s), 30, 15);
    g.fillStyle = ik; g.font = c.dispFont(b, f.size);
    const ty = py + sw - 24 - (f.ls.length - 1) * f.lh;
    f.ls.forEach((l, i) => g.fillText(l, sx + 20, ty + i * f.lh));
    // ações
    const ay = py + sw + 26;
    g.strokeStyle = '#1d1b1c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx + 22, ay + 4); g.bezierCurveTo(sx + 10, ay - 8, sx + 12, ay - 16, sx + 22, ay - 9); g.bezierCurveTo(sx + 32, ay - 16, sx + 34, ay - 8, sx + 22, ay + 4); g.stroke();
    g.beginPath(); g.arc(sx + 54, ay - 4, 9, 0.6, Math.PI * 2.2); g.stroke();
    g.beginPath(); g.moveTo(sx + 76, ay - 12); g.lineTo(sx + 96, ay - 4); g.lineTo(sx + 76, ay + 4); g.closePath(); g.stroke();
    g.font = c.bodyFont(b, 11, 700); g.fillStyle = '#1d1b1c'; g.fillText('1.204 curtidas', sx + 12, ay + 26);
    g.restore();
    // reflexo no vidro
    g.save(); g.globalAlpha = 0.08; g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(170, 20); g.lineTo(300, 20); g.lineTo(200, 580); g.lineTo(140, 580); g.closePath(); g.fill(); g.restore();
  },
};

export { MOCKUPS };
