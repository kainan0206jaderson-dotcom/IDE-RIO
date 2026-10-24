import { useEffect, useRef, useState } from 'react';
import type { Project } from '../data/types';
import { useProjects } from '../store/useProjects';
import { AssetImage } from './AssetImage';
import { Icon } from './Icon';

/** Escolher imagens da biblioteca (ou enviar novas) para um slot, capa ou adesivo. */
export function AssetPicker({ project: p, title, multiple = true, onPick, onClose }: { project: Project; title: string; multiple?: boolean; onPick: (ids: string[]) => void; onClose: () => void }) {
  const { addAssets } = useProjects();
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const upload = async (files: File[]) => {
    setBusy(true);
    try {
      const added = await addAssets(p.id, files);
      if (!multiple && added[0]) return onPick([added[0].id]);
      setSel((s) => [...added.map((a) => a.id), ...s]);
    } finally {
      setBusy(false);
    }
  };

  const list = p.assets.filter((a) => !q || (a.name + ' ' + a.tags.join(' ')).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal picker" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <h2 className="picker-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>
        <div className="picker-tools">
          <input id="picker-search" className="input" placeholder="Buscar por nome ou tag" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-dark btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Icon name={busy ? 'rotate' : 'upload'} size={14} /> {busy ? 'Enviando…' : 'Enviar imagem'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => e.target.files && upload([...e.target.files])} />
        </div>
        {list.length ? (
          <ul className="picker-grid">
            {list.map((a) => {
              const on = sel.includes(a.id);
              return (
                <li key={a.id}>
                  <button
                    className={'picker-item' + (on ? ' on' : '')}
                    aria-pressed={on}
                    onClick={() => (multiple ? setSel((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id])) : onPick([a.id]))}
                  >
                    <AssetImage asset={a} alt="" />
                    <span className="picker-name">{a.name}</span>
                    {on && (
                      <span className="picker-check">
                        <Icon name="check" size={14} stroke={3} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="picker-empty">
            <Icon name="image" size={28} />
            <p>{p.assets.length ? 'Nada encontrado com essa busca.' : 'A biblioteca deste sketchbook está vazia. Envie a primeira imagem.'}</p>
          </div>
        )}
        {multiple && (
          <div className="modal-actions">
            <span className="mono picker-count">{sel.length} selecionadas</span>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-sun" disabled={!sel.length} onClick={() => onPick(sel)}>
              Usar imagens
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
