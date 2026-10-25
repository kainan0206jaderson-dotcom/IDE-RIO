import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BUKKU',
  description: 'Estúdio de branding e design visual: escritório 3D, sketchbooks e estúdio de marca.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#24150F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Bricolage+Grotesque:wght@800&family=Caveat:wght@500;700&family=Reenie+Beanie&family=Gloock&family=Instrument+Sans:wght@700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
