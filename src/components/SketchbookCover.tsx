import type { CSSProperties } from 'react';
import type { Project, Sticker } from '../data/types';
import { AssetImage } from './AssetImage';

/** Padrões desenhados em CSS, usando a cor escolhida para a capa do projeto. */
export function patternStyle(pattern: string, c: string): CSSProperties {
  switch (pattern) {
    case 'dots':
      return { backgroundImage: `radial-gradient(${c} 1.6px, transparent 1.8px)`, backgroundSize: '14px 14px' };
    case 'grid':
      return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: '16px 16px' };
    case 'lines':
      return { backgroundImage: `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px 12px)` };
    case 'diagonal':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0 6px, transparent 6px 14px)` };
    case 'checker':
      return { backgroundImage: `conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0)`, backgroundSize: '22px 22px' };
    case 'waves':
      return {
        backgroundImage: `radial-gradient(circle at 50% 0, transparent 9px, ${c} 9.5px 11px, transparent 11.5px)`,
        backgroundSize: '22px 12px',
      };
    default:
      return {};
  }
}

export function StickerView({ s, project }: { s: Sticker; project: Project }) {
  const base: CSSProperties = {
    left: s.x + '%',
    top: s.y + '%',
    width: s.size + '%',
    transform: `translate(-50%, -50%) rotate(${s.rotate}deg)`,
  };
  if (s.kind === 'image') {
    const a = project.assets.find((x) => x.id === s.value);
    return <AssetImage asset={a} className="sticker sticker-img" style={base} alt="" draggable={false} />;
  }
  if (s.kind === 'text')
    return (
      <span className="sticker sticker-text" style={{ ...base, color: s.color, fontSize: `calc(${s.size} * var(--cover-unit) * .22)` }}>
        {s.value}
      </span>
    );
  return (
    <svg className="sticker" style={base} viewBox="0 0 100 100" aria-hidden="true">
      <path fill={s.color} d={SHAPES[s.value] ?? SHAPES.circle} />
    </svg>
  );
}

export const SHAPES: Record<string, string> = {
  circle: 'M50 4a46 46 0 1 1 0 92a46 46 0 1 1 0-92z',
  square: 'M8 8h84v84H8z',
  star: 'M50 3l13 32 35 3-27 22 9 35-30-19-30 19 9-35L2 38l35-3z',
  blob: 'M74 14c16 10 24 32 18 52s-28 32-48 30S6 80 5 58 16 18 34 10s24-6 40 4z',
  asterisk: 'M44 2h12v35l30-17 6 10-30 18 30 18-6 10-30-17v35H44V59L14 76 8 66l30-18L8 30l6-10 30 17z',
  arrow: 'M4 42h60V18l32 32-32 32V58H4z',
  flower: 'M50 30a14 14 0 1 1 0-26 14 14 0 0 1 0 26zm0 66a14 14 0 1 1 0-26 14 14 0 0 1 0 26zM30 50a14 14 0 1 1-26 0 14 14 0 0 1 26 0zm66 0a14 14 0 1 1-26 0 14 14 0 0 1 26 0zM50 64a14 14 0 1 0 0-28 14 14 0 0 0 0 28z',
};

/**
 * A capa do sketchbook. Usada na mesa do escritório, na prateleira e no editor de capa.
 * Toda a aparência vem do projeto: a paleta da interface não é aplicada aqui.
 */
export function SketchbookCover({ project, className, children }: { project: Project; className?: string; children?: React.ReactNode }) {
  const c = project.cover;
  const coverImg = c.imageAssetId ? project.assets.find((a) => a.id === c.imageAssetId) : undefined;
  return (
    <div className={'sb ' + (className ?? '')} style={{ '--sb-bg': c.bg, '--sb-band': c.band } as CSSProperties}>
      <div className="sb-pages" aria-hidden="true" />
      <div className="sb-cover">
        {coverImg && <AssetImage asset={coverImg} className="sb-photo" alt="" draggable={false} />}
        <div className="sb-pattern" style={patternStyle(c.pattern, c.patternColor)} />
        <div className={'sb-texture tx-' + c.texture} />
        {c.stickers.map((s) => (
          <StickerView key={s.id} s={s} project={project} />
        ))}
        <div className={'sb-title f-' + c.titleFont} style={{ color: c.titleColor }}>
          <span className="sb-title-main">{project.title}</span>
          {project.client && <span className="sb-title-sub">{project.client}</span>}
        </div>
        <div className="sb-spine" aria-hidden="true" />
        {children}
      </div>
      <div className="sb-band" aria-hidden="true" />
    </div>
  );
}
