import { useEffect, useRef, useState } from 'react';
import { MODULES, MODULE_BY_ID, type ModuleId } from '../../data/recipe';
import type { AiReview, ImportRecord, Project } from '../../data/types';
import { useProjects } from '../../store/useProjects';
import { AssetImage } from '../../components/AssetImage';
import { Icon } from '../../components/Icon';
import { importFiles, reviewWithAi, type ImportProgress } from '../../lib/importFlow';
import { ACCEPT_HINT } from '../../lib/importers';
import { takeImport } from '../../lib/pendingImport';
import { readableOn, uid } from '../../lib/util';
import type { ViewId } from '../Workspace';

const KIND_LABEL: Record<ImportRecord['kind'], string> = {
  image: 'Imagem',
  svg: 'Vetor SVG',
  pdf: 'PDF',
  psd: 'Photoshop',
  office: 'Apresentação ou documento',
  archive: 'Pacote',
  video: 'Vídeo',
  font: 'Fonte',
  text: 'Texto',
  other: 'Outro formato',
};

const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/** Slot com espaço para mais uma imagem (a página do módulo mostra até 4). */
function sendToModule(p: Project, mid: ModuleId, assetId: string) {
  const m = p.modules[mid];
  const slot = m.slots.find((s) => s.assetIds.length < 4) ?? m.slots[0];
  if (!slot.assetIds.includes(assetId)) slot.assetIds.push(assetId);
  if (m.status === 'vazio') m.status = 'rascunho';
}

export function ImportView({ project: p, onGo, onAi }: { project: Project; onGo: (v: ViewId) => void; onAi: () => void }) {
  const { addBlobs, update } = useProjects();
  const [drag, setDrag] = useState(false);
  const [prog, setProg] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = !!prog && prog.step !== 'Pronto';

  const run = async (files: File[]) => {
    if (!files.length || busy) return;
    setError(null);
    try {
      await importFiles(p.id, files, addBlobs, update, setProg);
    } catch (e) {
      console.error(e);
      setError('Não foi possível ler um dos arquivos. Tente exportá-lo como PDF ou PNG e importe de novo.');
    } finally {
      setProg(null);
    }
  };

  // arquivos escolhidos no escritório
  useEffect(() => {
    const files = takeImport(p.id);
    if (files.length) run(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  const imports = p.imports ?? [];

  return (
    <div className="view imp-view">
      <header className="view-head">
        <span className="eyebrow">Estúdio</span>
        <h1 className="view-title">
          Material <em>pronto</em>
        </h1>
        <p className="view-lede">
          Traga uma identidade visual que já existe, em qualquer formato. O IDEÁRIO separa as páginas, as cores, as fontes e os textos, mede tudo pela receita e aponta o que melhorar em composição e direção visual.
        </p>
      </header>

      <div
        className={'drop imp-drop' + (drag ? ' on' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          run([...e.dataTransfer.files]);
        }}
      >
        <Icon name={busy ? 'rotate' : 'upload'} size={24} />
        <div className="imp-drop-text">
          {busy ? (
            <>
              <b>
                {prog!.step}
                {prog!.file ? ` · ${prog!.file}` : ''}
              </b>
              <span className="mono">
                arquivo {Math.min(prog!.done + 1, prog!.total)} de {prog!.total}
              </span>
              <span className="imp-bar" aria-hidden="true">
                <span style={{ width: `${((prog!.done + 0.5) / prog!.total) * 100}%` }} />
              </span>
            </>
          ) : (
            <>
              <b>Solte aqui qualquer arquivo</b>
              <span className="imp-hint">{ACCEPT_HINT} e outros</span>
            </>
          )}
        </div>
        <button className="btn btn-sm btn-dark" onClick={() => fileRef.current?.click()} disabled={busy}>
          Escolher arquivos
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => e.target.files && run([...e.target.files])} />
      </div>
      <p className="sr" role="status" aria-live="polite">
        {busy ? prog!.step : ''}
      </p>
      {error && (
        <p className="form-error" role="alert">
          <Icon name="warn" size={14} /> {error}
        </p>
      )}

      {imports.length ? (
        imports.map((rec) => <ImportCard key={rec.id} project={p} rec={rec} onGo={onGo} onAi={onAi} />)
      ) : (
        <div className="lib-empty">
          <p>Nenhum material importado ainda. Um PDF do manual atual, os PNGs das peças ou o arquivo do Illustrator já bastam para começar.</p>
        </div>
      )}
    </div>
  );
}

function ImportCard({ project: p, rec, onGo, onAi }: { project: Project; rec: ImportRecord; onGo: (v: ViewId) => void; onAi: () => void }) {
  const { update } = useProjects();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const edit = (fn: (r: ImportRecord) => void) =>
    update(p.id, (x) => {
      const r = x.imports?.find((y) => y.id === rec.id);
      if (r) fn(r);
    });

  const send = (pageIdx: number, mid: ModuleId) =>
    update(p.id, (x) => {
      const r = x.imports?.find((y) => y.id === rec.id);
      if (!r) return;
      sendToModule(x, mid, r.pages[pageIdx].assetId);
      r.pages[pageIdx].sentTo = mid;
    });

  const usePalette = () => {
    update(p.id, (x) => {
      const top = rec.palette.slice(0, 4);
      const total = top.reduce((n, c) => n + c.share, 0) || 1;
      x.palette = top.map((c, i) => ({ id: uid('c'), name: i === 0 ? 'Cor-dona' : `Apoio ${i}`, hex: c.hex, pms: '', share: Math.round((c.share / total) * 100) }));
      if (x.modules.M07.status === 'vazio') x.modules.M07.status = 'rascunho';
    });
    setDone('A paleta do projeto agora é a do material. Ajuste nomes e Pantone no módulo 07.');
  };

  const analyze = async () => {
    setAiBusy(true);
    setAiErr(null);
    try {
      const ai = await reviewWithAi(p, rec);
      edit((r) => (r.ai = ai));
    } catch (e: any) {
      const code = e?.code;
      setAiErr(
        code === 'unavailable'
          ? 'A análise com IA funciona quando o IDEÁRIO está aberto no claude.ai. O diagnóstico automático abaixo continua valendo.'
          : code === 'rate_limited'
            ? 'Muitas análises seguidas. Espere um minuto e tente de novo.'
            : code === 'declined'
              ? 'A análise foi recusada. Tente de novo quando quiser.'
              : 'A análise não respondeu agora. Tente de novo em instantes.',
      );
    } finally {
      setAiBusy(false);
    }
  };

  const distribute = (ai: AiReview) => {
    let n = 0;
    update(p.id, (x) => {
      const r = x.imports?.find((y) => y.id === rec.id);
      if (!r) return;
      for (const s of ai.modulos) {
        const pg = r.pages[s.pagina - 1];
        if (!pg || !(s.modulo in MODULE_BY_ID)) continue;
        sendToModule(x, s.modulo as ModuleId, pg.assetId);
        pg.sentTo = s.modulo;
        n++;
      }
    });
    setDone(n ? `${n} ${n === 1 ? 'página enviada' : 'páginas enviadas'} para os módulos sugeridos.` : 'Nenhuma sugestão aplicável.');
  };

  const warn = rec.pages.reduce((n, pg) => n + pg.findings.filter((f) => !f.ok).length, 0);

  return (
    <article className="imp-card" aria-label={rec.fileName}>
      <header className="imp-head">
        <div className="imp-file">
          <span className="imp-kind mono">{KIND_LABEL[rec.kind]}</span>
          <h2 className="imp-name">{rec.fileName}</h2>
          <span className="mono imp-meta">
            {size(rec.size)} · {rec.pages.length} {rec.pages.length === 1 ? 'página' : 'páginas'}
            {rec.fonts.length ? ` · ${rec.fonts.length} ${rec.fonts.length === 1 ? 'fonte' : 'fontes'}` : ''}
            {rec.pages.length ? ` · ${warn} ${warn === 1 ? 'ponto a melhorar' : 'pontos a melhorar'}` : ''}
          </span>
        </div>
        {confirmDel ? (
          <div className="confirm-row">
            <span>Tirar da lista? As imagens ficam na biblioteca.</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDel(false)}>
              Manter
            </button>
            <button className="btn btn-sm btn-orange" onClick={() => update(p.id, (x) => (x.imports = (x.imports ?? []).filter((y) => y.id !== rec.id)))}>
              Tirar
            </button>
          </div>
        ) : (
          <button className="icon-btn" onClick={() => setConfirmDel(true)} aria-label={`Tirar ${rec.fileName} da lista`}>
            <Icon name="trash" size={16} />
          </button>
        )}
      </header>

      {rec.note && (
        <p className="imp-note">
          <Icon name="warn" size={14} /> {rec.note}
        </p>
      )}

      {(rec.palette.length > 0 || rec.fonts.length > 0) && (
        <div className="imp-identity">
          {rec.palette.length > 0 && (
            <div className="imp-pal">
              <span className="eyebrow">Paleta detectada</span>
              <div className="imp-chips">
                {rec.palette.slice(0, 8).map((c) => (
                  <span key={c.hex} className="imp-chip" style={{ background: c.hex, color: readableOn(c.hex) }}>
                    <b className="mono">{c.hex.toUpperCase()}</b>
                    <small className="mono">{c.share}%</small>
                  </span>
                ))}
              </div>
              <div className="imp-actions">
                <button className="btn btn-sm btn-dark" onClick={usePalette}>
                  <Icon name="palette" size={14} /> Usar como paleta do projeto
                </button>
                {rec.palette.length > 4 && <span className="imp-hint">A receita pede até 4 cores. Entram as 4 com mais área.</span>}
              </div>
            </div>
          )}
          {rec.fonts.length > 0 && (
            <div className="imp-fonts">
              <span className="eyebrow">Fontes</span>
              <ul>
                {rec.fonts.slice(0, 10).map((f) => (
                  <li key={f} style={{ fontFamily: `"${f}", var(--font-body)` }}>
                    {f}
                  </li>
                ))}
              </ul>
              <button className="link-btn" onClick={() => onGo('M06')}>
                Definir registros no módulo 06 <Icon name="next" size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {rec.pages.length > 0 && (
        <ol className="imp-pages">
          {rec.pages.map((pg, i) => {
            const a = p.assets.find((x) => x.id === pg.assetId);
            return (
              <li key={pg.assetId} className="imp-page">
                <div className="imp-thumb">
                  <AssetImage asset={a} alt={`Página ${i + 1} de ${rec.fileName}`} />
                  <span className="imp-pn mono">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="imp-page-body">
                  <span className="mono imp-meta">
                    {pg.w} × {pg.h} px
                  </span>
                  <ul className="imp-findings">
                    {pg.findings.map((f) => (
                      <li key={f.label} className={f.ok ? 'ok' : 'warn'}>
                        <Icon name={f.ok ? 'check' : 'warn'} size={13} stroke={f.ok ? 3 : 2} />
                        <span>
                          <b>{f.label}</b>
                          <span className="sr">{f.ok ? ' ok' : ' a melhorar'}</span>: {f.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <label className="field imp-send">
                    <span>{pg.sentTo ? `Está no módulo ${MODULE_BY_ID[pg.sentTo as ModuleId]?.n ?? ''}` : 'Enviar para o módulo'}</span>
                    <div className="imp-send-row">
                      <select
                        id={`imp-send-${rec.id}-${i}`}
                        value=""
                        onChange={(e) => e.target.value && send(i, e.target.value as ModuleId)}
                      >
                        <option value="">{pg.sentTo ? 'Enviar também para…' : 'Escolha o módulo…'}</option>
                        {MODULES.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.n} · {m.title}
                          </option>
                        ))}
                      </select>
                      {pg.sentTo && (
                        <button className="btn btn-sm btn-ghost" onClick={() => onGo(pg.sentTo as ModuleId)}>
                          Abrir
                        </button>
                      )}
                    </div>
                  </label>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rec.texts.length > 0 && (
        <details className="imp-texts">
          <summary>
            Textos encontrados <span className="mono">· {rec.texts.length}</span>
          </summary>
          <ul>
            {rec.texts.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <p className="imp-hint">Use como matéria-prima: a receita pede até 40 palavras por módulo e texto real da marca.</p>
        </details>
      )}

      <section className="imp-ai" aria-label="Direção visual com IA">
        {rec.ai ? (
          <AiResult ai={rec.ai} onDistribute={() => distribute(rec.ai!)} onRedo={analyze} busy={aiBusy} />
        ) : (
          <div className="imp-ai-cta">
            <div>
              <span className="eyebrow">Diretor de arte</span>
              <p>A IA olha as páginas e diz o que mudar em grid, escala, hierarquia, cor e tipografia, e em qual módulo cada página entra.</p>
            </div>
            <button className="btn btn-violet" onClick={analyze} disabled={aiBusy || (!rec.pages.length && !rec.texts.length)}>
              <Icon name={aiBusy ? 'rotate' : 'sparkle'} size={15} /> {aiBusy ? 'Analisando…' : 'Analisar direção visual com IA'}
            </button>
          </div>
        )}
        {aiErr && (
          <p className="form-error" role="alert">
            <Icon name="warn" size={14} /> {aiErr}
          </p>
        )}
      </section>

      {done && (
        <p className="imp-done" role="status">
          <Icon name="check" size={14} stroke={3} /> {done}{' '}
          <button className="link-btn" onClick={onAi}>
            Pedir ajuda ao assistente
          </button>
        </p>
      )}
    </article>
  );
}

function AiResult({ ai, onDistribute, onRedo, busy }: { ai: AiReview; onDistribute: () => void; onRedo: () => void; busy: boolean }) {
  const groups: [string, string[]][] = [
    ['Composição', ai.composicao],
    ['Hierarquia', ai.hierarquia],
    ['Cor', ai.cor],
    ['Tipografia', ai.tipografia],
  ];
  return (
    <div className="imp-ai-res">
      <div className="imp-ai-top">
        <span className="eyebrow">Direção visual · IA</span>
        {ai.nivel && <span className="imp-level">Nível hoje: {ai.nivel}</span>}
      </div>
      {ai.resumo && <p className="imp-ai-sum">{ai.resumo}</p>}
      <div className="imp-ai-grid">
        {groups
          .filter(([, l]) => l.length)
          .map(([t, l]) => (
            <div key={t}>
              <h3>{t}</h3>
              <ul>
                {l.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
      </div>
      {ai.proximos.length > 0 && (
        <>
          <h3>Próximos passos</h3>
          <ol className="imp-next">
            {ai.proximos.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </>
      )}
      {ai.modulos.length > 0 && (
        <>
          <h3>Onde cada página entra</h3>
          <ul className="imp-map">
            {ai.modulos.map((m, i) => (
              <li key={i}>
                <span className="mono">p. {m.pagina}</span> → <b>{MODULE_BY_ID[m.modulo as ModuleId]?.title ?? m.modulo}</b>
                {m.porque && <span> · {m.porque}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="imp-actions">
        {ai.modulos.length > 0 && (
          <button className="btn btn-sm btn-sun" onClick={onDistribute}>
            <Icon name="wand" size={14} /> Distribuir como a IA sugeriu
          </button>
        )}
        <button className="btn btn-sm btn-ghost" onClick={onRedo} disabled={busy}>
          <Icon name="rotate" size={14} /> {busy ? 'Analisando…' : 'Analisar de novo'}
        </button>
      </div>
    </div>
  );
}
