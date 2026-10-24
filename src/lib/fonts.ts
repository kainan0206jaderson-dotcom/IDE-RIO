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
