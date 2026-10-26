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
const GEN_TEXT = 'https://gen.pollinations.ai/v1/chat/completions';
const GEN_IMG = 'https://gen.pollinations.ai/image/';
// modelos por qualidade; a lista cai para o próximo se um não responder
const TEXT_MODELS = {
  quick: ['openai', 'openai-fast'],
  default: ['deepseek/deepseek-v4.1-flash', 'glm-5.3', 'openai'],
  complex: ['kimi-k3', 'glm-5.3', 'deepseek/deepseek-v4.1-flash', 'openai'],
};
const IMG_MODELS = { quick: 'zimage', default: 'flux', complex: 'gpt-image' };

function getKey() { try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; } }
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
  const key = getKey();
  const tries = key ? TEXT_MODELS[quality] || TEXT_MODELS.default : ['openai'];
  let last = null;
  for (const model of tries) {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (signal?.aborted) throw abortErr();
      onPhase?.(model, 0);
      const t = timed(signal, quality === 'complex' ? 180000 : 120000);
      try {
        const r = await fetch(key ? GEN_TEXT : ANON_TEXT, {
          method: 'POST', signal: t.signal,
          headers: { 'Content-Type': 'application/json', ...auth(key) },
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
        if (ra) { last = Object.assign(new Error('rate'), { code: 'rate_limited' }); onPhase?.(model, ra); await wait(ra, signal); continue; }
        if (r.status === 401 || r.status === 403) { last = Object.assign(new Error('key'), { code: 'bad_key' }); break; }
        if (!r.ok) { last = Object.assign(new Error('http ' + r.status), { code: 'http' }); break; }
        const j = await r.json();
        const out = parseJSON(j?.choices?.[0]?.message?.content);
        if (out) return out;
        last = Object.assign(new Error('json'), { code: 'invalid_json' });
      } catch (e) {
        if (signal?.aborted) throw abortErr();
        last = Object.assign(e instanceof Error ? e : new Error(String(e)), { code: e?.code || 'network' });
      } finally { t.done(); }
    }
    if (last?.code === 'bad_key') break;
  }
  throw last || Object.assign(new Error('falhou'), { code: 'network' });
}

/* ---------- imagens ----------
 * Sem chave a Pollinations aceita um pedido por vez de cada visitante, então a
 * fila roda em série. Com chave, três por vez. */
let running = 0;
const queue = [];
function slot() {
  const max = getKey() ? 3 : 1;
  if (running < max) { running++; return Promise.resolve(); }
  return new Promise((res) => queue.push(res));
}
function release() { running--; const next = queue.shift(); if (next) { running++; next(); } }

/** Endereço da imagem; o mesmo texto, tamanho e semente dão sempre a mesma imagem. */
function imageURL(prompt, { w = 1024, h = 1024, seed = 1, quality = 'default', model = null } = {}) {
  const key = getKey();
  const q = new URLSearchParams({ width: String(w), height: String(h), seed: String(seed), nologo: 'true' });
  if (key) { q.set('model', model || IMG_MODELS[quality] || 'flux'); return GEN_IMG + encodeURIComponent(prompt) + '?' + q; }
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
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (opts.signal?.aborted) throw abortErr();
        const t = timed(opts.signal, 120000);
        try {
          const r = await fetch(url, { headers: auth(getKey()), signal: t.signal });
          const ra = await retryAfter(r);
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
    } finally { release(); }
  })();
  memo.set(url, p);
  p.catch(() => memo.delete(url));
  return p;
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

export { aiImage, freeAIReachable, getKey, imageURL, parseJSON, peekImage, setKey, textJSON };
