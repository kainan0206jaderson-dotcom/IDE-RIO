import { FICHA, MODULE_BY_ID } from '../../data/recipe';
import type { Project } from '../../data/types';
import { useProjects } from '../../store/useProjects';
import { fichaFilled } from '../../lib/progress';
import { Icon } from '../../components/Icon';
import type { ViewId } from '../Workspace';

export function FichaView({ project: p, onGo, onAi }: { project: Project; onGo: (v: ViewId) => void; onAi: () => void }) {
  const { update } = useProjects();
  const filled = fichaFilled(p);
  return (
    <div className="view ficha-view">
      <header className="view-head">
        <span className="eyebrow">Preencha antes do primeiro traço</span>
        <h1 className="view-title">
          Ficha de <em>partida</em>
        </h1>
        <p className="view-lede">Dez respostas antes de abrir o Illustrator. Cada linha alimenta um módulo do manual. Se uma ficar vazia, aquele módulo vai sair básico.</p>
        <div className="head-row">
          <div className="meter" aria-label={`${filled} de 10 linhas preenchidas`}>
            {FICHA.map((f) => (
              <span key={f.key} className={p.ficha[f.key]?.trim() ? 'on' : ''} />
            ))}
          </div>
          <span className="mono">{filled}/10 linhas</span>
          <button className="btn btn-sm btn-violet" onClick={onAi}>
            <Icon name="sparkle" size={14} /> Revisar com IA
          </button>
        </div>
      </header>

      <ol className="ficha">
        {FICHA.map((f) => {
          const v = p.ficha[f.key] ?? '';
          const empty = !v.trim();
          return (
            <li key={f.key} className={'ficha-line' + (empty ? ' empty' : ' done')}>
              <div className="ficha-meta">
                <span className="ficha-n">{String(f.n).padStart(2, '0')}</span>
                <span className="ficha-t">{f.title}</span>
                <span className="ficha-feeds">
                  →{' '}
                  {f.feeds.map((m) => (
                    <button key={m} className="chip-link" onClick={() => onGo(m)} title={MODULE_BY_ID[m].title}>
                      {m}
                    </button>
                  ))}
                </span>
              </div>
              <label className="ficha-q" htmlFor={'ficha-' + f.key}>
                {f.question}
              </label>
              <textarea
                id={'ficha-' + f.key}
                className="ficha-input"
                rows={2}
                value={v}
                placeholder={'ex.: ' + f.example}
                onChange={(e) => update(p.id, (x) => (x.ficha[f.key] = e.target.value))}
              />
              {empty && (
                <span className="ficha-warn">
                  <Icon name="warn" size={13} /> Vazia: {f.feeds.map((m) => MODULE_BY_ID[m].title).join(' e ')} tende a sair básico.
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="view-foot">
        <button className="btn btn-dark" onClick={() => onGo('M01')}>
          Começar pelo módulo 01 · Capa <Icon name="next" size={16} />
        </button>
      </div>
    </div>
  );
}
