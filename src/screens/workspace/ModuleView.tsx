import { useEffect, useState } from 'react';
import { FICHA, MODULE_BY_ID, MEASURES, type ModuleId } from '../../data/recipe';
import type { ModuleRhythm, ModuleStatus, Project } from '../../data/types';
import { useProjects } from '../../store/useProjects';
import { actOf, moduleWords } from '../../lib/progress';
import { countWords, hexToRgb, rgbToCmyk, uid, contrast } from '../../lib/util';
import { Icon } from '../../components/Icon';
import { ModulePage } from '../../components/ModulePage';
import { AssetImage } from '../../components/AssetImage';
import { AssetPicker } from '../../components/AssetPicker';
import { LOOSE_FONTS, RIGID_FONTS, loadFont, fontStack } from '../../lib/fonts';
import type { ViewId } from '../Workspace';

const STATUSES: { v: ModuleStatus; label: string; icon: string }[] = [
  { v: 'vazio', label: 'Vazio', icon: 'dot' },
  { v: 'rascunho', label: 'Rascunho', icon: 'edit' },
  { v: 'pronto', label: 'Pronto', icon: 'check' },
];

export function ModuleView({ project: p, id, onGo, onAi }: { project: Project; id: ModuleId; onGo: (v: ViewId) => void; onAi: () => void }) {
  const { update, addAssets } = useProjects();
  const m = MODULE_BY_ID[id];
  const st = p.modules[id];
  const act = actOf(id);
  const words = moduleWords(p, id);
  const [picker, setPicker] = useState<number | null>(null);
  const [thumb, setThumb] = useState(false);
  const [dragSlot, setDragSlot] = useState<number | null>(null);

  const set = (fn: (s: typeof st, proj: Project) => void) =>
    update(p.id, (x) => {
      fn(x.modules[id], x);
      if (x.modules[id].status === 'vazio') x.modules[id].status = 'rascunho';
    });

  const fichaLines = FICHA.filter((f) => f.feeds.includes(id));
  const emptyFicha = fichaLines.filter((f) => !p.ficha[f.key]?.trim());

  const dropFiles = async (slot: number, files: File[]) => {
    const added = await addAssets(p.id, files);
    if (added.length) set((s) => s.slots[slot].assetIds.push(...added.map((a) => a.id)));
  };

  return (
    <div className="view module-view">
      <header className="view-head">
        <span className="eyebrow">
          Ato {act.n} · {act.name} — Módulo {m.n} / 14{m.optional ? ' · opcional' : ''}
        </span>
        <h1 className="view-title">
          {m.title} <em>· {m.role}</em>
        </h1>
        <p className="view-lede">{m.objective}</p>
      </header>

      <div className="mod-controls">
        <div className="seg" role="radiogroup" aria-label="Status do módulo">
          {STATUSES.map((s) => (
            <button key={s.v} role="radio" aria-checked={st.status === s.v} className={'seg-btn st-' + s.v + (st.status === s.v ? ' on' : '')} onClick={() => update(p.id, (x) => (x.modules[id].status = s.v))}>
              <Icon name={s.icon} size={14} /> {s.label}
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Ritmo do módulo">
          {(['cheio', 'par'] as ModuleRhythm[]).map((r) => (
            <button key={r} role="radio" aria-checked={st.rhythm === r} className={'seg-btn' + (st.rhythm === r ? ' on' : '')} onClick={() => set((s) => (s.rhythm = r))}>
              <span className={'rh-icon rh-' + r} aria-hidden="true" /> {r === 'cheio' ? 'Cheio' : 'Par'}
            </button>
          ))}
        </div>
        <button className={'toggle' + (st.motion ? ' on' : '')} aria-pressed={st.motion} onClick={() => set((s) => (s.motion = !s.motion))}>
          <Icon name="motion" size={15} /> {st.motion ? 'Com movimento' : 'Estático'}
        </button>
        <span className={'words' + (words > MEASURES.maxWords ? ' over' : '')} aria-live="polite">
          {words > MEASURES.maxWords && <Icon name="warn" size={14} />}
          {words}/{MEASURES.maxWords} palavras
        </span>
      </div>

      {fichaLines.length > 0 && (
        <section className="from-ficha">
          <span className="eyebrow">Da ficha de partida</span>
          {fichaLines.map((f) => {
            const v = p.ficha[f.key]?.trim();
            return (
              <div key={f.key} className={'ff-line' + (v ? '' : ' empty')}>
                <span className="ff-n">{String(f.n).padStart(2, '0')}</span>
                <span className="ff-t">
                  <b>{f.title}.</b> {v || 'Vazia: este módulo tende a sair básico.'}
                </span>
                {v ? (
                  <button className="btn btn-sm btn-ghost" onClick={() => set((s) => (s.slots[0].text = s.slots[0].text ? s.slots[0].text : v))} disabled={!!st.slots[0].text.trim()} title={st.slots[0].text.trim() ? 'O slot 1 já tem texto' : 'Copiar para o slot 1'}>
                    Usar no slot 1
                  </button>
                ) : (
                  <button className="btn btn-sm btn-ghost" onClick={() => onGo('ficha')}>
                    Preencher
                  </button>
                )}
              </div>
            );
          })}
          {emptyFicha.length > 0 && <span className="sr">{emptyFicha.length} linhas vazias</span>}
        </section>
      )}

      {id === 'M02' && <TensionMeter text={st.slots[0].text} />}
      {id === 'M06' && <TypeEditor project={p} />}
      {id === 'M07' && <PaletteEditor project={p} />}
      {id === 'M14' && <ClosingEditor project={p} />}

      <div className="mod-grid">
        <section className="slots" aria-label="Conteúdo do módulo">
          {st.slots.map((s, i) => (
            <div
              key={i}
              className={'slot' + (dragSlot === i ? ' drag' : '')}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                  setDragSlot(i);
                }
              }}
              onDragLeave={() => setDragSlot(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragSlot(null);
                dropFiles(i, [...e.dataTransfer.files]);
              }}
            >
              <div className="slot-head">
                <span className="slot-n">{i + 1}</span>
                <label className="slot-label" htmlFor={`slot-${id}-${i}`}>
                  {m.slots[i]}
                </label>
              </div>
              <textarea
                id={`slot-${id}-${i}`}
                className="slot-text"
                rows={2}
                value={s.text}
                placeholder="Escreva aqui. Texto real, nada de lorem ipsum."
                onChange={(e) => set((x) => (x.slots[i].text = e.target.value))}
              />
              <div className="slot-imgs">
                {s.assetIds.map((aid) => {
                  const a = p.assets.find((x) => x.id === aid);
                  return (
                    <span key={aid} className="slot-img">
                      <AssetImage asset={a} alt={a?.name} />
                      <button className="slot-img-x" aria-label="Remover imagem do slot" onClick={() => set((x) => (x.slots[i].assetIds = x.slots[i].assetIds.filter((y) => y !== aid)))}>
                        <Icon name="close" size={12} stroke={2.5} />
                      </button>
                    </span>
                  );
                })}
                <button className="slot-add" onClick={() => setPicker(i)}>
                  <Icon name="image" size={16} />
                  <span>Imagem</span>
                </button>
              </div>
              {/lorem|ipsum/i.test(s.text) && (
                <span className="slot-warn">
                  <Icon name="warn" size={13} /> Lorem ipsum é proibido pela receita.
                </span>
              )}
            </div>
          ))}
          <label className="field notes">
            <span>Notas internas (não vão para a página)</span>
            <textarea id={`notes-${id}`} rows={2} value={st.notes} onChange={(e) => update(p.id, (x) => (x.modules[id].notes = e.target.value))} placeholder="Ideias, referências, pendências…" />
          </label>
        </section>

        <aside className="page-col">
          <div className="page-col-head">
            <span className="eyebrow">Página 4:5 · 1400 × 1750 px</span>
            {id === 'M01' && (
              <button className={'toggle sm' + (thumb ? ' on' : '')} aria-pressed={thumb} onClick={() => setThumb(!thumb)}>
                <Icon name="eye" size={14} /> Teste a 200 px
              </button>
            )}
          </div>
          <div className={thumb ? 'thumb-test' : ''}>
            <ModulePage project={p} id={id} small={thumb} crop />
          </div>
          {id === 'M01' && <p className="page-note">O tracejado marca o recorte da capa do Behance (808 × 632 px).</p>}
          <button className="btn btn-violet btn-sm ai-eval-btn" onClick={onAi}>
            <Icon name="sparkle" size={14} /> Avaliar este módulo com IA
          </button>
        </aside>
      </div>

      {picker !== null && (
        <AssetPicker
          project={p}
          title={`Imagens para o slot ${picker + 1}`}
          onClose={() => setPicker(null)}
          onPick={(ids) => {
            set((x) => {
              const cur = x.slots[picker].assetIds;
              x.slots[picker].assetIds = [...cur, ...ids.filter((y) => !cur.includes(y))];
            });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function TensionMeter({ text }: { text: string }) {
  const w = countWords(text);
  const ok = w > 0 && w <= MEASURES.maxTensionWords;
  return (
    <div className={'tension' + (w > MEASURES.maxTensionWords ? ' over' : ok ? ' ok' : '')}>
      <span className="eyebrow">Frase-tensão · slot 1</span>
      <span className="tension-text">{text.trim() || '[Frase-tensão em até 8 palavras]'}</span>
      <span className="tension-count">
        <Icon name={w > MEASURES.maxTensionWords ? 'warn' : ok ? 'check' : 'dot'} size={14} /> {w}/8 palavras
        {w > MEASURES.maxTensionWords ? ' · corte até caber em 8' : ok ? ' · alguém discordaria dela?' : ''}
      </span>
    </div>
  );
}

function TypeEditor({ project: p }: { project: Project }) {
  const { update } = useProjects();
  const ex = p.modules.M06.extra;
  const custom = [...new Set((p.fonts ?? []).map((f) => f.family))];
  useEffect(() => {
    RIGID_FONTS.concat(LOOSE_FONTS).forEach(loadFont);
  }, []);
  const setX = (k: string, v: string) =>
    update(p.id, (x) => {
      x.modules.M06.extra[k] = v;
      if (x.modules.M06.status === 'vazio') x.modules.M06.status = 'rascunho';
    });
  const sizes: [string, number][] = [
    ['Título', 96],
    ['Subtítulo', 48],
    ['Corpo', 18],
    ['Legenda', 12],
  ];
  return (
    <section className="special type-ed">
      <div className="type-pick">
        <span className="eyebrow">Registro rígido</span>
        <div className="font-chips" role="radiogroup" aria-label="Fonte do registro rígido">
          {[...custom, ...RIGID_FONTS].map((f) => (
            <button key={f} role="radio" aria-checked={ex.rigid === f} className={'font-chip' + (ex.rigid === f ? ' on' : '')} style={{ fontFamily: fontStack(f, 'sans') }} onClick={() => setX('rigid', f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="type-pick">
        <span className="eyebrow">Registro solto</span>
        <div className="font-chips" role="radiogroup" aria-label="Fonte do registro solto">
          {[...custom, ...LOOSE_FONTS].map((f) => (
            <button key={f} role="radio" aria-checked={ex.loose === f} className={'font-chip' + (ex.loose === f ? ' on' : '')} style={{ fontFamily: fontStack(f, 'serif') }} onClick={() => setX('loose', f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="type-scale" aria-label="Escala tipográfica">
        {sizes.map(([label, pt], i) => (
          <div key={label} className="ts-row">
            <span className="ts-meta mono">
              {label} · {pt} pt
            </span>
            <span className="ts-sample" style={{ fontFamily: i < 2 ? fontStack(ex.rigid, 'sans') : fontStack(ex.loose, 'serif'), fontSize: Math.max(12, Math.round(pt * 0.42)) }}>
              {i === 0 ? p.title : i === 1 ? p.ficha.slogan || 'Subtítulo da marca' : i === 2 ? p.ficha.tensao || 'Texto corrido da marca, com a voz definida na ficha.' : 'Legenda · crédito · data'}
            </span>
          </div>
        ))}
      </div>
      <label className="field">
        <span>Regra de uso: onde cada registro entra e onde nunca entra</span>
        <textarea id="m06-rule" rows={2} value={ex.rule ?? ''} onChange={(e) => setX('rule', e.target.value)} placeholder="ex.: didone no logo e na assinatura; condensada no preço e na sinalização; nunca as duas na mesma linha." />
      </label>
    </section>
  );
}

function PaletteEditor({ project: p }: { project: Project }) {
  const { update } = useProjects();
  const total = p.palette.reduce((n, c) => n + c.share, 0);
  const setP = (fn: (pal: Project['palette']) => void) =>
    update(p.id, (x) => {
      fn(x.palette);
      if (x.modules.M07.status === 'vazio') x.modules.M07.status = 'rascunho';
    });
  return (
    <section className="special pal-ed">
      <div className="pal-head">
        <div>
          <span className="eyebrow">Paleta do projeto</span>
          <p className="pal-note">Esta paleta é da marca que você está construindo. Ela não muda as cores da interface do IDEÁRIO.</p>
        </div>
        <button className="btn btn-sm btn-dark" disabled={p.palette.length >= 4} onClick={() => setP((pal) => pal.push({ id: uid('c'), name: pal.length ? 'Apoio' : 'Cor-dona', hex: '#8C8C8C', pms: '', share: pal.length ? 15 : 60 }))}>
          <Icon name="plus" size={14} /> {p.palette.length >= 4 ? 'Máximo de 4 cores' : 'Cor ' + String(p.palette.length + 1).padStart(2, '0')}
        </button>
      </div>
      {p.palette.length > 0 && (
        <div className="pal-bar" aria-label="Proporção de uso">
          {p.palette.map((c) => (
            <span key={c.id} style={{ flexGrow: Math.max(c.share, 1), background: c.hex }} title={`${c.name} ${c.share}%`} />
          ))}
        </div>
      )}
      <ol className="pal-list">
        {p.palette.map((c, i) => {
          const rgb = hexToRgb(c.hex);
          const cmyk = rgb ? rgbToCmyk(rgb) : null;
          return (
            <li key={c.id} className="pal-row">
              <span className="pal-n">{String(i + 1).padStart(2, '0')}</span>
              <label className="pal-swatch" style={{ background: c.hex }}>
                <span className="sr">Escolher cor {c.name}</span>
                <input id={'pal-color-' + c.id} type="color" value={rgb ? c.hex : '#000000'} onChange={(e) => setP((pal) => (pal[i].hex = e.target.value.toUpperCase()))} />
              </label>
              <div className="pal-fields">
                <input id={'pal-name-' + c.id} className="input" aria-label="Nome da cor" value={c.name} onChange={(e) => setP((pal) => (pal[i].name = e.target.value))} />
                <div className="pal-codes">
                  <label>
                    HEX
                    <input id={'pal-hex-' + c.id} className="input mono-in" value={c.hex} onChange={(e) => setP((pal) => (pal[i].hex = e.target.value))} />
                  </label>
                  <label>
                    PMS
                    <input id={'pal-pms-' + c.id} className="input mono-in" value={c.pms} placeholder="ex.: 574 C" onChange={(e) => setP((pal) => (pal[i].pms = e.target.value))} />
                  </label>
                  <span className="pal-auto mono">
                    RGB {rgb ? rgb.join(' ') : '—'}
                    <br />
                    CMYK {cmyk ? cmyk.join(' ') : '—'}
                  </span>
                </div>
              </div>
              <label className="pal-share">
                <span className="mono">{c.share}%</span>
                <input id={'pal-share-' + c.id} type="range" min={0} max={100} value={c.share} aria-label={`Proporção de ${c.name}`} onChange={(e) => setP((pal) => (pal[i].share = +e.target.value))} />
              </label>
              <button className="icon-btn" aria-label={`Remover ${c.name}`} onClick={() => setP((pal) => pal.splice(i, 1))}>
                <Icon name="trash" size={16} />
              </button>
            </li>
          );
        })}
      </ol>
      {p.palette.length > 0 && (
        <p className={'pal-total' + (total !== 100 ? ' warn' : '')}>
          <Icon name={total === 100 ? 'check' : 'warn'} size={14} /> Proporção declarada: {total}%{total !== 100 ? ' · ajuste até somar 100%' : ''}
          {p.palette[0] && p.palette[0].share < 50 && ' · a cor-dona deveria ocupar a maior parte'}
        </p>
      )}
      {p.palette.length === 0 && <p className="pal-empty">Comece pela cor-dona: a cor que ninguém na categoria usa. Depois, até três cores de apoio.</p>}
      {p.palette.length >= 2 && contrast(p.palette[0].hex, p.palette[1].hex) < 1.5 && (
        <p className="pal-total warn">
          <Icon name="warn" size={14} /> As cores 01 e 02 estão muito próximas. Bloco de cor precisa de contraste.
        </p>
      )}
    </section>
  );
}

function ClosingEditor({ project: p }: { project: Project }) {
  const { update } = useProjects();
  const ex = p.modules.M14.extra;
  const setX = (k: string, v: string) =>
    update(p.id, (x) => {
      x.modules.M14.extra[k] = v;
      if (x.modules.M14.status === 'vazio') x.modules.M14.status = 'rascunho';
    });
  return (
    <section className="special close-ed">
      <label className="field">
        <span>Chamada para conversa</span>
        <input id="m14-cta" value={ex.cta ?? ''} onChange={(e) => setX('cta', e.target.value)} placeholder="Vamos conversar?" />
      </label>
      <label className="field">
        <span>E-mail direto</span>
        <input id="m14-email" type="email" value={ex.email ?? ''} onChange={(e) => setX('email', e.target.value)} placeholder="contato@estudio.com" />
      </label>
      <label className="field">
        <span>Serviço com preço “a partir de”</span>
        <input id="m14-price" value={ex.price ?? ''} onChange={(e) => setX('price', e.target.value)} placeholder="Identidade a partir de R$ …" />
      </label>
      <label className="field">
        <span>Créditos por função (um por linha)</span>
        <textarea id="m14-credits" rows={4} value={ex.credits ?? ''} onChange={(e) => setX('credits', e.target.value)} placeholder={'Cliente: …\nDireção criativa: …\nDesign: …\nFotografia: …'} />
      </label>
    </section>
  );
}
