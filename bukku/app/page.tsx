'use client';
import { useEffect } from 'react';
import markup from '@/bukku/markup.js';

// O escritório é um programa WebGL que toma conta da tela inteira: o React só
// entrega a marcação e liga o programa uma vez, depois de montar.
let started = false;

export default function Home() {
  useEffect(() => {
    if (started) return;
    started = true;
    import('@/bukku/app.js').then((m) => m.default());
  }, []);
  return <div id="bukku" dangerouslySetInnerHTML={{ __html: markup }} />;
}
