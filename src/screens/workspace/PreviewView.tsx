import { Fragment, type CSSProperties } from 'react';
import { ACTS, ARCH_RULES, MODULE_BY_ID } from '../../data/recipe';
import type { Project } from '../../data/types';
import { architecture } from '../../lib/progress';
import { ModulePage } from '../../components/ModulePage';
import { Icon } from '../../components/Icon';
import { readableOn } from '../../lib/util';
import { offerDownload } from '../../lib/claude';
import type { ViewId } from '../Workspace';

/** A rolagem completa do brandbook, com faixas entre atos e a leitura do ritmo. */
export function PreviewView({ project: p, onGo }: { project: Project; onGo: (v: ViewId) => void }) {
  const checks = architecture(p);
  const band = p.palette[0]?.hex;
  const bandStyle = (band ? { background: band, color: readableOn(band) } : {}) as CSSProperties;

  const exportText = () => {
    const lines: string[] = [`# ${p.title}`, ''];
    for (const a of ACTS) {
      lines.push(`## Ato ${a.n} — ${a.name}`, '');
      for (const id of a.modules) {
        const m = MODULE_BY_ID[id];
        const st = p.modules[id];
        if (m.optional && st.status === 'vazio') continue;
        lines.push(`### ${m.n} ${m.title} (${st.status}, ${st.rhythm}${st.motion ? ', movimento' : ''})`);
        st.slots.forEach((s, i) => s.text.trim() && lines.push(`${i + 1}. ${s.text.trim()}`));
        lines.push('');
      }
    }
    offerDownload(`${p.title.toLowerCase().replace(/[^\w]+/g, '-')}-roteiro.md`, lines.join('\n'), 'text/markdown');
  };

  return (
    <div className="view preview-view">
      <header className="view-head">
        <span className="eyebrow">Arquitetura da apresentação</span>
        <h1 className="view-title">
          Ordem, ritmo <em>e medidas</em>
        </h1>
        <p className="view-lede">A página é lida rolando: precisa de respiro, de crescendo e de um final. Aqui está o brandbook inteiro na ordem da receita, com a leitura de ritmo ao lado.</p>
        <div className="head-row">
          <button className="btn btn-sm btn-ghost" onClick={exportText}>
            <Icon name="download" size={14} /> Baixar roteiro (.md)
          </button>
        </div>
      </header>

      <div className="preview-grid">
        <div className="scroll-col" aria-label="Rolagem completa">
          {ACTS.map((a) => (
            <Fragment key={a.id}>
              <div className="act-band" style={bandStyle}>
                <span>Ato {a.n}</span>
                <b>{a.name}</b>
              </div>
              {a.modules.map((id) => {
                const m = MODULE_BY_ID[id];
                const st = p.modules[id];
                if (m.optional && st.status === 'vazio') return null;
                return (
                  <button key={id} className="scroll-item" onClick={() => onGo(id)} aria-label={`Editar ${m.title}`}>
                    <ModulePage project={p} id={id} />
                    <span className="scroll-tags">
                      <span className={'tag rh-' + st.rhythm}>{st.rhythm}</span>
                      {st.motion && (
                        <span className="tag motion">
                          <Icon name="motion" size={12} /> {m.id === 'M11' ? 'vídeo' : 'GIF'}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>

        <aside className="arch-col">
          <span className="eyebrow">Leitura do ritmo</span>
          <ol className="arch-list">
            {checks.map((c, i) => (
              <li key={i} className={'arch-item ' + (c.ok === true ? 'ok' : c.ok === false ? 'bad' : 'na')}>
                <span className="arch-icon">
                  <Icon name={c.ok === true ? 'check' : c.ok === false ? 'warn' : 'dot'} size={14} stroke={2.4} />
                </span>
                <span className="arch-body">
                  <b>{c.rule}</b>
                  <span>{c.detail}</span>
                  <small>{ARCH_RULES[i].d}</small>
                  {c.modules && c.modules.length > 0 && c.ok === false && (
                    <span className="arch-links">
                      {c.modules.map((m) => (
                        <button key={m} className="chip-link" onClick={() => onGo(m)}>
                          {m}
                        </button>
                      ))}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="measures">
            <span className="eyebrow">Medidas de referência</span>
            <ul>
              <li>Módulo: 1400 px de largura</li>
              <li>4:5 = 1400 × 1750 px</li>
              <li>Capa do Behance: 808 × 632 px</li>
              <li>Até 40 palavras por módulo</li>
              <li>1 movimento a cada 3–4 módulos</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
