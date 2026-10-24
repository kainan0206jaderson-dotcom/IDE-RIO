import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Troca bytes de controle crus (dentro de strings e regex das libs) por escapes \xNN, para hospedagens que recusam esses bytes. */
const escapeControlBytes = () => ({
  name: 'escape-control-bytes',
  writeBundle(opts: { dir?: string }) {
    const dir = join(opts.dir ?? 'dist', 'assets');
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
      const p = join(dir, f);
      const src = readFileSync(p, 'utf8');
      const out = src.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, (c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'));
      if (out !== src) writeFileSync(p, out);
    }
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), escapeControlBytes()],
  build: {
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    // o worker do pdf.js sai como .js para ser servido com o tipo certo em qualquer hospedagem
    rollupOptions: { output: { assetFileNames: (a) => (a.name?.endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]') } },
  },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  worker: { format: 'es' },
});
