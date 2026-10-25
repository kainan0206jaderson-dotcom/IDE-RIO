// Monta uma versão de página única do BUKKU para publicar como Artifact no claude.ai,
// onde a IA (sample), o armazenamento (db/assets) e os downloads do Claude funcionam.
// Usa os mesmos módulos do site Next.js: só muda o empacotamento.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';

const out = 'artifact';
rmSync(out, { recursive: true, force: true });
mkdirSync(out + '/assets', { recursive: true });

const entry = `
import markup from './src/bukku/markup.js';
import start from './src/bukku/app.js';
document.getElementById('bukku').innerHTML = markup;
start();
`;
await build({
  stdin: { contents: entry, resolveDir: '.', loader: 'js' },
  bundle: true,
  format: 'esm',
  splitting: false,
  minify: true,
  target: 'es2022',
  outfile: out + '/assets/bukku.js',
  loader: { '.jpg': 'file' },
  assetNames: '[name]-[hash]',
  publicPath: 'assets',
  // ASCII: o host do Artifact recusa bytes de controle e o caractere U+FFFD crus no JS
  charset: 'ascii',
  legalComments: 'none',
  logLevel: 'warning',
});
// jpg importado vira { src } no Next; aqui o esbuild entrega a URL direto
let js = readFileSync(out + '/assets/bukku.js', 'utf8');
js = js.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, (c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'));
writeFileSync(out + '/assets/bukku.js', js);
writeFileSync(out + '/assets/bukku.css', readFileSync('app/globals.css', 'utf8'));

const fonts = 'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Bricolage+Grotesque:wght@800&family=Caveat:wght@500;700&family=Reenie+Beanie&family=Gloock&family=Instrument+Sans:wght@700&display=swap';
writeFileSync(out + '/index.html', `<title>BUKKU</title>
<meta name="theme-color" content="#24150F">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<link rel="stylesheet" href="assets/bukku.css">
<div id="bukku"></div>
<script type="module" src="assets/bukku.js"></script>
`);
console.log(readdirSync(out + '/assets').join('\n'));
