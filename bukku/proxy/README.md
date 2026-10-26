# Ponte do BUKKU

Um Cloudflare Worker gratuito que deixa qualquer pessoa usar o BUKKU sem login,
gastando o Pollen da conta do dono. A chave secreta fica só no Worker.

## Publicar (pelo painel, sem instalar nada)

1. Em enter.pollinations.ai > Keys, crie uma chave **Secret** (`sk_`). Não compartilhe.
2. Em dash.cloudflare.com, crie uma conta gratuita e vá em **Workers & Pages > Create > Worker**.
   Dê o nome `bukku-ponte` e clique em **Deploy**.
3. Clique em **Edit code**, apague o que estiver lá, cole o conteúdo de `worker.js` e clique em **Deploy**.
4. Em **Settings > Variables and Secrets**, adicione:
   - `POLLEN_KEY` (tipo Secret): a chave `sk_`
   - `ORIGINS` (tipo Text): `https://kainan0206jaderson-dotcom.github.io`
   - `DAILY` (tipo Text, opcional): pedidos por visitante por dia, padrão 60
5. Copie o endereço do Worker (algo como `https://bukku-ponte.SEU-NOME.workers.dev`)
   e coloque em `PROXY`, no topo de `src/bukku/studio/ai.js`.

Opcional: crie um KV namespace e ligue ao Worker com o nome `LIMITS`, para o
limite diário valer em todos os servidores da Cloudflare.

## Quanto custa

O plano gratuito da Cloudflare cobre 100 mil pedidos por dia. O que acaba primeiro
é o Pollen da conta: cada marca gasta cerca de 1 pedido de texto, 5 fotos e
4 pranchas (contadas como 3 cada), ou seja, uns 18 pontos do limite diário de um
visitante. Com o limite padrão de 60, cada pessoa faz umas 3 marcas completas por
dia. Quando o limite dela acaba, o BUKKU volta sozinho para a IA gratuita sem chave.
