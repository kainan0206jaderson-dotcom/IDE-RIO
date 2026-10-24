# IDEÁRIO

Escritório de criação para montar brandbooks seguindo a **Receita do Brandbook**
(14 módulos em 4 atos, ficha de partida, arquitetura e checklist de saída).

## Rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/
```

## Estrutura

- `src/design/tokens.ts` — única fonte das cores (paleta oficial + tokens semânticos). Aplicadas em `:root` no boot.
- `src/data/recipe.ts` — a receita: atos, módulos, ficha, checklist, regras de arquitetura.
- `src/store/` — salvamento. No claude.ai usa a conta do usuário (db + assets); fora dele, localStorage + IndexedDB.
- `src/screens/Office.tsx` — tela inicial (escritório imersivo com a mesa e os sketchbooks).
- `src/screens/Workspace.tsx` + `src/screens/workspace/` — o ambiente de criação dentro do sketchbook.
- `src/lib/claude.ts` — assistente IA e downloads quando aberto no claude.ai.

Paleta da interface ≠ paleta do projeto: a capa e o módulo 07 usam as cores de cada marca.
