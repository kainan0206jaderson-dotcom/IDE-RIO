import { useState } from 'react';
import { MODULES, type ModuleId } from '../../data/recipe';
import type { Project } from '../../data/types';
import { Icon } from '../../components/Icon';
import { offerDownload } from '../../lib/claude';
import { SIZES, exportBehanceCover, exportBook, exportCanva, exportPage, exportPalette, exportText, sizeOf, type BookFormat, type Out, type SizeId } from '../../lib/export/exports';
import type { ViewId } from '../Workspace';

interface Item {
  id: string;
  label: string;
  ext: string;
  use: string;
  run: () => Promise<Out> | Out;
}

export function ExportView({ project: p, onGo }: { project: Project; onGo: (v: ViewId) => void }) {
  const [sizeId, setSizeId] = useState<SizeId>('behance');
  const [onlyFilled, setOnlyFilled] = useState(true);
  const [bands, setBands] = useState(true);
  const [page, setPage] = useState<ModuleId>('M01');
  const [busy, setBusy] = useState<string | null>(null);
  const [step, setStep] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sz = sizeOf(sizeId);
  const opts = { W: sz.w, H: sz.h, onlyFilled, bands };

  const go = async (id: string, label: string, run: () => Promise<Out> | Out) => {
    if (busy) return;
    setBusy(id);
    setMsg(null);
    setStep('Preparando');
    try {
      const out = await run();
      setStep('Salvando');
      const ok = await offerDownload(out.filename, out.data, 'text/plain');
      setMsg(ok ? { ok: true, text: `${label} pronto: ${out.filename}` } : { ok: false, text: 'O navegador bloqueou o download. Tente de novo.' });
    } catch (e: any) {
      console.error(e);
      const code = e?.code;
      setMsg({
        ok: false,
        text:
          code === 'declined'
            ? 'Download cancelado.'
            : code === 'too_large'
              ? 'O arquivo passou do limite de download. Use o tamanho Behance ou Instagram, ou marque “só módulos com conteúdo”.'
              : e?.message && !code
                ? e.message
                : 'Não foi possível gerar o arquivo agora. Tente de novo.',
      });
    } finally {
      setBusy(null);
      setStep('');
    }
  };

  const book = (f: BookFormat) => () => exportBook(p, f, opts, setStep);

  const bookItems: Item[] = [
    { id: 'pdf', label: 'PDF', ext: '.pdf', use: 'Apresentar, enviar ao cliente, imprimir', run: book('pdf') },
    { id: 'pptx', label: 'PowerPoint', ext: '.pptx', use: 'Editável no PowerPoint, Keynote, Google Slides e Canva', run: book('pptx') },
    { id: 'png', label: 'Páginas PNG', ext: '.zip', use: 'Upload no Behance, sem perda', run: book('png') },
    { id: 'jpg', label: 'Páginas JPG', ext: '.zip', use: 'Arquivos leves para redes e e-mail', run: book('jpg') },
    { id: 'webp', label: 'Páginas WebP', ext: '.zip', use: 'Sites e portfólios próprios', run: book('webp') },
    { id: 'svg', label: 'Páginas SVG', ext: '.zip', use: 'Figma, Illustrator, Inkscape, com texto editável', run: book('svg') },
    { id: 'html', label: 'Página web', ext: '.html', use: 'Um arquivo que abre em qualquer navegador', run: book('html') },
  ];

  const pageItems: Item[] = (['png', 'jpg', 'webp', 'svg'] as const).map((f) => ({
    id: 'page-' + f,
    label: f.toUpperCase(),
    ext: '.' + f,
    use: '',
    run: () => exportPage(p, page, f, sz.w, sz.h),
  }));

  const dataItems: Item[] = [
    { id: 'md', label: 'Roteiro em Markdown', ext: '.md', use: 'Notion, Obsidian, GitHub', run: () => exportText(p, 'md') },
    { id: 'txt', label: 'Roteiro em texto', ext: '.txt', use: 'Revisão de texto, Word, Google Docs', run: () => exportText(p, 'txt') },
    { id: 'csv', label: 'Planilha dos textos', ext: '.csv', use: 'Excel, Google Sheets, tradução', run: () => exportText(p, 'csv') },
    { id: 'json', label: 'Sketchbook completo', ext: '.json', use: 'Backup e reimportação no IDEÁRIO', run: () => exportText(p, 'json') },
  ];

  const paletteItems: Item[] = [
    { id: 'pal-p', label: 'Paleta do projeto', ext: '.zip', use: 'ASE (Adobe), GPL (Inkscape, GIMP), CSS, JSON, HEX, amostras SVG', run: () => exportPalette(p, 'project') },
    { id: 'pal-i', label: 'Paleta da interface IDEÁRIO', ext: '.zip', use: 'As cinco cores do sistema, nos mesmos formatos', run: () => exportPalette(p, 'interface') },
  ];

  const btn = (it: Item, variant = 'ghost') => (
    <button key={it.id} className={`exp-btn ${variant}${busy === it.id ? ' busy' : ''}`} onClick={() => go(it.id, it.label, it.run)} disabled={!!busy}>
      <Icon name={busy === it.id ? 'rotate' : 'download'} size={16} />
      <span className="exp-btn-text">
        <b>
          {it.label} <span className="mono">{it.ext}</span>
        </b>
        {it.use && <small>{it.use}</small>}
      </span>
    </button>
  );

  return (
    <div className="view exp-view">
      <header className="view-head">
        <span className="eyebrow">Saída</span>
        <h1 className="view-title">
          Exportar e levar ao <em>Canva</em>
        </h1>
        <p className="view-lede">Baixe o brandbook pronto para o Behance, para o Canva ou para qualquer programa. Tudo sai em 4:5, na ordem da receita, com as cores e fontes do projeto.</p>
      </header>

      <section className="exp-canva" aria-label="Pacote Canva">
        <div className="exp-canva-text">
          <span className="eyebrow">Para usar no Canva</span>
          <h2>Pacote Canva</h2>
          <p>Um ZIP com o brandbook em PPTX editável (cada módulo vira uma página 1080 × 1350 no Canva, com textos e formas soltos), o PDF fiel, os PNGs de cada página, os códigos das cores e as fontes. Dentro tem um passo a passo.</p>
        </div>
        <button className="btn btn-sun exp-canva-btn" onClick={() => go('canva', 'Pacote Canva', () => exportCanva(p, { onlyFilled, bands }, setStep))} disabled={!!busy}>
          <Icon name={busy === 'canva' ? 'rotate' : 'download'} size={18} /> {busy === 'canva' ? step || 'Gerando…' : 'Baixar pacote Canva'}
        </button>
      </section>

      <section className="exp-opts" aria-label="Opções">
        <div className="field">
          <span>Tamanho das páginas</span>
          <div className="exp-seg" role="radiogroup" aria-label="Tamanho das páginas">
            {SIZES.map((s) => (
              <button key={s.id} role="radio" aria-checked={sizeId === s.id} className={sizeId === s.id ? 'on' : ''} onClick={() => setSizeId(s.id)}>
                <b>{s.label}</b>
                <small className="mono">{s.note}</small>
              </button>
            ))}
          </div>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} />
          <span>Só módulos com conteúdo</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={bands} onChange={(e) => setBands(e.target.checked)} />
          <span>Faixas de abertura entre os atos</span>
        </label>
      </section>

      <p className="exp-status" role="status" aria-live="polite">
        {busy && busy !== 'canva' ? (
          <>
            <Icon name="rotate" size={14} /> {step || 'Gerando…'}
          </>
        ) : msg ? (
          <span className={msg.ok ? 'ok' : 'err'}>
            <Icon name={msg.ok ? 'check' : 'warn'} size={14} stroke={msg.ok ? 3 : 2} /> {msg.text}
          </span>
        ) : null}
      </p>

      <section className="exp-group">
        <h2 className="exp-h">Brandbook inteiro</h2>
        <div className="exp-grid">
          {bookItems.map((it, i) => (
            btn(it, i === 0 ? 'primary' : 'ghost')
          ))}
        </div>
      </section>

      <section className="exp-group">
        <h2 className="exp-h">Uma página</h2>
        <div className="exp-page">
          <label className="field">
            <span>Módulo</span>
            <select id="exp-page" value={page} onChange={(e) => setPage(e.target.value as ModuleId)}>
              {MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.n} · {m.title}
                </option>
              ))}
            </select>
          </label>
          <div className="exp-row">
            {pageItems.map((it) => btn(it))}
            {btn({ id: 'cover', label: 'Capa do Behance', ext: '808 × 632 .png', use: 'Recorte do módulo 01', run: () => exportBehanceCover(p) })}
          </div>
        </div>
      </section>

      <section className="exp-group">
        <h2 className="exp-h">Cores</h2>
        <div className="exp-grid">
          {paletteItems.map((it) => btn(it))}
        </div>
      </section>

      <section className="exp-group">
        <h2 className="exp-h">Textos e dados</h2>
        <div className="exp-grid">
          {dataItems.map((it) => btn(it))}
        </div>
      </section>

      <p className="imp-hint">
        Antes de publicar, confira o{' '}
        <button className="link-btn" onClick={() => onGo('checklist')}>
          checklist de saída
        </button>{' '}
        e o ritmo na{' '}
        <button className="link-btn" onClick={() => onGo('preview')}>
          prévia
        </button>
        .
      </p>
    </div>
  );
}
