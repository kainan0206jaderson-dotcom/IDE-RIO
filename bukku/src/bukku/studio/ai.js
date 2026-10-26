/* ================= IA gratuita (Pollinations) =================
 * Fora do claude.ai o estúdio usa a Pollinations, que serve texto e imagem
 * sem custo e sem cadastro direto do navegador:
 *   - texto:  text.pollinations.ai/openai  (formato OpenAI, resposta em JSON)
 *   - imagem: image.pollinations.ai/prompt/{texto}
 * Com uma chave gratuita de enter.pollinations.ai (opcional) o estúdio passa
 * para gen.pollinations.ai, que tem modelos melhores e limites maiores.
 * A chave fica só no navegador de quem colou.
 */
const KEY_LS = 'bukku.pollen';
const ANON_TEXT = 'https://text.pollinations.ai/openai';
const ANON_IMG = 'https://image.pollinations.ai/prompt/';
const GEN = 'https://gen.pollinations.ai';
/* Ponte do BUKKU (bukku/proxy/worker.js): um Cloudflare Worker que guarda a
 * chave do dono, para que qualquer visitante use os modelos melhores sem entrar
 * com conta. Vazio = sem ponte. A chave da própria pessoa, se houver, vem antes. */
const PROXY = 'https://bukku-ponte.kainan0206jaderson.workers.dev';
/** Para onde vão os pedidos com chave: a conta da pessoa ou a ponte. */
let proxyOff = false; // a ponte avisou que este visitante usou a cota do dia
const route = () => { const k = getKey(); return k ? { base: GEN, headers: auth(k) } : PROXY && !proxyOff ? { base: PROXY.replace(/\/$/, ''), headers: {} } : null; };
/** true quando há modelos melhores disponíveis (chave própria ou ponte). */
const hasGen = () => !!route();
/** Ponte fora do ar ou sem chave configurada: desliga e segue com a IA gratuita. */
const proxyFailed = (r) => !getKey() && PROXY && !proxyOff && (r.status === 402 || r.status === 403 || r.status >= 500) && (proxyOff = true);
// sem saldo, a Pollinations responde 200 com um aviso no lugar da resposta
const NO_CREDITS = /enough credits|top up|complete a quest/i;
// modelos por qualidade; a lista cai para o próximo se um não responder
const TEXT_MODELS = {
  quick: ['openai', 'openai-fast'],
  default: ['deepseek/deepseek-v4.1-flash', 'glm-5.3', 'openai'],
  complex: ['kimi-k3', 'glm-5.3', 'deepseek/deepseek-v4.1-flash', 'openai'],
};
const IMG_MODELS = { quick: 'zimage', default: 'flux', complex: 'gpt-image' };

function getKey() {
  try { return (sessionStorage.getItem(KEY_SS) || localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; }
}

/* ---------- Conectar Pollinations (OAuth com PKCE, sem servidor) ----------
 * A pessoa entra com a conta dela e autoriza o BUKKU a gastar o Pollen gratuito
 * dela; a chave volta para esta aba e fica só no sessionStorage, como pede a
 * documentação. APP_KEY é a chave publicável do app (pk_), criada em
 * enter.pollinations.ai > Keys (Publishable), com o endereço do BUKKU como Redirect URI.
 * O fluxo exige essa chave: enquanto ela estiver vazia, o botão fica escondido e
 * a pessoa ainda pode colar uma chave sk_ na ficha. */
const APP_KEY = 'pk_YfVvT4gDP0bwvrEe';
const canConnect = () => !!APP_KEY;
const KEY_SS = 'bukku.pollen.session';
const AUTH = 'https://enter.pollinations.ai/authorize';
const TOKEN = 'https://enter.pollinations.ai/api/oauth/token';
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const redirectURI = () => location.origin + location.pathname;
async function connectPollinations() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
  sessionStorage.setItem('bukku.oauth', JSON.stringify({ verifier, state }));
  const q = new URLSearchParams({ response_type: 'code', redirect_uri: redirectURI(), scope: 'usage', models: 'image,text', expiry: '30', budget: '20', state, code_challenge: challenge, code_challenge_method: 'S256' });
  if (APP_KEY) q.set('client_id', APP_KEY);
  location.href = AUTH + '?' + q;
}
/** Na volta do consentimento: troca o código pela chave e limpa o endereço. Devolve true se conectou. */
async function finishConnect() {
  const u = new URL(location.href);
  const code = u.searchParams.get('code'), state = u.searchParams.get('state');
  if (!code) return false;
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('bukku.oauth') || 'null'); } catch (e) {}
  ['code', 'state', 'error', 'error_description'].forEach((k) => u.searchParams.delete(k));
  history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
  if (!saved || saved.state !== state) return false;
  sessionStorage.removeItem('bukku.oauth');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectURI(), code_verifier: saved.verifier });
  if (APP_KEY) body.set('client_id', APP_KEY);
  const r = await fetch(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!r.ok) return false;
  const j = await r.json();
  if (!j.access_token) return false;
  sessionStorage.setItem(KEY_SS, j.access_token);
  return true;
}
function disconnect() { try { sessionStorage.removeItem(KEY_SS); localStorage.removeItem(KEY_LS); } catch (e) {} }
const connectedBySession = () => { try { return !!sessionStorage.getItem(KEY_SS); } catch (e) { return false; } };
function setKey(k) { try { if (k) localStorage.setItem(KEY_LS, k.trim()); else localStorage.removeItem(KEY_LS); } catch (e) {} }
const auth = (k) => (k ? { Authorization: 'Bearer ' + k } : {});
const wait = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(abortErr()); }, { once: true });
});
const abortErr = () => Object.assign(new Error('cancelled'), { code: 'cancelled' });

/** Sem chave a Pollinations libera uma resposta a cada 30 s por visitante e responde 402/429
 *  com "Retry after Ns". Devolve quantos ms esperar, ou 0 se não for limite. */
async function retryAfter(r) {
  if (r.status !== 402 && r.status !== 429 && r.status !== 503) return 0;
  let msg = '';
  try { msg = await r.text(); } catch (e) {}
  // cota diária da ponte: volta para a IA gratuita sem chave em vez de esperar
  if (r.status === 429 && /"daily"/.test(msg)) { proxyOff = true; return -1; }
  if (r.status !== 429 && !/FREE_LIMIT|limit|retry after/i.test(msg)) return 0;
  const m = /retry after (\d+)\s*s/i.exec(msg) || [0, r.headers.get('retry-after')];
  return Math.min(45, Math.max(3, +m[1] || 30)) * 1000 + 800;
}

/** Junta o sinal de quem chamou com um tempo limite. */
function timed(signal, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  signal?.addEventListener('abort', () => ctl.abort(), { once: true });
  return { signal: ctl.signal, done: () => clearTimeout(t) };
}

/** Tira o primeiro objeto JSON de uma resposta, mesmo com cercas de código ou texto em volta. */
function parseJSON(text) {
  if (!text) return null;
  const s = String(text).replace(/```(?:json)?/gi, '');
  const i = s.indexOf('{');
  if (i < 0) return null;
  let depth = 0, str = false, esc = false;
  for (let j = i; j < s.length; j++) {
    const ch = s[j];
    if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') str = false; continue; }
    if (ch === '"') str = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) { try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; } }
  }
  return null;
}

/** Pede um JSON à IA gratuita. Devolve o objeto ou lança um erro com code. */
async function textJSON(prompt, { quality = 'default', signal, onPhase } = {}) {
  const gen = route();
  const tries = gen ? TEXT_MODELS[quality] || TEXT_MODELS.default : ['openai'];
  let last = null;
  for (const model of tries) {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (signal?.aborted) throw abortErr();
      onPhase?.(model, 0);
      const t = timed(signal, quality === 'complex' ? 180000 : 120000);
      try {
        const r = await fetch(gen ? gen.base + '/v1/chat/completions' : ANON_TEXT, {
          method: 'POST', signal: t.signal,
          headers: { 'Content-Type': 'application/json', ...(gen ? gen.headers : {}) },
          body: JSON.stringify({
            model, messages: [
              { role: 'system', content: 'Você responde somente com um objeto JSON válido, sem texto antes ou depois.' },
              { role: 'user', content: prompt }],
            response_format: { type: 'json_object' }, seed: (Math.random() * 1e9) | 0,
            // os modelos gratuitos raciocinam antes de responder; sem folga de tokens o JSON sai vazio
            max_tokens: 9000, reasoning_effort: quality === 'complex' ? 'medium' : 'low',
          }),
        });
        const ra = await retryAfter(r);
        if (ra < 0 || proxyFailed(r)) return textJSON(prompt, { quality, signal, onPhase });
        if (ra) { last = Object.assign(new Error('rate'), { code: 'rate_limited' }); onPhase?.(model, ra); await wait(ra, signal); continue; }
        if (r.status === 401 || r.status === 403) { last = Object.assign(new Error('key'), { code: 'bad_key' }); break; }
        if (!r.ok) { last = Object.assign(new Error('http ' + r.status), { code: 'http' }); break; }
        const j = await r.json();
        const said = j?.choices?.[0]?.message?.content;
        if (gen && typeof said === 'string' && NO_CREDITS.test(said) && !said.includes('{')) {
          if (!getKey() && !proxyOff) { proxyOff = true; return textJSON(prompt, { quality, signal, onPhase }); }
          last = Object.assign(new Error('sem saldo'), { code: 'no_pollen' }); break;
        }
        const out = parseJSON(said);
        if (out) return out;
        last = Object.assign(new Error('json'), { code: 'invalid_json' });
      } catch (e) {
        if (signal?.aborted) throw abortErr();
        if (gen && !getKey() && !proxyOff) { proxyOff = true; return textJSON(prompt, { quality, signal, onPhase }); }
        last = Object.assign(e instanceof Error ? e : new Error(String(e)), { code: e?.code || 'network' });
      } finally { t.done(); }
    }
    if (last?.code === 'bad_key' || last?.code === 'no_pollen') break;
  }
  throw last || Object.assign(new Error('falhou'), { code: 'network' });
}

/* ---------- imagens ----------
 * Sem chave a Pollinations aceita um pedido por vez de cada visitante, então a
 * fila roda em série. Com chave, três por vez. */
let running = 0;
const queue = [];
function slot() {
  const max = hasGen() ? 3 : 1;
  if (running < max) { running++; return Promise.resolve(); }
  return new Promise((res) => queue.push(res));
}
function release() { running--; const next = queue.shift(); if (next) { running++; next(); } }

/** Endereço da imagem; o mesmo texto, tamanho e semente dão sempre a mesma imagem. */
function imageURL(prompt, { w = 1024, h = 1024, seed = 1, quality = 'default', model = null } = {}) {
  const gen = route();
  const q = new URLSearchParams({ width: String(w), height: String(h), seed: String(seed), nologo: 'true' });
  if (gen) { q.set('model', model || IMG_MODELS[quality] || 'flux'); return gen.base + '/image/' + encodeURIComponent(prompt) + '?' + q; }
  q.set('model', 'flux');
  return ANON_IMG + encodeURIComponent(prompt) + '?' + q;
}

const memo = new Map();
const ready = new Map();
/** A imagem, se já chegou; senão null. */
const peekImage = (prompt, opts = {}) => ready.get(imageURL(prompt, opts)) || null;
/** Baixa a imagem como blob (sem sujar o canvas) e devolve um <img> pronto. */
function aiImage(prompt, opts = {}) {
  const url = imageURL(prompt, opts);
  if (memo.has(url)) return memo.get(url);
  const p = (async () => {
    await slot();
    let released = false;
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (opts.signal?.aborted) throw abortErr();
        const t = timed(opts.signal, 120000);
        try {
          const r = await fetch(url, { headers: route()?.headers || {}, signal: t.signal });
          const ra = await retryAfter(r);
          if (ra < 0 || proxyFailed(r)) { memo.delete(url); release(); released = true; return aiImage(prompt, opts); }
          if (ra || r.status >= 500) { await wait(ra || 5000 * (attempt + 1), opts.signal); continue; }
          if (!r.ok) throw Object.assign(new Error('http ' + r.status), { code: 'http' });
          const blob = await r.blob();
          if (!/^image\//.test(blob.type)) throw Object.assign(new Error('não é imagem'), { code: 'http' });
          const src = URL.createObjectURL(blob);
          const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
          ready.set(url, img);
          return img;
        } finally { t.done(); }
      }
      throw Object.assign(new Error('rate'), { code: 'rate_limited' });
    } finally { if (!released) release(); }
  })();
  memo.set(url, p);
  p.catch(() => memo.delete(url));
  return p;
}

/* ---------- pranchas com o logo como referência (só com chave) ----------
 * /v1/images/edits recebe o logo renderizado como imagem de referência, então o
 * modelo desenha cada peça com o mesmo símbolo, como os geradores de brand kit pagos. */
const BOARD_MODELS = { quick: ['gpt-image', 'kontext'], default: ['gpt-image', 'kontext'], complex: ['gpt-image-2', 'gpt-image', 'kontext'] };
const BOARD_Q = { quick: 'low', default: 'medium', complex: 'high' };
const boards = new Map();
const peekBoard = (id) => boards.get(id) || null;
/** Prancha que veio quase lisa (quadros vazios): melhor pedir de novo. */
function blankish(img) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 48, 48);
    const d = g.getImageData(0, 0, 48, 48).data; let sum = 0, sq = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const y = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; sum += y; sq += y * y; }
    return Math.sqrt(sq / n - (sum / n) ** 2) < 22;
  } catch (e) { return false; }
}
function aiBoard(id, prompt, refs, { quality = 'default', size = '1536x1024', seed = 1, signal } = {}) {
  if (boards.has(id)) return Promise.resolve(boards.get(id));
  const gen = route();
  if (!gen) return Promise.reject(Object.assign(new Error('sem chave'), { code: 'no_key' }));
  return (async () => {
    await slot();
    try {
      let last = null;
      for (const model of BOARD_MODELS[quality] || BOARD_MODELS.default) {
        for (let attempt = 0; attempt < 3; attempt++) {
          if (signal?.aborted) throw abortErr();
          const t = timed(signal, 240000);
          try {
            const r = await fetch(gen.base + '/v1/images/edits', {
              method: 'POST', signal: t.signal,
              headers: { 'Content-Type': 'application/json', ...gen.headers },
              body: JSON.stringify({ model, prompt, image: [].concat(refs).map((u) => ({ image_url: u })), size, quality: BOARD_Q[quality] || 'medium', seed, response_format: 'b64_json' }),
            });
            const ra = await retryAfter(r);
            if (ra < 0 || proxyFailed(r)) throw Object.assign(new Error('cota'), { code: 'no_pollen' });
            if (ra || r.status >= 500) { await wait(ra || 6000 * (attempt + 1), signal); continue; }
            if (r.status === 401 || r.status === 403) throw Object.assign(new Error('key'), { code: 'bad_key' });
            if (!r.ok) { last = Object.assign(new Error('http ' + r.status), { code: r.status === 402 ? 'no_pollen' : 'http' }); break; }
            const j = await r.json();
            const d = j?.data?.[0];
            const src = d?.b64_json ? 'data:image/' + (d.b64_json.startsWith('/9j/') ? 'jpeg' : 'png') + ';base64,' + d.b64_json : d?.url;
            if (!src) { last = Object.assign(new Error('vazio'), { code: 'http' }); break; }
            const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
            if (blankish(img) && attempt < 2) { last = Object.assign(new Error('vazia'), { code: 'http' }); seed += 1000; continue; }
            boards.set(id, img);
            return img;
          } catch (e) {
            if (signal?.aborted) throw abortErr();
            if (e?.code === 'bad_key' || e?.code === 'no_pollen') throw e;
            last = e;
          } finally { t.done(); }
        }
      }
      throw last || Object.assign(new Error('falhou'), { code: 'http' });
    } finally { release(); }
  })();
}

/** Testa rápido se a Pollinations responde deste navegador (no claude.ai a página não alcança a rede). */
let reachP = null;
function freeAIReachable() {
  if (reachP) return reachP;
  reachP = (async () => {
    const t = timed(null, 8000);
    try { const r = await fetch('https://text.pollinations.ai/models', { signal: t.signal }); return r.ok; }
    catch (e) { return false; } finally { t.done(); }
  })();
  return reachP;
}

export { hasGen, canConnect, connectPollinations, connectedBySession, disconnect, finishConnect, aiBoard, aiImage, freeAIReachable, getKey, imageURL, parseJSON, peekBoard, peekImage, setKey, textJSON };
