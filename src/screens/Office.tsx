import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useProjects } from '../store/useProjects';
import { SketchbookCover } from '../components/SketchbookCover';
import { Icon } from '../components/Icon';
import { palette } from '../design/tokens';
import { progress } from '../lib/progress';
import { fmtDate } from '../lib/util';
import { offerDownload } from '../lib/claude';
import type { Project } from '../data/types';
import type { ViewId } from './Workspace';
import { StorageBadge } from '../components/StorageBadge';

/** rotação estável por projeto, para os cadernos parecerem soltos na mesa */
function tilt(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 70) - 35) / 10;
}

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Office({ onOpen }: { onOpen: (id: string, view?: ViewId) => void }) {
  const { projects, create, createExample, remove, importProject } = useProjects();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? projects.filter((p) => (p.title + ' ' + p.client).toLowerCase().includes(q)) : projects;
  }, [projects, query]);

  // paralaxe leve dos objetos da mesa
  useEffect(() => {
    const el = deskRef.current;
    if (!el || reduced() || !window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const open = (id: string, view?: ViewId) => {
    if (reduced()) return onOpen(id, view);
    setOpening(id);
    setTimeout(() => onOpen(id, view), 520);
  };

  const onImport = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data?.modules || !data?.ficha) throw new Error();
      const p = importProject(data as Project);
      setToast(`“${p.title}” foi colocado na mesa.`);
    } catch {
      setToast('Esse arquivo não é um sketchbook do IDEÁRIO (.json exportado pelo app).');
    }
  };

  return (
    <div className={'office' + (opening ? ' is-opening' : '')}>
      <header className="wall">
        <div className="wall-inner">
          <div className="brand">
            <span className="brand-mark" aria-label="IDEÁRIO">
              IDE<span className="brand-a">Á</span>RIO
            </span>
            <span className="brand-sub">escritório de criação</span>
          </div>

          <div className="wall-note" aria-hidden="true">
            <span className="pin" />
            <span className="wall-note-line">
              <b>Tensão</b> + <b>Sistema</b> + <b>Prova</b> = <b className="hl">Case</b>
            </span>
            <span className="wall-note-sub">Faltando um, volta a ser manual de uso.</span>
          </div>

          <div className="wall-tools">
            <label className="search">
              <Icon name="search" size={16} />
              <span className="sr">Buscar sketchbook</span>
              <input id="office-search" type="search" placeholder="Buscar sketchbook" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <StorageBadge />
            <button className="btn btn-sun" onClick={() => setCreating(true)}>
              <Icon name="plus" size={16} /> Novo sketchbook
            </button>
          </div>
        </div>
      </header>

      <main className="desk" ref={deskRef}>
        <div className="desk-light" aria-hidden="true" />
        <div className="desk-grain" aria-hidden="true" />

        {/* objetos da mesa */}
        <div className="props" aria-hidden="true">
          <div className="prop fan" style={{ '--d': 1.2 } as CSSProperties}>
            {Object.values(palette).map((c, i) => (
              <span key={c.hex} className="fan-blade" style={{ '--i': i, '--c': c.hex } as CSSProperties}>
                <i>{c.pantone}</i>
              </span>
            ))}
            <span className="fan-rivet" />
          </div>
          <div className="prop pencil" style={{ '--d': 2 } as CSSProperties}>
            <span className="pencil-tip" />
          </div>
          <div className="prop pencil pencil-2" style={{ '--d': 1.6 } as CSSProperties}>
            <span className="pencil-tip" />
          </div>
          <div className="prop mug" style={{ '--d': 0.8 } as CSSProperties}>
            <span className="mug-coffee" />
            <span className="mug-handle" />
          </div>
          <div className="prop ruler" style={{ '--d': 1 } as CSSProperties} />
          <div className="prop sticky" style={{ '--d': 1.4 } as CSSProperties}>
            <span>Linha vazia na ficha vira módulo básico.</span>
          </div>
          <div className="prop eraser" style={{ '--d': 1.8 } as CSSProperties} />
        </div>

        <section className="desk-surface" aria-label="Sketchbooks na mesa">
          <div className="desk-head">
            <h1 className="desk-title">Na mesa</h1>
            <span className="desk-count">
              {projects.length} {projects.length === 1 ? 'sketchbook' : 'sketchbooks'}
            </span>
          </div>

          <ul className="books">
            {list.map((p) => {
              const pr = progress(p);
              return (
                <li
                  key={p.id}
                  className={'book-slot' + (opening === p.id ? ' opening' : '') + (opening && opening !== p.id ? ' dim' : '')}
                  style={{ '--tilt': tilt(p.id) + 'deg' } as CSSProperties}
                >
                  <button className="book" onClick={() => open(p.id)} aria-label={`Abrir ${p.title}`}>
                    <SketchbookCover project={p} />
                  </button>
                  <div className="book-tag">
                    <div className="book-tag-text">
                      <span className="book-name">{p.title}</span>
                      <span className="book-meta">
                        {pr.done}/{pr.total} módulos · {pr.score}/12 · {fmtDate(p.updatedAt)}
                        {p.example && <em className="chip-example">exemplo</em>}
                      </span>
                    </div>
                    <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn on-dark" aria-label={`Opções de ${p.title}`} aria-expanded={menu === p.id} onClick={() => setMenu(menu === p.id ? null : p.id)}>
                        <Icon name="menu" size={16} />
                      </button>
                      {menu === p.id && (
                        <div className="menu" role="menu">
                          <button role="menuitem" onClick={() => open(p.id)}>
                            <Icon name="book" size={16} /> Abrir
                          </button>
                          <button role="menuitem" onClick={() => open(p.id, 'cover')}>
                            <Icon name="edit" size={16} /> Editar capa
                          </button>
                          <button role="menuitem" onClick={() => open(p.id, 'ficha')}>
                            <Icon name="form" size={16} /> Ficha de partida
                          </button>
                          <button
                            role="menuitem"
                            onClick={async () => {
                              setMenu(null);
                              const ok = await offerDownload(`${p.title.replace(/[^\w\-]+/g, '-').toLowerCase() || 'sketchbook'}.ideario.json`, JSON.stringify(p, null, 2)).catch(() => false);
                              setToast(ok ? 'Arquivo do sketchbook pronto.' : 'O download foi cancelado.');
                            }}
                          >
                            <Icon name="download" size={16} /> Exportar (.json)
                          </button>
                          {confirmDel === p.id ? (
                            <button
                              role="menuitem"
                              className="danger"
                              onClick={async () => {
                                setMenu(null);
                                setConfirmDel(null);
                                await remove(p.id);
                                setToast(`“${p.title}” saiu da mesa.`);
                              }}
                            >
                              <Icon name="warn" size={16} /> Confirmar exclusão
                            </button>
                          ) : (
                            <button role="menuitem" className="danger" onClick={() => setConfirmDel(p.id)}>
                              <Icon name="trash" size={16} /> Excluir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}

            <li className="book-slot new-slot" style={{ '--tilt': '1.5deg' } as CSSProperties}>
              <button className="book book-new" onClick={() => setCreating(true)}>
                <span className="wrap-paper" aria-hidden="true" />
                <span className="wrap-string" aria-hidden="true" />
                <span className="book-new-label">
                  <Icon name="plus" size={22} />
                  Novo sketchbook
                </span>
              </button>
              <div className="book-tag plain">
                <span className="book-meta">em branco, pronto para a ficha</span>
              </div>
            </li>

            {!projects.some((p) => p.example) && (
              <li className="book-slot new-slot" style={{ '--tilt': '-2deg' } as CSSProperties}>
                <button
                  className="book book-new example"
                  onClick={() => {
                    const p = createExample();
                    open(p.id);
                  }}
                >
                  <span className="wrap-paper" aria-hidden="true" />
                  <span className="book-new-label">
                    <Icon name="sparkle" size={22} />
                    Exemplo da receita
                  </span>
                </button>
                <div className="book-tag plain">
                  <span className="book-meta">AYLA Furniture, preenchido com os casos da receita</span>
                </div>
              </li>
            )}
          </ul>

          {query && !list.length && <p className="desk-empty">Nenhum sketchbook com “{query}”.</p>}

          <div className="desk-foot">
            <button className="link-btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} /> Importar sketchbook (.json)
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </section>
      </main>

      {creating && (
        <NewSketchbook
          onCancel={() => setCreating(false)}
          onCreate={(title, client) => {
            const p = create(title, client);
            setCreating(false);
            open(p.id, 'ficha');
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

function NewSketchbook({ onCancel, onCreate }: { onCancel: () => void; onCreate: (t: string, c: string) => void }) {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);
  return (
    <div className="modal-back" onClick={onCancel}>
      <form
        className="modal"
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
          <input id="new-name" ref={ref} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: IDEÁRIO" maxLength={60} required />
        </label>
        <label className="field">
          <span>Cliente ou contexto (opcional)</span>
          <input id="new-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="ex.: brandbook próprio" maxLength={60} />
        </label>
        <p className="modal-hint">O sketchbook abre na Ficha de partida. Dez respostas antes do primeiro traço.</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-dark" disabled={!title.trim()}>
            Criar e abrir
          </button>
        </div>
      </form>
    </div>
  );
}
