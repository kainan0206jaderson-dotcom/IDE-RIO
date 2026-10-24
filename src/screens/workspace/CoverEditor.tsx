import { useRef, useState, type CSSProperties } from 'react';
import type { CoverFont, CoverPattern, CoverTexture, Project, Sticker } from '../../data/types';
import { useProjects } from '../../store/useProjects';
import { SketchbookCover, SHAPES, patternStyle } from '../../components/SketchbookCover';
import { AssetPicker } from '../../components/AssetPicker';
import { AssetImage } from '../../components/AssetImage';
import { Icon } from '../../components/Icon';
import { interfaceSwatches } from '../../design/tokens';
import { clamp, uid } from '../../lib/util';

const PATTERNS: [CoverPattern, string][] = [
  ['none', 'Liso'],
  ['dots', 'Pontos'],
  ['grid', 'Grade'],
  ['lines', 'Pautado'],
  ['diagonal', 'Listras'],
  ['checker', 'Xadrez'],
  ['waves', 'Ondas'],
];
const TEXTURES: [CoverTexture, string][] = [
  ['none', 'Nenhuma'],
  ['paper', 'Papel'],
  ['linen', 'Linho'],
  ['leather', 'Couro'],
  ['kraft', 'Kraft'],
  ['grain', 'Grão'],
];
const SHAPE_NAMES: Record<string, string> = { circle: 'círculo', square: 'quadrado', star: 'estrela', blob: 'mancha', asterisk: 'asterisco', arrow: 'seta', flower: 'flor' };

const FONTS: [CoverFont, string][] = [
  ['display', 'Condensada'],
  ['serif', 'Serifada'],
  ['mono', 'Mono'],
];

function ColorField({ id, label, value, onChange, swatches }: { id: string; label: string; value: string; onChange: (v: string) => void; swatches: { group: string; colors: string[] }[] }) {
  return (
    <div className="color-field">
      <span className="eyebrow">{label}</span>
      <div className="color-row">
        <label className="color-current" style={{ background: value }}>
          <span className="sr">{label}: escolher qualquer cor</span>
          <input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </label>
        <div className="color-groups">
          {swatches
            .filter((g) => g.colors.length)
            .map((g) => (
              <div key={g.group} className="color-group">
                <span className="color-group-name">{g.group}</span>
                <div className="swatches">
                  {g.colors.map((c) => (
                    <button key={g.group + c} className={'swatch' + (c.toLowerCase() === value.toLowerCase() ? ' on' : '')} style={{ background: c }} aria-label={`${g.group} ${c}`} aria-pressed={c.toLowerCase() === value.toLowerCase()} onClick={() => onChange(c)} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export function CoverEditor({ project: p }: { project: Project }) {
  const { update } = useProjects();
  const c = p.cover;
  const [sel, setSel] = useState<string | null>(null);
  const [picker, setPicker] = useState<'sticker' | 'cover' | null>(null);
  const [text, setText] = useState('');
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  const setC = (fn: (cv: Project['cover']) => void) => update(p.id, (x) => fn(x.cover));
  const swatches = [
    { group: 'Paleta do projeto', colors: p.palette.map((x) => x.hex) },
    { group: 'Paleta IDEÁRIO', colors: interfaceSwatches },
    { group: 'Materiais', colors: ['#C9A57B', '#8B5E3C', '#2F4B3A', '#7A1F2B', '#FFFFFF', '#9A9590'] },
  ];
  const selected = c.stickers.find((s) => s.id === sel);
  const add = (s: Omit<Sticker, 'id' | 'x' | 'y' | 'rotate'>) => {
    const id = uid('s');
    setC((cv) => cv.stickers.push({ ...s, id, x: 50 + (Math.random() * 20 - 10), y: 60 + (Math.random() * 20 - 10), rotate: Math.round(Math.random() * 20 - 10) }));
    setSel(id);
  };
  const setS = (fn: (s: Sticker) => void) => setC((cv) => fn(cv.stickers.find((s) => s.id === sel)!));

  const pos = (e: React.PointerEvent) => {
    const r = coverRef.current!.getBoundingClientRect();
    return { x: clamp(((e.clientX - r.left) / r.width) * 100, 0, 100), y: clamp(((e.clientY - r.top) / r.height) * 100, 0, 100) };
  };

  const shown = { ...p, cover: { ...c, stickers: c.stickers.map((s) => (drag && drag.id === s.id ? { ...s, x: drag.x, y: drag.y } : s)) } };

  return (
    <div className="view cover-view">
      <header className="view-head">
        <span className="eyebrow">Estúdio</span>
        <h1 className="view-title">
          Capa do <em>sketchbook</em>
        </h1>
        <p className="view-lede">A capa é do projeto: use a paleta da marca, outras cores, padrões, texturas, adesivos e PNGs. A paleta do IDEÁRIO aparece só como sugestão.</p>
      </header>

      <div className="cover-grid">
        <div className="cover-stage">
          <div className="cover-desk">
            <div className="cover-wrap" ref={coverRef}>
              <SketchbookCover project={shown} />
              <div className="sticker-handles">
                {shown.cover.stickers.map((s) => (
                  <button
                    key={s.id}
                    className={'handle' + (sel === s.id ? ' on' : '')}
                    style={{ left: s.x + '%', top: s.y + '%', width: Math.max(s.size, 8) + '%', aspectRatio: s.kind === 'text' ? '3 / 1' : '1', transform: `translate(-50%, -50%) rotate(${s.rotate}deg)` } as CSSProperties}
                    aria-label={`Adesivo ${s.kind === 'text' ? s.value : s.kind === 'image' ? 'imagem' : SHAPE_NAMES[s.value] ?? s.value}. Arraste para mover.`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      setSel(s.id);
                      setDrag({ id: s.id, ...pos(e) });
                    }}
                    onPointerMove={(e) => drag?.id === s.id && setDrag({ id: s.id, ...pos(e) })}
                    onPointerUp={() => {
                      if (drag) setC((cv) => Object.assign(cv.stickers.find((x) => x.id === drag.id)!, { x: drag.x, y: drag.y }));
                      setDrag(null);
                    }}
                    onKeyDown={(e) => {
                      const d = e.shiftKey ? 5 : 1;
                      const mv: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
                      if (mv[e.key]) {
                        e.preventDefault();
                        setC((cv) => {
                          const t = cv.stickers.find((x) => x.id === s.id)!;
                          t.x = clamp(t.x + mv[e.key][0], 0, 100);
                          t.y = clamp(t.y + mv[e.key][1], 0, 100);
                        });
                      }
                      if (e.key === 'Delete' || e.key === 'Backspace') {
                        setC((cv) => (cv.stickers = cv.stickers.filter((x) => x.id !== s.id)));
                        setSel(null);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className="page-note">Arraste os adesivos na capa. No teclado: setas movem, Shift acelera, Delete remove.</p>
        </div>

        <div className="cover-controls">
          <ColorField id="cv-bg" label="Fundo" value={c.bg} onChange={(v) => setC((cv) => (cv.bg = v))} swatches={swatches} />

          <div className="ctl">
            <span className="eyebrow">Padrão</span>
            <div className="opt-row">
              {PATTERNS.map(([v, l]) => (
                <button key={v} className={'opt-tile' + (c.pattern === v ? ' on' : '')} aria-pressed={c.pattern === v} onClick={() => setC((cv) => (cv.pattern = v))}>
                  <span className="opt-prev" style={{ background: c.bg, ...patternStyle(v, c.patternColor) }} />
                  {l}
                </button>
              ))}
            </div>
          </div>
          {c.pattern !== 'none' && <ColorField id="cv-pattern" label="Cor do padrão" value={c.patternColor} onChange={(v) => setC((cv) => (cv.patternColor = v))} swatches={swatches} />}

          <div className="ctl">
            <span className="eyebrow">Textura</span>
            <div className="opt-row">
              {TEXTURES.map(([v, l]) => (
                <button key={v} className={'opt-chip' + (c.texture === v ? ' on' : '')} aria-pressed={c.texture === v} onClick={() => setC((cv) => (cv.texture = v))}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="ctl two">
            <div>
              <span className="eyebrow">Letra do título</span>
              <div className="opt-row">
                {FONTS.map(([v, l]) => (
                  <button key={v} className={'opt-chip f-' + v + (c.titleFont === v ? ' on' : '')} aria-pressed={c.titleFont === v} onClick={() => setC((cv) => (cv.titleFont = v))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ColorField id="cv-title" label="Cor do título" value={c.titleColor} onChange={(v) => setC((cv) => (cv.titleColor = v))} swatches={swatches} />
          <ColorField id="cv-band" label="Elástico" value={c.band} onChange={(v) => setC((cv) => (cv.band = v))} swatches={swatches} />

          <div className="ctl">
            <span className="eyebrow">Imagem de capa</span>
            <div className="opt-row">
              {c.imageAssetId && (
                <span className="cover-thumb">
                  <AssetImage asset={p.assets.find((a) => a.id === c.imageAssetId)} alt="" />
                </span>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setPicker('cover')}>
                <Icon name="image" size={14} /> {c.imageAssetId ? 'Trocar' : 'Escolher imagem'}
              </button>
              {c.imageAssetId && (
                <button className="btn btn-sm btn-ghost" onClick={() => setC((cv) => (cv.imageAssetId = undefined))}>
                  Remover
                </button>
              )}
            </div>
          </div>

          <div className="ctl">
            <span className="eyebrow">Adesivos</span>
            <div className="opt-row">
              {Object.entries(SHAPES).map(([k, d]) => (
                <button key={k} className="shape-btn" aria-label={`Adesivo ${SHAPE_NAMES[k] ?? k}`} title={SHAPE_NAMES[k]} onClick={() => add({ kind: 'shape', value: k, color: p.palette[1]?.hex ?? interfaceSwatches[0], size: 26 })}>
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <path d={d} fill="currentColor" />
                  </svg>
                </button>
              ))}
              <button className="btn btn-sm btn-ghost" onClick={() => setPicker('sticker')}>
                <Icon name="image" size={14} /> PNG da biblioteca
              </button>
            </div>
            <form
              className="text-sticker"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                add({ kind: 'text', value: text.trim().slice(0, 24), color: c.titleColor, size: 30 });
                setText('');
              }}
            >
              <input id="cv-text" className="input" value={text} maxLength={24} placeholder="Texto do adesivo" onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-sm btn-dark" disabled={!text.trim()}>
                <Icon name="type" size={14} /> Adicionar
              </button>
            </form>
          </div>

          {selected && (
            <div className="ctl sticker-ctl">
              <div className="sticker-ctl-head">
                <span className="eyebrow">Adesivo selecionado</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setSel(null)}>
                  Concluir
                </button>
              </div>
              {selected.kind !== 'image' && <ColorField id="cv-sticker" label="Cor" value={selected.color} onChange={(v) => setS((s) => (s.color = v))} swatches={swatches} />}
              <label className="range">
                <span>Tamanho</span>
                <input id="cv-size" type="range" min={6} max={90} value={selected.size} onChange={(e) => setS((s) => (s.size = +e.target.value))} />
              </label>
              <label className="range">
                <span>Rotação</span>
                <input id="cv-rot" type="range" min={-180} max={180} value={selected.rotate} onChange={(e) => setS((s) => (s.rotate = +e.target.value))} />
              </label>
              <div className="opt-row">
                <button className="btn btn-sm btn-ghost" onClick={() => setC((cv) => { const i = cv.stickers.findIndex((s) => s.id === sel); const [s] = cv.stickers.splice(i, 1); cv.stickers.push(s); })}>
                  <Icon name="layers" size={14} /> Trazer para frente
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setC((cv) => (cv.stickers = cv.stickers.filter((s) => s.id !== sel)));
                    setSel(null);
                  }}
                >
                  <Icon name="trash" size={14} /> Remover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {picker && (
        <AssetPicker
          project={p}
          multiple={false}
          title={picker === 'cover' ? 'Imagem de capa' : 'PNG para adesivo'}
          onClose={() => setPicker(null)}
          onPick={([id]) => {
            if (picker === 'cover') setC((cv) => (cv.imageAssetId = id));
            else add({ kind: 'image', value: id, color: '', size: 34 });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
