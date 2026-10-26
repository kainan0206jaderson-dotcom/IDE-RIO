/* ================= ponte do BUKKU para a Pollinations =================
 * Cloudflare Worker gratuito. Guarda a chave secreta (sk_) da conta do dono e
 * repassa os pedidos do estúdio para gen.pollinations.ai, então quem usa o BUKKU
 * não precisa entrar com conta nenhuma. A chave nunca chega ao navegador.
 *
 * Variáveis (Settings > Variables and Secrets do Worker):
 *   POLLEN_KEY  secreta: a chave sk_ da conta Pollinations do dono
 *   ORIGINS     texto: sites que podem usar a ponte, separados por vírgula
 *   DAILY       texto, opcional: pedidos por visitante por dia (padrão 60)
 * Binding opcional: KV "LIMITS", para o limite diário valer entre servidores.
 */
const UP = 'https://gen.pollinations.ai';
const TEXT_MODELS = ['openai', 'openai-fast', 'deepseek/deepseek-v4.1-flash', 'glm-5.3', 'kimi-k3'];
const IMAGE_MODELS = ['flux', 'zimage', 'gpt-image', 'gpt-image-2', 'kontext'];
const mem = new Map();

function cors(origin, env) {
  const ok = (env.ORIGINS || 'https://kainan0206jaderson-dotcom.github.io').split(',').map((s) => s.trim());
  const allow = ok.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  return { allow, headers: allow ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {} };
}
const json = (status, obj, h) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...h } });

/** Conta um pedido do visitante no dia; devolve false se passou do limite. */
async function spend(env, ip, cost) {
  const max = Number(env.DAILY) || 60;
  const k = new Date().toISOString().slice(0, 10) + ':' + ip;
  let n = env.LIMITS ? Number(await env.LIMITS.get(k)) || 0 : mem.get(k) || 0;
  if (n + cost > max) return false;
  n += cost;
  if (env.LIMITS) await env.LIMITS.put(k, String(n), { expirationTtl: 90000 });
  else { if (mem.size > 5000) mem.clear(); mem.set(k, n); }
  return true;
}

export default {
  async fetch(req, env) {
    const { allow, headers } = cors(req.headers.get('Origin'), env);
    if (req.method === 'OPTIONS') return new Response(null, { status: allow ? 204 : 403, headers });
    if (!allow) return json(403, { error: 'origem não permitida' }, headers);
    if (!env.POLLEN_KEY) return json(500, { error: 'POLLEN_KEY não configurada' }, headers);
    const url = new URL(req.url);
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    let upReq;
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      const body = await req.json().catch(() => null);
      if (!body || !TEXT_MODELS.includes(body.model)) return json(400, { error: 'modelo não permitido' }, headers);
      body.max_tokens = Math.min(Number(body.max_tokens) || 4000, 9000);
      if (!(await spend(env, ip, 1))) return json(429, { error: 'daily' }, headers);
      upReq = new Request(UP + url.pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else if (req.method === 'POST' && url.pathname === '/v1/images/edits') {
      const body = await req.json().catch(() => null);
      if (!body || !IMAGE_MODELS.includes(body.model)) return json(400, { error: 'modelo não permitido' }, headers);
      if (!(await spend(env, ip, 3))) return json(429, { error: 'daily' }, headers);
      upReq = new Request(UP + url.pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else if (req.method === 'GET' && url.pathname.startsWith('/image/')) {
      if (!IMAGE_MODELS.includes(url.searchParams.get('model') || 'flux')) return json(400, { error: 'modelo não permitido' }, headers);
      // a mesma imagem pedida de novo vem do cache e não gasta
      const cache = caches.default;
      const hit = await cache.match(req.url);
      if (hit) { const r = new Response(hit.body, hit); Object.entries(headers).forEach(([k, v]) => r.headers.set(k, v)); return r; }
      if (!(await spend(env, ip, 1))) return json(429, { error: 'daily' }, headers);
      upReq = new Request(UP + url.pathname + url.search);
      const up = await fetch(upReq, { headers: { Authorization: 'Bearer ' + env.POLLEN_KEY } });
      const r = new Response(up.body, up);
      if (up.ok) { r.headers.set('Cache-Control', 'public, max-age=604800'); await cache.put(req.url, r.clone()); }
      Object.entries(headers).forEach(([k, v]) => r.headers.set(k, v));
      return r;
    } else {
      return json(404, { error: 'rota desconhecida' }, headers);
    }
    upReq.headers.set('Authorization', 'Bearer ' + env.POLLEN_KEY);
    const up = await fetch(upReq);
    const r = new Response(up.body, up);
    Object.entries(headers).forEach(([k, v]) => r.headers.set(k, v));
    return r;
  },
};
