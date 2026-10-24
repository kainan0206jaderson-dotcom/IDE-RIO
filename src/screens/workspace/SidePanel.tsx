import { useEffect, useRef, useState } from 'react';
import { ARCH_RULES, MODULE_BY_ID, type ModuleId } from '../../data/recipe';
import type { Project } from '../../data/types';
import { useProjects } from '../../store/useProjects';
import { getAi, type Ai } from '../../lib/claude';
import { projectSummary } from '../../lib/progress';
import { Icon } from '../../components/Icon';
import { isModule, type ViewId } from '../Workspace';

type Tab = 'guia' | 'ia';

export function SidePanel({ project: p, view, open, tab, onTab, onClose }: { project: Project; view: ViewId; open: boolean; tab: Tab; onTab: (t: Tab) => void; onClose: () => void }) {
  return (
    <aside className={'ws-panel' + (open ? ' open' : '')} aria-label="Guia e assistente">
      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'guia'} className={tab === 'guia' ? 'on' : ''} onClick={() => onTab('guia')}>
          <Icon name="book" size={15} /> Guia
        </button>
        <button role="tab" aria-selected={tab === 'ia'} className={'ai' + (tab === 'ia' ? ' on' : '')} onClick={() => onTab('ia')}>
          <Icon name="sparkle" size={15} /> Assistente
        </button>
        <button className="icon-btn panel-close" onClick={onClose} aria-label="Fechar painel">
          <Icon name="close" />
        </button>
      </div>
      <div className="panel-body">{tab === 'guia' ? <Guide view={view} /> : <Assistant project={p} view={view} />}</div>
    </aside>
  );
}

function Guide({ view }: { view: ViewId }) {
  if (isModule(view)) {
    const m = MODULE_BY_ID[view];
    return (
      <div className="guide">
        <span className="eyebrow">Módulo {m.n}</span>
        <h3 className="guide-title">{m.title}</h3>
        <p>{m.objective}</p>
        <span className="eyebrow">No módulo</span>
        <ol className="guide-list">
          {m.slots.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <div className="golden">
          <span className="eyebrow">Regra de ouro</span>
          <p>{m.goldenRule}</p>
        </div>
        <div className="vs">
          <div className="vs-basic">
            <span className="eyebrow">Básico</span>
            <p>{m.basic}</p>
          </div>
          <div className="vs-case">
            <span className="eyebrow">Case</span>
            <p>{m.caseLevel}</p>
          </div>
        </div>
        <span className="eyebrow">Visto em</span>
        <ul className="seen">
          {m.seenIn.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (view === 'ficha')
    return (
      <div className="guide">
        <span className="eyebrow">Como usar</span>
        <h3 className="guide-title">Ficha de partida</h3>
        <p>Responda as dez linhas antes de desenhar. Cada resposta aparece dentro do módulo que ela alimenta, pronta para virar texto da página.</p>
        <div className="golden">
          <span className="eyebrow">Regra</span>
          <p>Linha vazia na ficha vira módulo básico no manual.</p>
        </div>
        <p>A frase-tensão segue o molde “A categoria ___. Nós ___.” Se qualquer concorrente pudesse assiná-la, ainda é um valor genérico.</p>
      </div>
    );
  if (view === 'preview' || view === 'checklist')
    return (
      <div className="guide">
        <span className="eyebrow">Arquitetura</span>
        <h3 className="guide-title">Ordem, ritmo e medidas</h3>
        <ol className="guide-list rules">
          {ARCH_RULES.map((r) => (
            <li key={r.n}>
              <b>{r.t}.</b> {r.d}
            </li>
          ))}
        </ol>
      </div>
    );
  if (view === 'cover' || view === 'library')
    return (
      <div className="guide">
        <span className="eyebrow">Estúdio</span>
        <h3 className="guide-title">{view === 'cover' ? 'Capa do sketchbook' : 'Biblioteca'}</h3>
        <p>
          {view === 'cover'
            ? 'A capa identifica o projeto na sua mesa. Ela segue a direção de arte da marca, não a do IDEÁRIO: use a paleta do projeto, texturas e adesivos à vontade.'
            : 'Guarde aqui referências, esboços e fotos. Toda imagem pode ir para qualquer slot de módulo, para a capa ou virar adesivo.'}
        </p>
        <p>Dica: dê tags como “referência”, “esboço” e “mundo real” para achar rápido.</p>
      </div>
    );
  return (
    <div className="guide">
      <span className="eyebrow">Receita do Brandbook</span>
      <h3 className="guide-title">Base para manuais fora da curva</h3>
      <p>A estrutura vem de quatro cases que performam acima da média no Behance: OFF BRiEF, Jorixent, AYLA Furniture e GroveGolf.</p>
      <ol className="guide-list">
        <li>Preencha a ficha de partida antes do primeiro traço.</li>
        <li>Siga a ordem dos módulos e o ritmo da arquitetura. Só o Motion é opcional.</li>
        <li>Antes de publicar, passe no checklist de saída: 10 de 12 ou mais é nível case.</li>
      </ol>
    </div>
  );
}

/* ---------------- Assistente ---------------- */

interface Action {
  label: string;
  kind: 'list' | 'eval' | 'text';
  prompt: string;
  /** onde um item da lista pode ser aplicado */
  apply?: { label: string; to: (proj: Project, v: string) => void };
}

function actionsFor(view: ViewId): Action[] {
  const evalAction = (id: ModuleId): Action => ({
    label: 'Avaliar este módulo',
    kind: 'eval',
    prompt: `Avalie o módulo ${MODULE_BY_ID[id].n} "${MODULE_BY_ID[id].title}" deste brandbook segundo a receita.
Objetivo: ${MODULE_BY_ID[id].objective}
O que deve ter: ${MODULE_BY_ID[id].slots.join(' | ')}
Regra de ouro: ${MODULE_BY_ID[id].goldenRule}
Nível básico: ${MODULE_BY_ID[id].basic}
Nível case: ${MODULE_BY_ID[id].caseLevel}
Responda só com JSON: {"nivel":"básico"|"acima da média"|"case","porque":"uma frase","proximos":["até 3 ações concretas"]}`,
  });
  if (view === 'M02')
    return [
      {
        label: 'Sugerir frases-tensão',
        kind: 'list',
        prompt: 'Com base na ficha, proponha 5 frases-tensão para o manifesto. Cada uma com até 8 palavras, discutível, com atitude, que nenhum concorrente assinaria. Responda só com um JSON array de strings.',
        apply: { label: 'Usar no slot 1', to: (x, v) => ((x.modules.M02.slots[0].text = v), x.modules.M02.status === 'vazio' && (x.modules.M02.status = 'rascunho')) },
      },
      evalAction('M02'),
    ];
  if (view === 'M09')
    return [
      {
        label: 'Sugerir slogans',
        kind: 'list',
        prompt: 'Com base na ficha e na frase-tensão, proponha 5 slogans curtos com atitude, que possam virar título, estampa e assinatura. Responda só com um JSON array de strings.',
        apply: { label: 'Usar no slot 1', to: (x, v) => ((x.modules.M09.slots[0].text = v), x.modules.M09.status === 'vazio' && (x.modules.M09.status = 'rascunho')) },
      },
      evalAction('M09'),
    ];
  if (view === 'M08')
    return [
      {
        label: 'Sugerir geradores do sistema',
        kind: 'list',
        prompt: 'Proponha 4 geradores de sistema gráfico (padrão, silhueta, personagem ou supergráfico) nascidos do conceito desta marca, que gerem peças sem o logo. Cada item: uma frase curta com o gerador e onde ele aparece. Responda só com um JSON array de strings.',
        apply: { label: 'Usar no slot 1', to: (x, v) => ((x.modules.M08.slots[0].text = v), x.modules.M08.status === 'vazio' && (x.modules.M08.status = 'rascunho')) },
      },
      evalAction('M08'),
    ];
  if (view === 'M07')
    return [
      { label: 'Sugerir cor-dona', kind: 'text', prompt: 'Com base na convenção da categoria (ficha linha 02) e na ficha inteira, sugira 3 opções de cor-dona que a categoria não usa. Para cada uma: nome, HEX aproximado e em qual objeto físico ela vai morar. Seja breve, em lista.' },
      evalAction('M07'),
    ];
  if (isModule(view)) return [evalAction(view)];
  if (view === 'ficha')
    return [
      { label: 'Revisar a ficha', kind: 'text', prompt: 'Revise a ficha de partida linha por linha. Aponte as respostas genéricas (que qualquer concorrente poderia assinar) e as vazias, e sugira como deixar cada uma mais específica. Seja direto, no máximo 10 linhas.' },
      {
        label: 'Sugerir frases-tensão',
        kind: 'list',
        prompt: 'Com base na ficha, proponha 5 frases-tensão no molde "A categoria ___. Nós ___." Responda só com um JSON array de strings.',
        apply: { label: 'Usar na linha 03', to: (x, v) => (x.ficha.tensao = v) },
      },
    ];
  if (view === 'checklist' || view === 'preview')
    return [{ label: 'O que falta para nível case?', kind: 'text', prompt: 'Olhando o estado do projeto e o checklist de saída da receita, diga em ordem de impacto as 5 ações que mais aproximam este brandbook do nível case. Seja concreto e curto.' }];
  return [{ label: 'Qual o próximo passo?', kind: 'text', prompt: 'Olhando o estado do projeto, diga qual é o próximo passo mais importante e por quê, em até 4 linhas.' }];
}

const CONTEXT = (p: Project) =>
  `Você é o assistente criativo do IDEÁRIO, um sistema para criar brandbooks seguindo a "Receita do Brandbook" (14 módulos em 4 atos: a ideia, o núcleo, o sistema, a prova; Tensão + Sistema + Prova = Case; até 40 palavras por módulo; nada de lorem ipsum). Responda em português do Brasil, direto, sem floreio, sem inventar fatos sobre a marca que não estejam no projeto.\n\nESTADO DO PROJETO\n${projectSummary(p)}\n\n`;

interface Result {
  id: string;
  label: string;
  kind: Action['kind'] | 'chat';
  text?: string;
  items?: string[];
  evalr?: { nivel: string; porque: string; proximos: string[] };
  apply?: Action['apply'];
  error?: string;
  busy?: boolean;
}

function Assistant({ project: p, view }: { project: Project; view: ViewId }) {
  const { update } = useProjects();
  const [ai, setAi] = useState<Ai | null | undefined>(undefined);
  const [results, setResults] = useState<Result[]>([]);
  const [msg, setMsg] = useState('');
  const [used, setUsed] = useState<Set<string>>(new Set());
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAi().then(setAi);
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [results]);

  const patch = (id: string, r: Partial<Result>) => setResults((rs) => rs.map((x) => (x.id === id ? { ...x, ...r } : x)));
  const errText = (e: any) =>
    e?.code === 'not_granted' ? 'O assistente precisa da sua permissão para usar o Claude. Toque de novo e aceite o pedido.' : e?.code === 'rate_limited' ? 'Muitos pedidos seguidos. Espere alguns segundos.' : e?.name === 'AbortError' || e?.code === 'aborted' ? 'Resposta interrompida.' : 'O assistente não respondeu. Tente de novo.';

  const run = async (a: Action) => {
    if (!ai) return;
    const id = Math.random().toString(36).slice(2);
    setResults((rs) => [...rs, { id, label: a.label, kind: a.kind, busy: true, apply: a.apply }]);
    try {
      if (a.kind === 'list') {
        const items = await ai.json<string[]>(CONTEXT(p) + a.prompt);
        patch(id, { busy: false, items: Array.isArray(items) ? items.map(String).slice(0, 6) : [] });
      } else if (a.kind === 'eval') {
        const r = await ai.json<Result['evalr']>(CONTEXT(p) + a.prompt);
        patch(id, { busy: false, evalr: r && typeof r === 'object' ? { nivel: String(r.nivel ?? ''), porque: String(r.porque ?? ''), proximos: Array.isArray(r.proximos) ? r.proximos.map(String) : [] } : undefined });
      } else {
        abort.current = new AbortController();
        const text = await ai.ask(CONTEXT(p) + a.prompt, (t) => patch(id, { text: t }), abort.current.signal);
        patch(id, { busy: false, text });
      }
    } catch (e) {
      patch(id, { busy: false, error: errText(e) });
    }
  };

  const chat = async () => {
    const q = msg.trim();
    if (!q || !ai) return;
    setMsg('');
    const history = p.ai.slice(-8);
    const id = Math.random().toString(36).slice(2);
    setResults((rs) => [...rs, { id, label: q, kind: 'chat', busy: true }]);
    try {
      abort.current = new AbortController();
      const turns = [...history, { role: 'user' as const, content: (history.length ? '' : CONTEXT(p)) + q }];
      if (history.length) turns[0] = { ...turns[0], content: CONTEXT(p) + turns[0].content };
      const text = await ai.ask(turns, (t) => patch(id, { text: t }), abort.current.signal);
      patch(id, { busy: false, text });
      update(p.id, (x) => {
        x.ai.push({ role: 'user', content: q }, { role: 'assistant', content: text });
        x.ai = x.ai.slice(-20);
      });
    } catch (e) {
      patch(id, { busy: false, error: errText(e) });
    }
  };

  if (ai === undefined)
    return (
      <div className="ai-state" role="status">
        <Icon name="rotate" /> Conectando o assistente…
      </div>
    );

  if (ai === null)
    return (
      <div className="ai-off">
        <span className="ai-badge">
          <Icon name="sparkle" size={14} /> Assistente
        </span>
        <p>O assistente usa o Claude da sua conta e funciona quando o IDEÁRIO está aberto no claude.ai.</p>
        <p className="muted">Neste ambiente ele não está disponível. Todo o resto do sistema funciona normalmente.</p>
      </div>
    );

  const busy = results.some((r) => r.busy);

  return (
    <div className="ai">
      <div className="ai-actions">
        {actionsFor(view).map((a) => (
          <button key={a.label} className="ai-action" onClick={() => run(a)} disabled={busy}>
            <Icon name="wand" size={15} /> {a.label}
          </button>
        ))}
      </div>

      <div className="ai-feed" aria-live="polite">
        {!results.length && <p className="ai-hint">Peça uma avaliação, sugestões ou pergunte sobre o projeto. O assistente lê a ficha, a paleta e os módulos deste sketchbook.</p>}
        {results.map((r) => (
          <div key={r.id} className={'ai-card k-' + r.kind}>
            <span className="ai-card-label">{r.kind === 'chat' ? 'Você: ' + r.label : r.label}</span>
            {r.busy && !r.text && (
              <span className="ai-busy">
                <i />
                <i />
                <i /> pensando
              </span>
            )}
            {r.error && (
              <p className="ai-error">
                <Icon name="warn" size={14} /> {r.error}
              </p>
            )}
            {r.text && <div className="ai-text">{r.text}</div>}
            {r.items && (
              <ul className="ai-items">
                {r.items.map((it, i) => {
                  const key = r.id + i;
                  return (
                    <li key={i}>
                      <span>{it}</span>
                      {r.apply && (
                        <button
                          className={'btn btn-sm ' + (used.has(key) ? 'btn-ghost' : 'btn-sun')}
                          onClick={() => {
                            update(p.id, (x) => r.apply!.to(x, it));
                            setUsed((s) => new Set(s).add(key));
                          }}
                        >
                          {used.has(key) ? (
                            <>
                              <Icon name="check" size={13} /> Aplicado
                            </>
                          ) : (
                            r.apply.label
                          )}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {r.evalr && (
              <div className="ai-eval">
                <span className={'ai-level l-' + (r.evalr.nivel.startsWith('case') ? 'case' : r.evalr.nivel.startsWith('acima') ? 'mid' : 'basic')}>{r.evalr.nivel || 'sem nível'}</span>
                <p>{r.evalr.porque}</p>
                {r.evalr.proximos.length > 0 && (
                  <ol>
                    {r.evalr.proximos.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          chat();
        }}
      >
        <textarea
          id="ai-msg"
          rows={2}
          value={msg}
          placeholder="Pergunte sobre este projeto…"
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              chat();
            }
          }}
        />
        {busy ? (
          <button type="button" className="icon-btn ai-send" onClick={() => abort.current?.abort()} aria-label="Parar resposta">
            <Icon name="stop" />
          </button>
        ) : (
          <button className="icon-btn ai-send" disabled={!msg.trim()} aria-label="Enviar pergunta">
            <Icon name="send" />
          </button>
        )}
      </form>
    </div>
  );
}
