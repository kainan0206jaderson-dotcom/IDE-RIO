import { useEffect, useState, type CSSProperties } from 'react';
import { useProjects } from '../store/useProjects';
import { ACTS, MODULES, MODULE_BY_ID, type ModuleId } from '../data/recipe';
import { Icon } from '../components/Icon';
import { StorageBadge } from '../components/StorageBadge';
import { SketchbookCover } from '../components/SketchbookCover';
import { progress } from '../lib/progress';
import { MapView } from './workspace/MapView';
import { FichaView } from './workspace/FichaView';
import { ModuleView } from './workspace/ModuleView';
import { ChecklistView } from './workspace/ChecklistView';
import { PreviewView } from './workspace/PreviewView';
import { LibraryView } from './workspace/LibraryView';
import { CoverEditor } from './workspace/CoverEditor';
import { SidePanel } from './workspace/SidePanel';
import type { ModuleStatus } from '../data/types';

export type ViewId = 'map' | 'ficha' | 'checklist' | 'preview' | 'library' | 'cover' | ModuleId;

export const isModule = (v: string): v is ModuleId => /^M\d\d$/.test(v);

export function StatusMark({ status }: { status: ModuleStatus }) {
  const label = status === 'pronto' ? 'Pronto' : status === 'rascunho' ? 'Rascunho' : 'Vazio';
  return (
    <span className={'status-mark s-' + status} role="img" aria-label={label} title={label}>
      {status === 'pronto' && <Icon name="check" size={11} stroke={3} />}
    </span>
  );
}

export function Workspace({ projectId, view, onView, onExit }: { projectId: string; view: ViewId; onView: (v: ViewId) => void; onExit: () => void }) {
  const { get, update } = useProjects();
  const p = get(projectId)!;
  const [railOpen, setRailOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'guia' | 'ia'>('guia');
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    setRailOpen(false);
    document.querySelector('.ws-main')?.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRailOpen(false);
        setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (!p) return null;
  const pr = progress(p);
  const go = (v: ViewId) => onView(v);

  const openAi = () => {
    setPanelTab('ia');
    setPanelOpen(true);
  };

  let body;
  if (isModule(view)) body = <ModuleView key={view} project={p} id={view} onGo={go} onAi={openAi} />;
  else if (view === 'ficha') body = <FichaView project={p} onGo={go} onAi={openAi} />;
  else if (view === 'checklist') body = <ChecklistView project={p} onGo={go} />;
  else if (view === 'preview') body = <PreviewView project={p} onGo={go} />;
  else if (view === 'library') body = <LibraryView project={p} />;
  else if (view === 'cover') body = <CoverEditor project={p} />;
  else body = <MapView project={p} onGo={go} />;

  const idx = isModule(view) ? MODULES.findIndex((m) => m.id === view) : -1;

  return (
    <div className="ws" style={{ '--project-accent': p.palette[0]?.hex ?? 'var(--c-dark)' } as CSSProperties}>
      <header className="ws-top">
        <button className="ws-back" onClick={onExit} aria-label="Voltar ao escritório">
          <Icon name="back" size={18} />
          <span className="ws-back-label">Escritório</span>
        </button>
        <button className="icon-btn on-dark ws-rail-toggle" onClick={() => setRailOpen(true)} aria-label="Abrir sumário">
          <Icon name="list" />
        </button>
        <div className="ws-title">
          {editingTitle ? (
            <input
              id="ws-title-input"
              className="ws-title-input"
              autoFocus
              defaultValue={p.title}
              maxLength={60}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== p.title) update(p.id, (x) => (x.title = v));
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
            />
          ) : (
            <button className="ws-title-btn" onClick={() => setEditingTitle(true)} title="Renomear">
              {p.title}
            </button>
          )}
          <span className="ws-sub">{p.client || 'Sketchbook'}</span>
        </div>
        <div className="ws-top-right">
          <StorageBadge compact />
          <button className="btn btn-sm ws-ai-btn" onClick={openAi}>
            <Icon name="sparkle" size={15} /> <span className="ws-ai-label">Assistente</span>
          </button>
        </div>
      </header>

      <div className="ws-body">
        <nav className={'ws-rail' + (railOpen ? ' open' : '')} aria-label="Sumário do sketchbook">
          <div className="rail-cover">
            <button className="rail-cover-btn" onClick={() => go('cover')} aria-label="Editar capa">
              <SketchbookCover project={p} />
            </button>
            <div className="rail-cover-meta">
              <div className="rail-progress" aria-label={`${pr.done} de ${pr.total} módulos prontos`}>
                <span style={{ width: `${(pr.done / pr.total) * 100}%` }} />
              </div>
              <span className="mono">
                {pr.done}/{pr.total} prontos
              </span>
            </div>
            <button className="icon-btn rail-close" onClick={() => setRailOpen(false)} aria-label="Fechar sumário">
              <Icon name="close" />
            </button>
          </div>

          <RailGroup title="Começo">
            <RailItem active={view === 'map'} onClick={() => go('map')} icon="grid" label="Mapa da receita" />
            <RailItem active={view === 'ficha'} onClick={() => go('ficha')} icon="form" label="Ficha de partida" meta={`${pr.ficha}/10`} />
          </RailGroup>

          {ACTS.map((a) => (
            <RailGroup key={a.id} title={`Ato ${a.n} · ${a.name}`}>
              {a.modules.map((id) => {
                const m = MODULE_BY_ID[id];
                return (
                  <button key={id} className={'rail-item' + (view === id ? ' active' : '')} onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}>
                    <span className="rail-n">{m.n}</span>
                    <span className="rail-label">
                      {m.short}
                      {m.optional && <em className="rail-opt">opcional</em>}
                    </span>
                    <StatusMark status={p.modules[id].status} />
                  </button>
                );
              })}
            </RailGroup>
          ))}

          <RailGroup title="Saída">
            <RailItem active={view === 'checklist'} onClick={() => go('checklist')} icon="check" label="Checklist de saída" meta={`${pr.score}/12`} />
            <RailItem active={view === 'preview'} onClick={() => go('preview')} icon="eye" label="Prévia e ritmo" />
          </RailGroup>
          <RailGroup title="Estúdio">
            <RailItem active={view === 'library'} onClick={() => go('library')} icon="image" label="Biblioteca de assets" meta={String(p.assets.length)} />
            <RailItem active={view === 'cover'} onClick={() => go('cover')} icon="sticker" label="Capa do sketchbook" />
          </RailGroup>
        </nav>
        {railOpen && <div className="ws-scrim" onClick={() => setRailOpen(false)} />}

        <main className="ws-main" id="ws-main">
          {body}
          {idx >= 0 && (
            <div className="pager">
              {idx > 0 ? (
                <button className="pager-btn" onClick={() => go(MODULES[idx - 1].id)}>
                  <Icon name="back" size={16} />
                  <span>
                    <small>{MODULES[idx - 1].n}</small> {MODULES[idx - 1].title}
                  </span>
                </button>
              ) : (
                <button className="pager-btn" onClick={() => go('ficha')}>
                  <Icon name="back" size={16} />
                  <span>Ficha de partida</span>
                </button>
              )}
              {idx < MODULES.length - 1 ? (
                <button className="pager-btn next" onClick={() => go(MODULES[idx + 1].id)}>
                  <span>
                    <small>{MODULES[idx + 1].n}</small> {MODULES[idx + 1].title}
                  </span>
                  <Icon name="next" size={16} />
                </button>
              ) : (
                <button className="pager-btn next" onClick={() => go('checklist')}>
                  <span>Checklist de saída</span>
                  <Icon name="next" size={16} />
                </button>
              )}
            </div>
          )}
        </main>

        <SidePanel project={p} view={view} open={panelOpen} tab={panelTab} onTab={setPanelTab} onClose={() => setPanelOpen(false)} />
        {panelOpen && <div className="ws-scrim panel-scrim" onClick={() => setPanelOpen(false)} />}
      </div>

      <nav className="ws-tabbar" aria-label="Navegação rápida">
        <button onClick={() => setRailOpen(true)}>
          <Icon name="list" />
          <span>Sumário</span>
        </button>
        <button className={view === 'map' ? 'on' : ''} onClick={() => go('map')}>
          <Icon name="grid" />
          <span>Mapa</span>
        </button>
        <button
          onClick={() => {
            setPanelTab('guia');
            setPanelOpen(true);
          }}
        >
          <Icon name="book" />
          <span>Guia</span>
        </button>
        <button className="ai" onClick={openAi}>
          <Icon name="sparkle" />
          <span>IA</span>
        </button>
      </nav>
    </div>
  );
}

function RailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rail-group">
      <span className="rail-title">{title}</span>
      {children}
    </div>
  );
}

function RailItem({ active, onClick, icon, label, meta }: { active: boolean; onClick: () => void; icon: string; label: string; meta?: string }) {
  return (
    <button className={'rail-item' + (active ? ' active' : '')} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <span className="rail-n">
        <Icon name={icon} size={15} />
      </span>
      <span className="rail-label">{label}</span>
      {meta && <span className="rail-meta">{meta}</span>}
    </button>
  );
}
