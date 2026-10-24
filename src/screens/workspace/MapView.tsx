import { ACTS, MODULE_BY_ID } from '../../data/recipe';
import type { Project } from '../../data/types';
import { caseFormula, moduleWords, progress } from '../../lib/progress';
import { Icon } from '../../components/Icon';
import { StatusMark, type ViewId } from '../Workspace';
import { AssetImage } from '../../components/AssetImage';

function Meter({ label, value, desc }: { label: string; value: number; desc: string }) {
  const state = value >= 1 ? 'Resolvido' : value > 0 ? 'Em curso' : 'Faltando';
  return (
    <div className={'formula-term v' + Math.round(value * 2)}>
      <span className="formula-label">{label}</span>
      <span className="formula-state">
        <Icon name={value >= 1 ? 'check' : value > 0 ? 'edit' : 'dot'} size={14} /> {state}
      </span>
      <span className="formula-desc">{desc}</span>
    </div>
  );
}

export function MapView({ project: p, onGo }: { project: Project; onGo: (v: ViewId) => void }) {
  const f = caseFormula(p);
  const pr = progress(p);
  const isCase = f.tensao >= 1 && f.sistema >= 1 && f.prova >= 1;
  const nextStep: { v: ViewId; t: string } =
    pr.ficha < 10 ? { v: 'ficha', t: `Completar a ficha de partida (${pr.ficha}/10)` } : pr.done < pr.total ? { v: ACTS.flatMap((a) => a.modules).find((id) => p.modules[id].status !== 'pronto' && !MODULE_BY_ID[id].optional)!, t: 'Seguir para o próximo módulo' } : { v: 'checklist', t: 'Passar no checklist de saída' };

  return (
    <div className="view map-view">
      <header className="view-head">
        <span className="eyebrow">00 · Mapa da receita</span>
        <h1 className="view-title">
          Catorze módulos, <em>quatro atos</em>.
        </h1>
        <p className="view-lede">Cada módulo responde a uma pergunta de quem rola a página. Preencha a ficha, siga a ordem e passe no checklist antes de publicar.</p>
      </header>

      <section className="formula" aria-label="Tensão mais sistema mais prova igual a case">
        <Meter label="Tensão" value={f.tensao} desc="Uma ideia que toma partido contra a convenção da categoria." />
        <span className="formula-op">+</span>
        <Meter label="Sistema" value={f.sistema} desc="Logo mais um segundo elemento que gera peças sem precisar dele." />
        <span className="formula-op">+</span>
        <Meter label="Prova" value={f.prova} desc="A marca vivendo no mundo: foto própria, uso, evento." />
        <span className="formula-op">=</span>
        <div className={'formula-term result' + (isCase ? ' is-case' : '')}>
          <span className="formula-label">Case</span>
          <span className="formula-state">{isCase ? 'Os três juntos' : 'Faltando um, volta a ser manual de uso'}</span>
        </div>
      </section>

      <section className="steps">
        <button className="step" onClick={() => onGo('ficha')}>
          <span className="step-n">1</span>
          <span className="step-t">Ficha de partida</span>
          <span className="step-v">{pr.ficha}/10</span>
        </button>
        <button className="step" onClick={() => onGo('M01')}>
          <span className="step-n">2</span>
          <span className="step-t">Ordem dos módulos</span>
          <span className="step-v">
            {pr.done}/{pr.total}
          </span>
        </button>
        <button className="step" onClick={() => onGo('checklist')}>
          <span className="step-n">3</span>
          <span className="step-t">Checklist de saída</span>
          <span className="step-v">{pr.score}/12</span>
        </button>
        <button className="step step-next" onClick={() => onGo(nextStep.v)}>
          <span className="step-t">{nextStep.t}</span>
          <Icon name="next" />
        </button>
      </section>

      <section className="acts">
        {ACTS.map((a) => (
          <div key={a.id} className="act">
            <div className="act-head">
              <span className="eyebrow">Ato {a.n}</span>
              <h2 className="act-name">{a.name}</h2>
              <p className="act-q">{a.question}</p>
            </div>
            <div className="act-mods">
              {a.modules.map((id) => {
                const m = MODULE_BY_ID[id];
                const st = p.modules[id];
                const firstImg = st.slots.flatMap((s) => s.assetIds)[0];
                const asset = firstImg ? p.assets.find((x) => x.id === firstImg) : undefined;
                const w = moduleWords(p, id);
                return (
                  <button key={id} className={'mod-card s-' + st.status} onClick={() => onGo(id)}>
                    <span className="mod-thumb">{asset ? <AssetImage asset={asset} alt="" /> : <span className="mod-thumb-n">{m.n}</span>}</span>
                    <span className="mod-info">
                      <span className="mod-title">
                        <b>{m.n}</b> {m.title}
                      </span>
                      <span className="mod-role">· {m.role}{m.optional ? '*' : ''}</span>
                      <span className="mod-meta">
                        <StatusMark status={st.status} /> {st.status} · {w} palavras{st.motion ? ' · movimento' : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
      <p className="footnote">* Opcional: o Motion acelera a retenção, mas não substitui ideia e sistema.</p>
    </div>
  );
}
