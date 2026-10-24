import type { Asset, Project } from '../data/types';
import { useCapability } from '../lib/claude';
import { uid } from '../lib/util';

/** Onde os projetos ficam. Nuvem = conta do usuário no claude.ai; local = este navegador. */
export interface ProjectStore {
  kind: 'cloud' | 'local';
  list(): Promise<Project[]>;
  save(p: Project): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface BlobStore {
  kind: 'cloud' | 'local';
  put(file: Blob): Promise<Pick<Asset, 'store' | 'ref'>>;
  remove(a: Asset): Promise<void>;
}

/* ---------------- local: localStorage + IndexedDB ---------------- */

const LS_KEY = 'ideario:projects:v1';

function readLocal(): Record<string, Project> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocal(map: Record<string, Project>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch (e) {
    throw new Error('O navegador não tem espaço para salvar. Exporte o projeto e libere espaço.');
  }
}

/** Memória de reserva quando o navegador bloqueia armazenamento (janela anônima, prévia). */
const memory: Record<string, Project> = {};
let localWorks = true;
try {
  localStorage.setItem('ideario:probe', '1');
  localStorage.removeItem('ideario:probe');
} catch {
  localWorks = false;
}

export const localProjects: ProjectStore = {
  kind: 'local',
  async list() {
    const map = localWorks ? readLocal() : memory;
    return Object.values(map);
  },
  async save(p) {
    if (!localWorks) {
      memory[p.id] = p;
      return;
    }
    const map = readLocal();
    map[p.id] = p;
    writeLocal(map);
  },
  async remove(id) {
    if (!localWorks) {
      delete memory[id];
      return;
    }
    const map = readLocal();
    delete map[id];
    writeLocal(map);
  },
};

const memBlobs = new Map<string, Blob>();
let idbPromise: Promise<IDBDatabase | null> | null = null;
function idb(): Promise<IDBDatabase | null> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open('ideario', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('blobs');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbPromise;
}

async function idbPut(key: string, blob: Blob) {
  const db = await idb();
  if (!db) {
    memBlobs.set(key, blob);
    return;
  }
  await new Promise<void>((res, rej) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await idb();
  if (!db) return memBlobs.get(key) ?? null;
  return new Promise((res) => {
    const tx = db.transaction('blobs', 'readonly');
    const r = tx.objectStore('blobs').get(key);
    r.onsuccess = () => res((r.result as Blob) ?? null);
    r.onerror = () => res(null);
  });
}

async function idbDel(key: string) {
  const db = await idb();
  if (!db) {
    memBlobs.delete(key);
    return;
  }
  const tx = db.transaction('blobs', 'readwrite');
  tx.objectStore('blobs').delete(key);
}

export const localBlobs: BlobStore = {
  kind: 'local',
  async put(file) {
    const ref = uid('b');
    await idbPut(ref, file);
    return { store: 'local', ref };
  },
  async remove(a) {
    if (a.store === 'local') await idbDel(a.ref);
  },
};

/* ---------------- resolução de URL de imagem ---------------- */

const urlCache = new Map<string, Promise<string | null>>();

export function assetUrl(a: Pick<Asset, 'store' | 'ref'>): Promise<string | null> {
  const key = a.store + ':' + a.ref;
  if (!urlCache.has(key)) {
    urlCache.set(
      key,
      a.store === 'cloud'
        ? Promise.resolve('/_blob/' + a.ref)
        : idbGet(a.ref).then((b) => (b ? URL.createObjectURL(b) : null)),
    );
  }
  return urlCache.get(key)!;
}

/* ---------------- nuvem: capacidades db + assets do claude.ai ---------------- */

async function cloudProjects(): Promise<ProjectStore | null> {
  const [db, user] = await Promise.all([useCapability('db'), useCapability('user')]);
  if (!db || !user) return null;
  let id: string | null = null;
  try {
    id = await user.id();
  } catch {
    id = null;
  }
  if (!id) return null;
  const col = db.collection('data/users/' + id);
  // teste de leitura: se falhar, cai para o modo local
  try {
    await col.limit(1).get();
  } catch {
    return null;
  }
  const queue = new Map<string, Promise<void>>();
  return {
    kind: 'cloud',
    async list() {
      const snap = await col.get();
      return snap.docs.filter((d: any) => d.exists).map((d: any) => d.data() as Project);
    },
    async save(p) {
      // uma escrita por vez por documento
      const prev = queue.get(p.id) ?? Promise.resolve();
      const next = prev.catch(() => {}).then(() => col.doc(p.id).set(JSON.parse(JSON.stringify(p))));
      queue.set(p.id, next);
      await next;
    },
    async remove(pid) {
      await col.doc(pid).delete();
    },
  };
}

async function cloudBlobs(): Promise<BlobStore | null> {
  const assets = await useCapability('assets');
  if (!assets) return null;
  return {
    kind: 'cloud',
    async put(file) {
      const r = await assets.upload(file, file.type ? undefined : { type: 'image/png' });
      return { store: 'cloud', ref: r.id };
    },
    async remove(a) {
      if (a.store === 'cloud') await assets.delete(a.ref).catch(() => {});
      else await localBlobs.remove(a);
    },
  };
}

export interface Backend {
  projects: ProjectStore;
  blobs: BlobStore;
}

export async function connectBackend(): Promise<Backend> {
  const [cp, cb] = await Promise.all([cloudProjects(), cloudBlobs()]);
  return { projects: cp ?? localProjects, blobs: cb ?? localBlobs };
}
