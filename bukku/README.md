# BUKKU

Estúdio de branding e design visual para designers e diretores de arte: um escritório 3D
com sketchbooks, cavalete e quadros, uma abertura em papel amassado e um estúdio de marca
que gera o kit de identidade, o brand book em PDF e o kit em ZIP.

Assinatura: "Rabisque sem medo."

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # site estático em out/
npm run artifact   # versão de página única em artifact/, para publicar no claude.ai
```

No GitHub Pages o site fica em `/IDE-RIO/bukku/` (o workflow passa `BASE_PATH`).
No claude.ai a mesma página usa a IA do Claude para gerar a marca, guarda os projetos na
nuvem e salva os arquivos; fora dele a marca é gerada pelo gerador local, os projetos ficam
no navegador e os arquivos baixam direto.

## Organização

| pasta | o que tem |
| --- | --- |
| `app/` | página Next.js e o CSS |
| `src/bukku/app.js` | escritório 3D, abertura, ateliê de pintura, telas e fluxo do estúdio |
| `src/bukku/brand/mark.js` | lettering recortado e símbolo (mão com lápis) do BUKKU |
| `src/bukku/studio/brand.js` | gerador local de marca, normalização da resposta da IA e o prompt |
| `src/bukku/studio/panels.js` | páginas do kit: capa, logo, paleta, tipografia, voz, foto |
| `src/bukku/studio/mockups.js` | aplicações em ambiente: camiseta, sacola, embalagem, papelaria, fachada, post |
| `src/bukku/studio/*.js` | cores, fontes e SVG |
| `src/bukku/lib/` | utilitários e armazenamento |
| `prototipo/` | o protótipo original, de arquivo único, como referência |
