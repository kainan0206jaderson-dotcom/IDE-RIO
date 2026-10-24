import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Project } from '../data/types';
import { MODULES } from '../data/recipe';
import { ModulePage } from './ModulePage';
import { Icon } from './Icon';
import { progress } from '../lib/progress';
import type { ViewId } from '../screens/Workspace';

interface Leaf {
  key: string;
  label: string;
  view: ViewId;
  node: ReactNode;
}

function Endpaper({ project: p, back }: { project: Project; back?: boolean }) {
  const pr = progress(p);
  return (
    <div className="endpaper">
      {back ? (
        <>
          <span className="ep-note">checklist de saída</span>
          <span className="ep-big">{pr.score}/12</span>
          <span className="ep-note">{pr.score >= 10 ? 'nível case' : pr.score >= 7 ? 'acima da média' : 'ainda básico'}</span>
        </>
      ) : (
        <>
          <span className="ep-note">este sketchbook pertence a</span>
          <span className="ep-title">{p.title}</span>
          {p.client && <span className="ep-note">{p.client}</span>}
          <span className="ep-line" />
          <span className="ep-note">
            ficha de partida · {pr.ficha}/10 · {pr.done}/{pr.total} módulos prontos
          </span>
        </>
      )}
    </div>
  );
}

/** O sketchbook aberto em 3D: as páginas viram, e um toque abre a página escolhida para criar. */
export function Flipbook({ project: p, onClose, onOpen }: { project: Project; onClose: () => void; onOpen: (v: ViewId) => void }) {
  const leaves: Leaf[] = useMemo(
    () => [
      { key: 'front', label: 'Ficha de partida', view: 'ficha', node: <Endpaper project={p} /> },
      ...MODULES.map((m) => ({ key: m.id, label: `${m.n} · ${m.title}`, view: m.id as ViewId, node: <ModulePage project={p} id={m.id} small /> })),
      { key: 'back', label: 'Checklist de saída', view: 'checklist', node: <Endpaper project={p} back /> },
    ],
    [p],
  );
  const spreads = Math.ceil(leaves.length / 2);
  const [s, setS] = useState(0);
  const [turn, setTurn] = useState<0 | 1 | -1>(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; t: number } | null>(null);
  const swiped = useRef(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const go = (dir: 1 | -1) => {
    if (turn) return;
    const n = s + dir;
    if (n < 0 || n >= spreads) return;
    if (reduced) return setS(n);
    setTurn(dir);
  };
  const endTurn = () => {
    setS((v) => v + turn);
    setTurn(0);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const L = (i: number) => leaves[i];
  // o que fica parado embaixo durante a virada
  const left = turn === -1 ? L(2 * (s - 1)) : L(2 * s);
  const right = turn === 1 ? L(2 * (s + 1) + 1) : L(2 * s + 1);
  const leafFront = turn === 1 ? L(2 * s + 1) : turn === -1 ? L(2 * (s - 1) + 1) : null;
  const leafBack = turn === 1 ? L(2 * (s + 1)) : turn === -1 ? L(2 * s) : null;

  const stack = (n: number, side: 1 | -1) =>
    Array.from({ length: Math.min(n, 14) }, (_, i) => `${side * (i + 1) * 1.6}px ${(i + 1) * 0.9}px 0 0 ${i % 2 ? 'var(--sheet-deep)' : 'var(--sheet)'}`).join(', ') || 'none';
  const before = s * 2;
  const after = leaves.length - (s * 2 + 2);

  const page = (leaf: Leaf | undefined, side: 'l' | 'r') =>
    leaf ? (
      <button className={'fb-page fb-' + side} onClick={() => onOpen(leaf.view)} aria-label={`Abrir ${leaf.label}`}>
        <div className="fb-page-inner">{leaf.node}</div>
        <span className="fb-open">abrir {leaf.label.toLowerCase()}</span>
      </button>
    ) : (
      <div className={'fb-page fb-' + side + ' fb-blank'} />
    );

  const cur = [L(2 * s), L(2 * s + 1)].filter(Boolean) as Leaf[];

  return (
    <div className="fb" role="dialog" aria-label={`Folhear ${p.title}`}>
      <div
        className="fb-stage"
        onPointerMove={(e) => {
          if (reduced || e.pointerType !== 'mouse') return;
          const r = e.currentTarget.getBoundingClientRect();
          setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
        }}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        onPointerDown={(e) => (drag.current = { x: e.clientX, t: Date.now() })}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          swiped.current = !!d && Math.abs(e.clientX - d.x) > 12;
          if (d && Math.abs(e.clientX - d.x) > 50 && Date.now() - d.t < 800) go(e.clientX < d.x ? 1 : -1);
        }}
        onClickCapture={(e) => {
          // arrastar para virar não conta como toque para abrir a página
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > 30) go(e.deltaX > 0 ? 1 : -1);
        }}
      >
        <div className="fb-book" style={{ '--tx': tilt.x, '--ty': tilt.y } as CSSProperties}>
          <div className="fb-shadow" aria-hidden="true" />
          <div className="fb-half fb-half-l" style={{ boxShadow: stack(before, -1) }}>
            {page(left, 'l')}
          </div>
          <div className="fb-half fb-half-r" style={{ boxShadow: stack(after, 1) }}>
            {page(right, 'r')}
          </div>
          <div className="fb-gutter" aria-hidden="true" />
          {turn !== 0 && (
            <div className={'fb-leaf ' + (turn === 1 ? 'fwd' : 'bwd')} onAnimationEnd={endTurn} aria-hidden="true">
              <div className="fb-face front">{leafFront?.node}</div>
              <div className="fb-face back">{leafBack?.node}</div>
            </div>
          )}
          {s < spreads - 1 && !turn && <button className="fb-corner r" onClick={() => go(1)} aria-label="Virar a página" />}
          {s > 0 && !turn && <button className="fb-corner l" onClick={() => go(-1)} aria-label="Voltar a página" />}
        </div>
      </div>

      <div className="fb-scrub">
        <span className="fb-where" aria-live="polite">
          {cur.map((c) => c.label).join('  ·  ')}
        </span>
        <input
          type="range"
          min={0}
          max={spreads - 1}
          value={s}
          aria-label="Ir para a página"
          onChange={(e) => {
            setTurn(0);
            setS(+e.target.value);
          }}
        />
      </div>

      <div className="round-row">
        <button className="round" onClick={onClose} aria-label="Fechar o sketchbook">
          <Icon name="close" size={18} />
          <span>fechar</span>
        </button>
        <button className="round" onClick={() => go(-1)} disabled={s === 0} aria-label="Página anterior">
          <Icon name="back" size={18} />
          <span>voltar</span>
        </button>
        <button className="round" onClick={() => go(1)} disabled={s >= spreads - 1} aria-label="Próxima página">
          <Icon name="next" size={18} />
          <span>virar</span>
        </button>
        <button className="round primary" onClick={() => onOpen(cur[cur.length - 1]?.view ?? 'map')} aria-label={`Criar em ${cur[cur.length - 1]?.label ?? ''}`}>
          <Icon name="edit" size={18} />
          <span>criar</span>
        </button>
      </div>
    </div>
  );
}
