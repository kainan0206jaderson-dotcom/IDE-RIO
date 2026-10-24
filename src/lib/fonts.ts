/** Famílias do Google Fonts oferecidas para os dois registros tipográficos do projeto (M06). */
export const RIGID_FONTS = ['Archivo Narrow', 'Oswald', 'Anton', 'Bebas Neue', 'Barlow Condensed', 'Big Shoulders Display', 'Roboto Condensed', 'Familjen Grotesk', 'Schibsted Grotesk', 'Archivo Black'];
export const LOOSE_FONTS = ['Playfair Display', 'Bodoni Moda', 'DM Serif Display', 'Instrument Serif', 'Fraunces', 'Gloock', 'Caveat', 'Permanent Marker', 'Rock Salt', 'Nanum Pen Script'];

const loaded = new Set<string>();

export function loadFont(family?: string) {
  if (!family || loaded.has(family)) return;
  loaded.add(family);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;700&display=swap`;
  l.onerror = () => {
    // famílias sem eixo 700: tenta o peso padrão
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`;
  };
  document.head.appendChild(l);
}

export const fontStack = (family: string | undefined, fallback: 'sans' | 'serif') =>
  family ? `'${family}', ${fallback === 'sans' ? 'system-ui, sans-serif' : 'Georgia, serif'}` : undefined;

/** Registra no navegador as fontes enviadas pelo usuário, para a tela e para as exportações. */
const registered = new Set<string>();
export async function registerFonts(fonts: { family: string; store: 'cloud' | 'local'; ref: string }[] = []) {
  const { assetUrl } = await import('../store/storage');
  await Promise.all(
    fonts.map(async (f) => {
      const key = f.family + f.ref;
      if (registered.has(key)) return;
      registered.add(key);
      try {
        const url = await assetUrl(f);
        if (!url) return;
        const face = new FontFace(f.family, `url(${url})`);
        await face.load();
        document.fonts.add(face);
      } catch {
        registered.delete(key);
      }
    }),
  );
}

/** Garante que uma família esteja carregada antes de desenhar em canvas. */
export async function ensureFont(family: string, weight = 400, italic = false) {
  try {
    await document.fonts.load(`${italic ? 'italic ' : ''}${weight} 40px "${family}"`);
  } catch {
    /* segue com a fonte de reserva */
  }
}

export const DEFAULT_RIGID = 'Archivo Narrow';
export const DEFAULT_LOOSE = 'Instrument Serif';
