import { useState } from 'react';
import { CHECKLIST, MODULE_BY_ID, verdictFor } from '../../data/recipe';
import type { Project } from '../../data/types';
import { useProjects } from '../../store/useProjects';
import { checklistHint } from '../../lib/progress';
import { Icon } from '../../components/Icon';
import type { ViewId } from '../Workspace';

export function ChecklistView({ project: p, onGo }: { project: Project; onGo: (v: ViewId) => void }) {
  const { update } = useProjects();
  const [confirm, setConfirm] = useState(false);
  const score = p.checklist.filter(Boolean).length;
  const v = verdictFor(score);
  const tier = score >= 10 ? 'case' : score >= 7 ? 'mid' : 'basic';

  return (
    <div className="view check-view">
      <header className="view-head">
        <span className="eyebrow">Antes de publicar</span>
        <h1 className="view-title">
          Checklist de <em>saída</em>
        </h1>
        <p className="view-lede">Marque o que o manual já entrega. A sigla à direita leva ao módulo que resolve cada linha. Dez de doze ou mais é nível case.</p>
      </header>

      <div className="check-grid">
        <ol className="check-list">
          {CHECKLIST.map((it, i) => {
            const on = p.checklist[i];
            const hint = !on ? checklistHint(p, i) : null;
            return (
              <li key={i} className={'check-item' + (on ? ' on' : '')}>
                <button className="check-btn" aria-pressed={on} onClick={() => update(p.id, (x) => (x.checklist[i] = !x.checklist[i]))}>
                  <span className="check-box" aria-hidden="true">
                    {on && <Icon name="check" size={14} stroke={3} />}
                  </span>
                  <span className="check-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="check-t">
                    {it.t}
                    {hint && (
                      <span className="check-hint">
                        <Icon name="warn" size={12} /> {hint}
                      </span>
                    )}
                  </span>
                </button>
                <button className="chip-link" onClick={() => onGo(it.m === 'ARQ' ? 'preview' : it.m)} title={it.m === 'ARQ' ? 'Arquitetura da apresentação' : MODULE_BY_ID[it.m].title}>
                  {it.m}
                </button>
              </li>
            );
          })}
        </ol>

        <aside className={'score-card t-' + tier}>
          <span className="eyebrow">Pontuação</span>
          <div className="score-num">
            <b>{score}</b>
            <span>/ 12</span>
          </div>
          <div className="score-segs" aria-hidden="true">
            {CHECKLIST.map((_, i) => (
              <span key={i} className={i < score ? 'on' : ''} />
            ))}
          </div>
          <div className="score-verdict">{v.label}</div>
          <p className="score-hint">{v.hint}</p>
          <dl className="score-scale">
            <div className={tier === 'basic' ? 'cur' : ''}>
              <dt>0–6</dt>
              <dd>Manual básico</dd>
            </div>
            <div className={tier === 'mid' ? 'cur' : ''}>
              <dt>7–9</dt>
              <dd>Acima da média</dd>
            </div>
            <div className={tier === 'case' ? 'cur' : ''}>
              <dt>10–12</dt>
              <dd>Nível case</dd>
            </div>
          </dl>
          {confirm ? (
            <div className="confirm-row">
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>
                Manter
              </button>
              <button
                className="btn btn-sm btn-orange"
                onClick={() => {
                  update(p.id, (x) => (x.checklist = x.checklist.map(() => false)));
                  setConfirm(false);
                }}
              >
                Limpar tudo
              </button>
            </div>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirm(true)} disabled={!score}>
              Limpar marcações
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
