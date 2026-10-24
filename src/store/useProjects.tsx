import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Asset, Project } from '../data/types';
import { connectBackend, localBlobs, localProjects, type Backend } from './storage';
import { exampleProject, newProject } from '../data/factory';
import { uid } from '../lib/util';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Ctx {
  ready: boolean;
  backend: Backend['projects']['kind'];
  projects: Project[];
  get(id: string): Project | undefined;
  create(title: string, client?: string): Project;
  createExample(): Project;
  update(id: string, fn: (p: Project) => void): void;
  remove(id: string): Promise<void>;
  importProject(p: Project): Project;
  addAssets(id: string, files: File[]): Promise<Asset[]>;
  addBlobs(id: string, items: { blob: Blob; name: string; type?: string; tags?: string[] }[]): Promise<Asset[]>;
  removeAsset(id: string, assetId: string): Promise<void>;
  saveState: SaveState;
  saveError: string | null;
}

const ProjectsCtx = createContext<Ctx | null>(null);

const clone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

function imageSize(file: Blob): Promise<{ w: number; h: number } | null> {
  return new Promise((res) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        res({ w: img.naturalWidth, h: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => res(null);
      img.src = url;
    } catch {
      res(null);
    }
  });
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend>({ projects: localProjects, blobs: localBlobs });
  const [ready, setReady] = useState(false);
  const [map, setMap] = useState<Record<string, Project>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const mapRef = useRef(map);
  mapRef.current = map;
  const backendRef = useRef(backend);
  backendRef.current = backend;
  const dirty = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await connectBackend();
      let list: Project[] = [];
      try {
        list = await b.projects.list();
        // primeira vez na nuvem: traz o que já existia neste navegador
        if (b.projects.kind === 'cloud') {
          const local = await localProjects.list();
          const have = new Set(list.map((p) => p.id));
          for (const p of local) {
            if (!have.has(p.id)) {
              await b.projects.save(p).catch(() => {});
              list.push(p);
            }
          }
        }
      } catch {
        list = await localProjects.list();
      }
      if (!alive) return;
      setBackend(b);
      setMap(Object.fromEntries(list.map((p) => [p.id, p])));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const flush = useCallback(async () => {
    const ids = [...dirty.current];
    dirty.current.clear();
    if (!ids.length) return;
    setSaveState('saving');
    try {
      for (const id of ids) {
        const p = mapRef.current[id];
        if (p) await backendRef.current.projects.save(p);
      }
      setSaveState('saved');
      setSaveError(null);
    } catch (e: any) {
      setSaveState('error');
      setSaveError(e?.message || 'Não foi possível salvar.');
      ids.forEach((i) => dirty.current.add(i));
    }
  }, []);

  const schedule = useCallback(
    (id: string) => {
      dirty.current.add(id);
      setSaveState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (dirty.current.size) flush();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);

  const put = useCallback(
    (p: Project) => {
      setMap((m) => ({ ...m, [p.id]: p }));
      mapRef.current = { ...mapRef.current, [p.id]: p };
      schedule(p.id);
      return p;
    },
    [schedule],
  );

  const update = useCallback(
    (id: string, fn: (p: Project) => void) => {
      const cur = mapRef.current[id];
      if (!cur) return;
      const next = clone(cur);
      fn(next);
      next.updatedAt = Date.now();
      put(next);
    },
    [put],
  );

  /** Guarda binários (imagens, fontes) e registra no projeto como assets. */
  const addBlobs = useCallback(
    async (id: string, items: { blob: Blob; name: string; type?: string; tags?: string[] }[]) => {
      const added: Asset[] = [];
      for (const it of items) {
        const type = it.type || it.blob.type || 'application/octet-stream';
        const blob = it.blob.type === type ? it.blob : new Blob([it.blob], { type });
        let stored;
        try {
          stored = await backendRef.current.blobs.put(blob);
        } catch {
          stored = await localBlobs.put(blob);
        }
        const size = type.startsWith('image/') ? await imageSize(blob) : null;
        added.push({
          id: uid('a'),
          name: it.name.replace(/\.[a-z0-9]+$/i, '') || 'arquivo',
          type,
          tags: it.tags ?? [],
          createdAt: Date.now(),
          ...stored,
          ...(size ?? {}),
        });
      }
      if (added.length) update(id, (p) => p.assets.unshift(...added.filter((a) => a.type.startsWith('image/'))));
      return added;
    },
    [update],
  );

  const addAssets = useCallback(
    (id: string, files: File[]) => addBlobs(id, files.filter((f) => /^image\//.test(f.type)).map((f) => ({ blob: f, name: f.name }))),
    [addBlobs],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      backend: backend.projects.kind,
      projects: Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt),
      get: (id) => map[id],
      create: (title, client) => put(newProject(title, client)),
      createExample: () => put(exampleProject()),
      importProject: (p) => put({ ...p, id: uid('p'), updatedAt: Date.now() }),
      update,
      async remove(id) {
        const p = mapRef.current[id];
        setMap((m) => {
          const n = { ...m };
          delete n[id];
          return n;
        });
        dirty.current.delete(id);
        await backendRef.current.projects.remove(id).catch(() => {});
        if (p) for (const a of p.assets) backendRef.current.blobs.remove(a).catch(() => {});
      },
      addAssets,
      addBlobs,
      async removeAsset(id, assetId) {
        const a = mapRef.current[id]?.assets.find((x) => x.id === assetId);
        update(id, (p) => {
          p.assets = p.assets.filter((x) => x.id !== assetId);
          for (const m of Object.values(p.modules)) for (const s of m.slots) s.assetIds = s.assetIds.filter((x) => x !== assetId);
          p.cover.stickers = p.cover.stickers.filter((s) => !(s.kind === 'image' && s.value === assetId));
          if (p.cover.imageAssetId === assetId) p.cover.imageAssetId = undefined;
        });
        if (a) await backendRef.current.blobs.remove(a).catch(() => {});
      },
      saveState,
      saveError,
    }),
    [ready, backend, map, put, update, addAssets, addBlobs, saveState, saveError],
  );

  return <ProjectsCtx.Provider value={value}>{children}</ProjectsCtx.Provider>;
}

export function useProjects() {
  const c = useContext(ProjectsCtx);
  if (!c) throw new Error('useProjects fora do ProjectsProvider');
  return c;
}
