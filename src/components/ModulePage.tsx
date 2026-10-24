import { useEffect, type CSSProperties } from 'react';
import { MODULE_BY_ID, type ModuleId } from '../data/recipe';
import type { Project } from '../data/types';
import { AssetImage } from './AssetImage';
import { fontStack, loadFont } from '../lib/fonts';
import { hexToRgb, readableOn } from '../lib/util';

/**
 * Composição 4:5 de um módulo, montada a partir do conteúdo dos slots.
 * É a página que vai para a apresentação; usa a paleta e as fontes do projeto.
 */
export function ModulePage({ project: p, id, small, crop }: { project: Project; id: ModuleId; small?: boolean; crop?: boolean }) {
  const m = MODULE_BY_ID[id];
  const st = p.modules[id];
  const imgs = st.slots.flatMap((s) => s.assetIds).map((a) => p.assets.find((x) => x.id === a)).filter(Boolean);
  const texts = st.slots.map((s) => s.text.trim()).filter(Boolean);
  const dona = p.palette[0]?.hex;
  const rigid = p.modules.M06.extra.rigid;
  const loose = p.modules.M06.extra.loose;
  useEffect(() => {
    loadFont(rigid);
    loadFont(loose);
  }, [rigid, loose]);

  const style = {
    '--pg-bg': id === 'M01' && dona ? dona : 'var(--c-paper)',
    '--pg-fg': id === 'M01' && dona ? readableOn(dona) : 'var(--c-dark)',
    '--pg-rigid': fontStack(rigid, 'sans') ?? 'var(--font-display)',
    '--pg-loose': fontStack(loose, 'serif') ?? 'var(--font-serif)',
  } as CSSProperties;

  const empty = !imgs.length && !texts.length && !(id === 'M07' && p.palette.length) && !(id === 'M14' && Object.values(st.extra).some(Boolean)) && !(id === 'M06' && (rigid || loose));

  return (
    <div className={'page r-' + st.rhythm + (small ? ' small' : '') + (empty ? ' is-empty' : '')} style={style}>
      <span className="page-tag">
        {m.n} · {m.short}
      </span>

      {empty ? (
        <div className="page-empty">
          <span className="page-empty-n">{m.n}</span>
          <span>{m.objective}</span>
        </div>
      ) : id === 'M07' && p.palette.length ? (
        <div className="page-palette">
          {p.palette.map((c, i) => {
            const rgb = hexToRgb(c.hex);
            return (
              <div key={c.id} className="pp-block" style={{ flexGrow: Math.max(c.share, 4), background: c.hex, color: readableOn(c.hex) }}>
                <span className="pp-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="pp-name">{c.name}</span>
                <span className="pp-codes">
                  {c.pms && <>PMS {c.pms} · </>}
                  {c.hex.toUpperCase()} {rgb && `· RGB ${rgb.join(' ')}`} · {c.share}%
                </span>
              </div>
            );
          })}
        </div>
      ) : id === 'M06' && (rigid || loose) ? (
        <div className="page-type">
          <div className="pt-row">
            <span className="pt-aa" style={{ fontFamily: 'var(--pg-rigid)' }}>
              Aa
            </span>
            <span className="pt-meta">Rígido · {rigid || 'a definir'}</span>
          </div>
          <div className="pt-row">
            <span className="pt-aa loose" style={{ fontFamily: 'var(--pg-loose)' }}>
              Aa
            </span>
            <span className="pt-meta">Solto · {loose || 'a definir'}</span>
          </div>
          {st.extra.rule && <p className="pt-rule">{st.extra.rule}</p>}
        </div>
      ) : id === 'M14' ? (
        <div className="page-close">
          <span className="pc-cta">{st.extra.cta || 'Vamos conversar?'}</span>
          {st.extra.email && <span className="pc-mail">{st.extra.email}</span>}
          {st.extra.price && <span className="pc-price">{st.extra.price}</span>}
          {st.extra.credits && (
            <ul className="pc-credits">
              {st.extra.credits.split('\n').filter(Boolean).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
          <span className="pc-sign">{p.title}</span>
        </div>
      ) : (
        <div className={'page-comp n' + Math.min(imgs.length, 4)}>
          {imgs.length > 0 && (
            <div className="page-imgs">
              {imgs.slice(0, 4).map((a) => (
                <AssetImage key={a!.id} asset={a} alt="" />
              ))}
            </div>
          )}
          {texts.length > 0 && (
            <div className="page-texts">
              <span className={'page-head' + (id === 'M02' || id === 'M09' ? ' big' : '')}>{texts[0]}</span>
              {texts.slice(1, 4).map((t, i) => (
                <span key={i} className="page-line">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {id === 'M01' && crop && !small && <span className="page-crop" aria-hidden="true" />}
    </div>
  );
}
