import { useEffect, useMemo, useRef, useState } from 'react';
import { MODULES } from '../../data/recipe';
import type { Project } from '../../data/types';
import { useProjects } from '../../store/useProjects';
import { AssetImage } from '../../components/AssetImage';
import { Icon } from '../../components/Icon';

export function LibraryView({ project: p }: { project: Project }) {
  const { addAssets, update, removeAsset, backend } = useProjects();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) {
      setError('Envie arquivos de imagem: PNG, JPG, WEBP, GIF ou SVG.');
      return;
    }
    setError(null);
    setBusy(imgs.length);
    try {
      await addAssets(p.id, imgs);
    } catch {
      setError('Não foi possível guardar a imagem. Tente um arquivo menor que 20 MB.');
    } finally {
      setBusy(0);
    }
  };

  // colar imagem com Ctrl/Cmd + V
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        upload(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const tags = useMemo(() => [...new Set(p.assets.flatMap((a) => a.tags))].sort(), [p.assets]);
  const usage = useMemo(() => {
    const u: Record<string, string[]> = {};
    for (const m of MODULES) for (const s of p.modules[m.id].slots) for (const a of s.assetIds) (u[a] ??= []).includes(m.id) || u[a].push(m.id);
    for (const s of p.cover.stickers) if (s.kind === 'image') (u[s.value] ??= []).push('capa');
    if (p.cover.imageAssetId) (u[p.cover.imageAssetId] ??= []).push('capa');
    return u;
  }, [p]);
  const list = p.assets.filter((a) => (!tag || a.tags.includes(tag)) && (!q || (a.name + ' ' + a.tags.join(' ')).toLowerCase().includes(q.toLowerCase())));
  const cur = p.assets.find((a) => a.id === sel);

  return (
    <div className="view lib-view">
      <header className="view-head">
        <span className="eyebrow">Estúdio</span>
        <h1 className="view-title">
          Biblioteca de <em>assets</em>
        </h1>
        <p className="view-lede">
          Referências, esboços, fotos e PNGs deste sketchbook. Arraste arquivos para cá, clique em enviar ou cole uma imagem.{' '}
          {backend === 'cloud' ? 'As imagens ficam guardadas com o IDEÁRIO na sua conta.' : 'As imagens ficam guardadas neste navegador.'}
        </p>
      </header>

      <div
        className={'drop' + (drag ? ' on' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload([...e.dataTransfer.files]);
        }}
      >
        <Icon name={busy ? 'rotate' : 'upload'} size={22} />
        <span>{busy ? `Guardando ${busy} ${busy === 1 ? 'imagem' : 'imagens'}…` : 'Solte imagens aqui'}</span>
        <button className="btn btn-sm btn-dark" onClick={() => fileRef.current?.click()} disabled={!!busy}>
          Enviar imagens
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload([...e.target.files])} />
      </div>
      {error && (
        <p className="form-error" role="alert">
          <Icon name="warn" size={14} /> {error}
        </p>
      )}

      <div className="lib-tools">
        <input id="lib-search" className="input" placeholder="Buscar por nome ou tag" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="tag-row" role="group" aria-label="Filtrar por tag">
          <button className={'tag-chip' + (!tag ? ' on' : '')} onClick={() => setTag(null)}>
            Todas · {p.assets.length}
          </button>
          {tags.map((t) => (
            <button key={t} className={'tag-chip' + (tag === t ? ' on' : '')} onClick={() => setTag(tag === t ? null : t)}>
              #{t}
            </button>
          ))}
        </div>
      </div>

      <div className="lib-body">
        {list.length ? (
          <ul className="lib-grid">
            {list.map((a) => (
              <li key={a.id}>
                <button className={'lib-item' + (sel === a.id ? ' on' : '')} onClick={() => setSel(sel === a.id ? null : a.id)} aria-pressed={sel === a.id}>
                  <AssetImage asset={a} alt="" />
                  <span className="lib-name">{a.name}</span>
                  {usage[a.id] && <span className="lib-used">{usage[a.id].join(' · ')}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="lib-empty">
            <p>{p.assets.length ? 'Nada com esse filtro.' : 'Nenhuma imagem ainda. Comece pelas referências do símbolo (módulo 03) e pelas fotos da marca no mundo (módulo 13).'}</p>
          </div>
        )}

        {cur && (
          <aside className="lib-detail" aria-label="Detalhes da imagem">
            <AssetImage asset={cur} alt={cur.name} className="lib-detail-img" />
            <label className="field">
              <span>Nome</span>
              <input id="lib-name" value={cur.name} onChange={(e) => update(p.id, (x) => (x.assets.find((y) => y.id === cur.id)!.name = e.target.value))} />
            </label>
            <label className="field">
              <span>Tags (separe por vírgula)</span>
              <input
                id="lib-tags"
                defaultValue={cur.tags.join(', ')}
                key={cur.id}
                onBlur={(e) =>
                  update(p.id, (x) => {
                    x.assets.find((y) => y.id === cur.id)!.tags = e.target.value
                      .split(',')
                      .map((t) => t.trim().toLowerCase())
                      .filter(Boolean);
                  })
                }
                placeholder="referência, esboço, mundo real"
              />
            </label>
            <p className="mono lib-meta">
              {cur.w && cur.h ? `${cur.w} × ${cur.h} px · ` : ''}
              {cur.type.replace('image/', '').toUpperCase()} · {cur.store === 'cloud' ? 'na conta' : 'no navegador'}
            </p>
            {usage[cur.id] && <p className="lib-meta">Usada em: {usage[cur.id].join(', ')}</p>}
            {confirm ? (
              <div className="confirm-row">
                <span>{usage[cur.id] ? 'Ela sai também dos módulos e da capa.' : 'Excluir de vez?'}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>
                  Manter
                </button>
                <button
                  className="btn btn-sm btn-orange"
                  onClick={async () => {
                    setConfirm(false);
                    setSel(null);
                    await removeAsset(p.id, cur.id);
                  }}
                >
                  Excluir
                </button>
              </div>
            ) : (
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirm(true)}>
                <Icon name="trash" size={14} /> Excluir imagem
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
