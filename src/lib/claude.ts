/**
 * Ponte com os recursos do claude.ai quando o IDEÁRIO roda como Artifact.
 * Fora do claude.ai, tudo retorna null e o app usa o navegador.
 */
type AnyCap = any;

declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<AnyCap | null> };
  }
}

const cache = new Map<string, Promise<AnyCap | null>>();

export function useCapability(name: string, timeoutMs = 6000): Promise<AnyCap | null> {
  if (cache.has(name)) return cache.get(name)!;
  const pr = (async () => {
    try {
      if (!window.claude?.use) return null;
      const t = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
      return (await Promise.race([window.claude.use(name), t])) ?? null;
    } catch {
      return null;
    }
  })();
  cache.set(name, pr);
  return pr;
}

export interface Ai {
  ask(input: string | { role: 'user' | 'assistant'; content: string }[], onText?: (t: string) => void, signal?: AbortSignal): Promise<string>;
  json<T>(input: string): Promise<T>;
}

let aiPromise: Promise<Ai | null> | null = null;

export function getAi(): Promise<Ai | null> {
  if (aiPromise) return aiPromise;
  aiPromise = (async () => {
    const sample = await useCapability('sample');
    if (!sample) return null;
    return {
      async ask(input, onText, signal) {
        const r = await sample(input, {
          onText: onText ? ({ text }: { text: string }) => onText(text) : undefined,
          signal,
          cache: false,
        });
        return r.text as string;
      },
      async json<T>(input: string) {
        return (await sample.json(input, { modelTier: 'default' })) as T;
      },
    } satisfies Ai;
  })();
  return aiPromise;
}

export async function offerDownload(filename: string, data: string | Blob, type = 'application/json') {
  const dl = await useCapability('downloads');
  if (dl) {
    await dl.save({ filename, data });
    return true;
  }
  // Fora do claude.ai: download comum do navegador.
  try {
    const url = URL.createObjectURL(typeof data === 'string' ? new Blob([data], { type }) : data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}
