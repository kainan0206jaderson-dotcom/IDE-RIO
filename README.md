# IDEÁRIO

Escritório de criação para montar brandbooks seguindo a **Receita do Brandbook**
(14 módulos em 4 atos, ficha de partida, arquitetura e checklist de saída).

## Rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/
```

## Interface (v0.3)

- Abertura em primeira pessoa (three.js): a câmera passa pela porta do escritório e chega à mesa dos sketchbooks. Roda uma vez por sessão, tem “Pular” e respeita “reduzir movimento”.
- Escritório minimalista: os sketchbooks num carrossel 3D (arrastar, setas, roda do mouse).
- Folhear: o sketchbook abre em 3D, as páginas viram, e um toque abre a página escolhida para criar.
- Aba de criação como folha de sketchbook em papel quente, com escrita à mão: caneta (Caveat), lapiseira (Kalam) e lápis (Shadows Into Light). As páginas do brandbook mantêm as fontes da marca.
- Folha clara ou noturna (papel amarelado de livro). A troca acende a luminária: a luz nova se espalha a partir do interruptor.

## Importar material pronto

No escritório (botão “Importar material pronto”) ou dentro de um sketchbook (Estúdio, “Importar material pronto”), aceita qualquer arquivo:

- PDF e AI compatível com PDF, PSD, PNG, JPG, WebP, GIF, SVG, vídeo (MP4, WebM, MOV), fontes (TTF, OTF, WOFF), textos.
- PPTX: os slides são redesenhados com a composição original. DOCX, Keynote, Pages, Sketch, XD e ZIP: prévias e imagens internas, textos e fontes.
- Formatos que o navegador não abre ficam registrados com a orientação de como exportar.

Cada página recebe um diagnóstico pela receita (proporção 4:5, paleta, cor-dona, respiro, peso visual, contraste, resolução). A paleta pode virar a do projeto, cada página vai para um módulo, e a análise de direção visual com IA (no claude.ai) sugere ajustes e a distribuição nos módulos.

## Exportar

Em “Exportar e Canva”: pacote Canva (PPTX editável 1080 × 1350, PDF, PNGs, cores e fontes, com passo a passo), brandbook em PDF, PPTX, HTML e ZIPs de PNG, JPG, WebP ou SVG, página avulsa, capa do Behance 808 × 632, paletas (ASE, GPL, CSS, JSON, HEX, SVG) e textos (MD, TXT, CSV, JSON).

## Estrutura

- `src/design/tokens.ts` — única fonte das cores (paleta oficial + tokens semânticos). Aplicadas em `:root` no boot.
- `src/data/recipe.ts` — a receita: atos, módulos, ficha, checklist, regras de arquitetura.
- `src/store/` — salvamento. No claude.ai usa a conta do usuário (db + assets); fora dele, localStorage + IndexedDB.
- `src/screens/Office.tsx` — tela inicial (escritório imersivo com a mesa e os sketchbooks).
- `src/screens/Workspace.tsx` + `src/screens/workspace/` — o ambiente de criação dentro do sketchbook.
- `src/lib/claude.ts` — assistente IA e downloads quando aberto no claude.ai.

Paleta da interface ≠ paleta do projeto: a capa e o módulo 07 usam as cores de cada marca.
