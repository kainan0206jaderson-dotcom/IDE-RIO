import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useProjects } from "../store/useProjects";
import { SketchbookCover } from "../components/SketchbookCover";
import { Flipbook } from "../components/Flipbook";
import { Icon } from "../components/Icon";
import { progress } from "../lib/progress";
import { fmtDate } from "../lib/util";
import { offerDownload } from "../lib/claude";
import { MODULES } from "../data/recipe";
import type { Project } from "../data/types";
import { queueImport } from "../lib/pendingImport";
import type { ViewId } from "./Workspace";
import { StorageBadge } from "../components/StorageBadge";

const reduced = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type Item =
  | { kind: "project"; p: Project }
  | { kind: "new" }
  | { kind: "material" }
  | { kind: "example" };

/** O escritório: os sketchbooks num carrossel em 3D. Um toque folheia, outro abre a página para criar. */
export function Office({
  onOpen,
  onReplayIntro,
}: {
  onOpen: (id: string, view?: ViewId) => void;
  onReplayIntro?: () => void;
}) {
  const { projects, create, createExample, remove, importProject } =
    useProjects();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState(0);
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [flip, setFlip] = useState<string | null>(null);
  const [menu, setMenu] = useState<"item" | "app" | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const matRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const wheel = useRef(0);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (
      q
        ? projects.filter((p) =>
            (p.title + " " + p.client).toLowerCase().includes(q),
          )
        : projects
    ).map((p) => ({ kind: "project", p }) as Item);
    if (q) return list;
    return [
      ...list,
      { kind: "new" },
      { kind: "material" },
      ...(projects.some((p) => p.example) ? [] : [{ kind: "example" } as Item]),
    ];
  }, [projects, query]);

  const cur = items[Math.min(sel, items.length - 1)];
  const curP = cur?.kind === "project" ? cur.p : null;

  useEffect(() => {
    if (sel > items.length - 1) setSel(Math.max(0, items.length - 1));
  }, [items.length, sel]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const move = (d: number) => {
    setConfirmDel(false);
    setMenu(null);
    setSel((v) => Math.max(0, Math.min(items.length - 1, v + d)));
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (
        flip ||
        creating ||
        (e.target as HTMLElement)?.closest("input, textarea, select")
      )
        return;
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "Enter") activate();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const open = (id: string, view?: ViewId) => {
    setFlip(null);
    if (reduced()) return onOpen(id, view);
    setOpening(true);
    setTimeout(() => onOpen(id, view), 480);
  };

  /** ação do livro do centro */
  const activate = () => {
    if (!cur) return;
    if (cur.kind === "project") setFlip(cur.p.id);
    else if (cur.kind === "new") setCreating(true);
    else if (cur.kind === "material") matRef.current?.click();
    else {
      const p = createExample();
      setSel(0);
      setFlip(p.id);
    }
  };

  const onImportJson = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data?.modules || !data?.ficha) throw new Error();
      const p = importProject(data as Project);
      setSel(0);
      setToast(`“${p.title}” entrou no escritório.`);
    } catch {
      setToast(
        "Esse arquivo não é um sketchbook do IDEÁRIO (.json exportado pelo app).",
      );
    }
  };

  // material pronto de qualquer formato: vira um sketchbook novo e abre na tela de importação
  const onMaterial = (files: File[]) => {
    if (!files.length) return;
    const base =
      files[0].name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .trim()
        .slice(0, 60) || "Material importado";
    const p = create(base, "");
    queueImport(p.id, files);
    open(p.id, "import");
  };

  const head = (() => {
    if (!cur)
      return {
        title: "Nada encontrado",
        sub: `nenhum sketchbook com “${query}”`,
      };
    if (cur.kind === "project") {
      const pr = progress(cur.p);
      const filled = MODULES.filter(
        (m) => cur.p.modules[m.id].status !== "vazio",
      ).length;
      return {
        title: cur.p.title,
        sub: `${filled}/${MODULES.length} páginas · ${pr.done} prontas · ${fmtDate(cur.p.updatedAt)}`,
        example: cur.p.example,
      };
    }
    if (cur.kind === "new")
      return { title: "Novo sketchbook", sub: "começa pela ficha de partida" };
    if (cur.kind === "material")
      return {
        title: "Material pronto",
        sub: "PDF, AI, PSD, PNG, PPTX e outros, para melhorar",
      };
    return {
      title: "Exemplo da receita",
      sub: "AYLA Furniture, preenchido com os casos",
    };
  })();

  return (
    <div
      className={
        "office" + (opening ? " is-opening" : "") + (flip ? " is-flipping" : "")
      }
    >
      <header className="o-top">
        <span className="o-brand" aria-label="IDEÁRIO">
          <span className="o-mark" aria-hidden="true">
            I
          </span>
          <span className="o-name">IDEÁRIO</span>
        </span>
        <div className="o-tools">
          {searching ? (
            <label className="o-search">
              <span className="sr">Buscar sketchbook</span>
              <input
                id="office-search"
                type="search"
                autoFocus
                placeholder="Buscar sketchbook"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSel(0);
                }}
                onBlur={() => !query && setSearching(false)}
                onKeyDown={(e) =>
                  e.key === "Escape" && (setQuery(""), setSearching(false))
                }
              />
            </label>
          ) : (
            <button
              className="o-icon"
              onClick={() => setSearching(true)}
              aria-label="Buscar sketchbook"
            >
              <Icon name="search" size={17} />
            </button>
          )}
          <StorageBadge compact />
          <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              className="o-icon"
              aria-label="Menu do escritório"
              aria-expanded={menu === "app"}
              onClick={() => setMenu(menu === "app" ? null : "app")}
            >
              <Icon name="menu" size={17} />
            </button>
            {menu === "app" && (
              <div className="menu right" role="menu">
                <button
                  role="menuitem"
                  onClick={() => (setMenu(null), matRef.current?.click())}
                >
                  <Icon name="layers" size={16} /> Importar material pronto
                </button>
                <button
                  role="menuitem"
                  onClick={() => (setMenu(null), fileRef.current?.click())}
                >
                  <Icon name="upload" size={16} /> Importar sketchbook (.json)
                </button>
                {onReplayIntro && (
                  <button
                    role="menuitem"
                    onClick={() => (setMenu(null), onReplayIntro())}
                  >
                    <Icon name="eye" size={16} /> Rever a abertura
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="o-head" aria-live="polite">
        <h1 className="o-title">{head.title}</h1>
        <span className="o-sub">
          <Icon name="book" size={13} /> {head.sub}
          {head.example && <em className="chip-example">exemplo</em>}
        </span>
      </div>

      {flip && curP ? (
        <Flipbook
          project={curP}
          onClose={() => setFlip(null)}
          onOpen={(v) => open(curP.id, v)}
        />
      ) : (
        <>
          <section
            className="carousel"
            aria-label="Sketchbooks"
            aria-roledescription="carrossel"
            onPointerDown={(e) =>
              (drag.current = { x: e.clientX, moved: false })
            }
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const dx = e.clientX - d.x;
              if (Math.abs(dx) > 60) {
                move(dx < 0 ? 1 : -1);
                d.x = e.clientX;
                d.moved = true;
              }
            }}
            onPointerUp={() => setTimeout(() => (drag.current = null))}
            onPointerLeave={() => (drag.current = null)}
            onWheel={(e) => {
              const v =
                Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
              wheel.current += v;
              if (Math.abs(wheel.current) > 70) {
                move(wheel.current > 0 ? 1 : -1);
                wheel.current = 0;
              }
            }}
          >
            {items.map((it, i) => {
              const off = i - sel;
              const a = Math.abs(off);
              if (a > 3) return null;
              const key = it.kind === "project" ? it.p.id : it.kind;
              return (
                <button
                  key={key}
                  className={
                    "c-item" + (off === 0 ? " center" : "") + " k-" + it.kind
                  }
                  style={
                    {
                      "--off": off,
                      "--abs": a,
                      zIndex: 10 - a,
                    } as CSSProperties
                  }
                  tabIndex={off === 0 ? 0 : -1}
                  aria-hidden={off !== 0}
                  aria-label={
                    off === 0
                      ? it.kind === "project"
                        ? `Folhear ${it.p.title}`
                        : head.title
                      : undefined
                  }
                  onClick={() => {
                    if (drag.current?.moved) return;
                    if (off === 0) activate();
                    else move(off);
                  }}
                >
                  {it.kind === "project" ? (
                    <SketchbookCover project={it.p} />
                  ) : (
                    <span className="c-blank">
                      <Icon
                        name={
                          it.kind === "new"
                            ? "plus"
                            : it.kind === "material"
                              ? "layers"
                              : "sparkle"
                        }
                        size={26}
                      />
                    </span>
                  )}
                </button>
              );
            })}
            {!items.length && (
              <p className="o-empty">Nenhum sketchbook com “{query}”.</p>
            )}
          </section>

          <div className="o-dots" aria-hidden="true">
            {items.map((_, i) => (
              <span key={i} className={i === sel ? "on" : ""} />
            ))}
          </div>

          <div className="round-row">
            {curP ? (
              <>
                <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="round"
                    aria-label={`Opções de ${curP.title}`}
                    aria-expanded={menu === "item"}
                    onClick={() => (
                      setMenu(menu === "item" ? null : "item"),
                      setConfirmDel(false)
                    )}
                  >
                    <Icon name="more" size={18} stroke={3.4} />
                    <span>opções</span>
                  </button>
                  {menu === "item" && (
                    <div className="menu up" role="menu">
                      <button
                        role="menuitem"
                        onClick={() => open(curP.id, "cover")}
                      >
                        <Icon name="edit" size={16} /> Editar capa
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => open(curP.id, "ficha")}
                      >
                        <Icon name="form" size={16} /> Ficha de partida
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => open(curP.id, "export")}
                      >
                        <Icon name="download" size={16} /> Exportar e Canva
                      </button>
                      <button
                        role="menuitem"
                        onClick={async () => {
                          setMenu(null);
                          const ok = await offerDownload(
                            `${curP.title.replace(/[^\w\-]+/g, "-").toLowerCase() || "sketchbook"}.ideario.json`,
                            JSON.stringify(curP, null, 2),
                          ).catch(() => false);
                          setToast(
                            ok
                              ? "Arquivo do sketchbook pronto."
                              : "O download foi cancelado.",
                          );
                        }}
                      >
                        <Icon name="copy" size={16} /> Cópia de segurança
                        (.json)
                      </button>
                      {confirmDel ? (
                        <button
                          role="menuitem"
                          className="danger"
                          onClick={async () => {
                            setMenu(null);
                            setConfirmDel(false);
                            await remove(curP.id);
                            setToast(`“${curP.title}” saiu do escritório.`);
                          }}
                        >
                          <Icon name="warn" size={16} /> Confirmar exclusão
                        </button>
                      ) : (
                        <button
                          role="menuitem"
                          className="danger"
                          onClick={() => setConfirmDel(true)}
                        >
                          <Icon name="trash" size={16} /> Excluir
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="round"
                  onClick={() => setFlip(curP.id)}
                  aria-label={`Folhear ${curP.title}`}
                >
                  <Icon name="book" size={18} />
                  <span>folhear</span>
                </button>
                <button
                  className="round primary"
                  onClick={() => open(curP.id)}
                  aria-label={`Criar em ${curP.title}`}
                >
                  <Icon name="edit" size={18} />
                  <span>criar</span>
                </button>
              </>
            ) : (
              <button
                className="round primary"
                onClick={activate}
                disabled={!cur}
                aria-label={head.title}
              >
                <Icon
                  name={
                    cur?.kind === "material"
                      ? "upload"
                      : cur?.kind === "example"
                        ? "sparkle"
                        : "plus"
                  }
                  size={18}
                />
                <span>
                  {cur?.kind === "material"
                    ? "importar"
                    : cur?.kind === "example"
                      ? "abrir"
                      : "criar"}
                </span>
              </button>
            )}
            {cur?.kind !== "new" && (
              <button
                className="round"
                onClick={() => setCreating(true)}
                aria-label="Novo sketchbook"
              >
                <Icon name="plus" size={18} />
                <span>novo</span>
              </button>
            )}
          </div>
          <p className="o-hint" aria-hidden="true">
            arraste ou use as setas · toque no caderno para folhear
          </p>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => onImportJson(e.target.files?.[0])}
      />
      <input
        ref={matRef}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files && onMaterial([...e.target.files])}
      />

      {creating && (
        <NewSketchbook
          onCancel={() => setCreating(false)}
          onCreate={(title, client) => {
            const p = create(title, client);
            setCreating(false);
            open(p.id, "ficha");
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function NewSketchbook({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (t: string, c: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);
  return (
    <div className="modal-back" onClick={onCancel}>
      <form
        className="modal sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onCreate(title, client);
        }}
      >
        <span className="eyebrow">Novo sketchbook</span>
        <h2 id="new-title" className="modal-title">
          Qual marca vamos <em>construir</em>?
        </h2>
        <label className="field">
          <span>Nome da marca ou projeto</span>
          <input
            id="new-name"
            ref={ref}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex.: IDEÁRIO"
            maxLength={60}
            required
          />
        </label>
        <label className="field">
          <span>Cliente ou contexto (opcional)</span>
          <input
            id="new-client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="ex.: brandbook próprio"
            maxLength={60}
          />
        </label>
        <p className="modal-hint">
          O sketchbook abre na Ficha de partida. Dez respostas antes do primeiro
          traço.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-dark"
            disabled={!title.trim()}
          >
            Criar e abrir
          </button>
        </div>
      </form>
    </div>
  );
}
